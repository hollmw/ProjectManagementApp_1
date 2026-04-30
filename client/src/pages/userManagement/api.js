import { supabase } from '../../supabase'

const FUNCTIONS_URL = 'https://zrmqhkydlxkfbydnhngb.supabase.co/functions/v1'

export async function fetchAllUsers() {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*, user_areas(area_id, areas(name, color))')
    .order('created_at', { ascending: false })

  // Email lookup against profiles (legacy compatibility with the original code).
  const { data: authUsers } = await supabase
    .from('profiles')
    .select('id, email')

  return (profiles || []).map(p => ({
    ...p,
    email: p.email || authUsers?.find(u => u.id === p.id)?.email,
  }))
}

export async function fetchAllAreas() {
  const { data } = await supabase.from('areas').select('*')
  return data || []
}

export async function deleteUser(userId) {
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch(`${FUNCTIONS_URL}/delete-user/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${session?.access_token}` },
  })
  return response.json()
}

// Edit existing profile (name + role + areas).
export async function updateUser(userId, { fullName, role, areaIds }) {
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName, role })
    .eq('id', userId)
  if (error) return { error: error.message }

  await supabase.from('user_areas').delete().eq('user_id', userId)
  if (areaIds.length > 0) {
    await supabase.from('user_areas').insert(
      areaIds.map(area_id => ({ user_id: userId, area_id })),
    )
  }
  return {}
}

export async function createUser({ email, password, fullName, role, areaIds }) {
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch(`${FUNCTIONS_URL}/create-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({
      email, password,
      full_name: fullName,
      role,
      area_ids: areaIds,
    }),
  })
  return response.json()
}

export async function fetchUserAreas(userId) {
  const { data } = await supabase
    .from('user_areas')
    .select('area_id')
    .eq('user_id', userId)
  return data?.map(d => d.area_id) || []
}
