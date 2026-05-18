import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Client admin — SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont injectés
    // automatiquement par Supabase, aucune config manuelle nécessaire
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Vérifier que l'appelant est bien authentifié
    const { data: { user }, error: authErr } = await admin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Vérifier que l'appelant est manager
    const { data: caller } = await admin
      .from('profiles')
      .select('role, structure_id')
      .eq('id', user.id)
      .single()

    if (caller?.role !== 'manager') {
      return new Response(JSON.stringify({ error: 'Accès refusé — manager uniquement' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email, full_name, poste, redirect_to } = await req.json()
    if (!email || !full_name) {
      return new Response(JSON.stringify({ error: 'Email et nom requis' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Inviter l'utilisateur — envoie un vrai email d'invitation Supabase
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirect_to,
      data: { full_name, role: 'vendeur' },
    })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Mettre à jour le profil créé par le trigger avec les infos de la structure
    if (data?.user) {
      await admin.from('profiles').update({
        structure_id: caller.structure_id,
        full_name,
        role: 'vendeur',
        poste: poste || 'Commercial',
      }).eq('id', data.user.id)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
