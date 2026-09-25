// app/superadmin/sites/actions.ts
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// 1. READ: Fetch all available sites
export async function getSitesAction() {
  const supabaseAdmin = createAdminClient()
  const { data, error } = await supabaseAdmin
    .from('sites')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error("Error fetching sites:", error.message)
    return []
  }
  return data
}

// 2. CREATE: Add a new site location
export async function createSiteAction(formData: FormData) {
  const name = formData.get('siteName') as string
  if (!name) return

  const supabaseAdmin = createAdminClient()
  const { error } = await supabaseAdmin
    .from('sites')
    .insert([{ name }])

  if (error) {
    console.error("Error creating site:", error.message)
    return
  }

  revalidatePath('/superadmin/sites')
  revalidatePath('/superadmin/users') // Refresh creation dropdown lists too
}

// 3. DELETE: Remove a site location
export async function deleteSiteAction(formData: FormData) {
  const siteId = formData.get('siteId') as string
  if (!siteId) return

  const supabaseAdmin = createAdminClient()
  const { error } = await supabaseAdmin
    .from('sites')
    .delete()
    .eq('id', siteId)

  if (error) {
    console.error("Error deleting site:", error.message)
    return
  }

  revalidatePath('/superadmin/sites')
  revalidatePath('/superadmin/users')
}
