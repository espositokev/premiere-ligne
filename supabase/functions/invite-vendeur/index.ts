import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Authorization header manquant' }, 401)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Vérifier le JWT de l'appelant
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await admin.auth.getUser(token)
    if (authErr || !user) {
      return json({ error: 'JWT invalide', detail: authErr?.message }, 401)
    }

    // Lire le profil de l'appelant (service_role bypasse RLS)
    const { data: caller, error: callerErr } = await admin
      .from('profiles')
      .select('role, structure_id')
      .eq('id', user.id)
      .single()

    if (callerErr) return json({ error: 'Profil introuvable', detail: callerErr.message }, 403)
    if (!caller) return json({ error: 'Profil null' }, 403)
    if (caller.role !== 'manager') return json({ error: `Rôle refusé : ${caller.role}` }, 403)

    const { email, full_name, poste, redirect_to } = await req.json()
    if (!email || !full_name) return json({ error: 'email et full_name requis' }, 400)

    // Inviter — envoie l'email Supabase avec lien vers /invitation
    const { data, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirect_to,
      data: { full_name, role: 'vendeur' },
    })

    if (inviteErr) return json({ error: inviteErr.message }, 400)

    // Mettre à jour le profil créé par le trigger
    if (data?.user) {
      const { error: updateErr } = await admin.from('profiles').update({
        structure_id: caller.structure_id,
        full_name,
        role: 'vendeur',
        poste: poste || 'Commercial',
      }).eq('id', data.user.id)

      if (updateErr) console.error('profiles update error', updateErr)
    }

    return json({ success: true })
  } catch (err) {
    return json({ error: 'Exception', detail: err.message }, 500)
  }
})
