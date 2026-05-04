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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { email, password, full_name, role, area_ids, use_invite } = await req.json()

    let userId: string

    if (use_invite) {
      // ── Invite flow: Supabase sends the user an email with a magic link
      //    to set their own password. No password needed from the admin.
      const { data, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: { full_name, role },
        redirectTo: `${Deno.env.get('SITE_URL') || 'https://dresio.vercel.app'}/dashboard`,
      })
      if (inviteError) throw inviteError
      userId = data.user.id
    } else {
      // ── Direct create flow: admin sets the password immediately
      const { data, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (authError) throw authError
      userId = data.user.id
    }

    // Create the profile record (same for both flows)
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        full_name,
        role,
        email,
        invited_at: use_invite ? new Date().toISOString() : null,
      })

    if (profileError) throw profileError

    if (area_ids?.length > 0) {
      await supabase.from('user_areas').insert(
        area_ids.map((area_id: string) => ({ user_id: userId, area_id }))
      )
    }

    return new Response(
      JSON.stringify({ user_id: userId, invited: !!use_invite }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
