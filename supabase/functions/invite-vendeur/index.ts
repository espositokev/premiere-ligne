import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const { email, full_name, poste, structure_id, redirect_to } = await req.json()

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: redirect_to,
    data: { full_name, role: 'vendeur' },
  })

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })

  if (data.user) {
    await admin.from('profiles').update({ structure_id, full_name, role: 'vendeur', poste: poste || 'Commercial' }).eq('id', data.user.id)
  }

  return new Response(JSON.stringify({ success: true }), { headers: { ...cors, 'Content-Type': 'application/json' } })
})
