const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

router.post('/create', async (req, res) => {
  const { email, password, full_name, role, area_ids } = req.body

  try {
    // Create auth user
    const { data, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) return res.status(400).json({ error: authError.message })

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: data.user.id, full_name, role })

    if (profileError) return res.status(400).json({ error: profileError.message })

    // Assign areas
    if (area_ids?.length > 0) {
      await supabase.from('user_areas').insert(
        area_ids.map(area_id => ({ user_id: data.user.id, area_id }))
      )
    }

    res.json({ user: data.user })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  const { id } = req.params
  console.log('deleting user:', id)

  try {
    // Delete user_areas first
    await supabase.from('user_areas').delete().eq('user_id', id)
    
    // Delete profile
    await supabase.from('profiles').delete().eq('id', id)

    // Now delete auth user
    const { error } = await supabase.auth.admin.deleteUser(id)
    console.log('delete error:', error)
    if (error) return res.status(400).json({ error: error.message })

    res.json({ success: true })
  } catch (err) {
    console.log('delete error:', err)
    res.status(500).json({ error: err.message })
  }
})
module.exports = router