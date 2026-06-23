// app/superadmin/users/actions.ts
'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function createUserAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const role = formData.get('role') as string
  const siteId = formData.get('siteId') as string

  if (!email || !password) return

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: { role, siteId } 
  })

  if (authError || !authData.user) return

  await supabaseAdmin
    .from('profiles')
    .update({ role: role, site_id: siteId || null })
    .eq('id', authData.user.id)

  revalidatePath('/superadmin/users')
}

export async function getUsersAction() {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers()
  return error ? [] : data.users
}

export async function deleteUserAction(formData: FormData) {
  const userId = formData.get('userId') as string
  if (!userId) return
  await supabaseAdmin.auth.admin.deleteUser(userId)
  revalidatePath('/superadmin/users')
}

// UNIFIED EDIT ACTION: Updates both fields or singular attributes perfectly
export async function updateUserFieldsAction(userId: string, targetRole: string, targetSiteId: string) {
  if (!userId) return

  // 1. Update Auth system metadata snapshots
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: { role: targetRole, siteId: targetSiteId }
  })

  // 2. Sync to public profiles relational tables
  await supabaseAdmin
    .from('profiles')
    .update({ role: targetRole, site_id: targetSiteId || null })
    .eq('id', userId)

  revalidatePath('/superadmin/users')
}

// Backwards compatibility wrapper for old role dropdown triggers
export async function updateUserRoleAction(userId: string, newRole: string) {
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId)
  const currentSiteId = data?.user?.user_metadata?.siteId || ''
  await updateUserFieldsAction(userId, newRole, currentSiteId)
}