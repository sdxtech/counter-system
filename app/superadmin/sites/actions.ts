// app/superadmin/sites/actions.ts
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireUserRole } from '@/lib/auth/guards'
import type { Database } from '@/lib/supabase/database.types'
import { SITE_BACKGROUND_BUCKET, validateSiteBackground } from '@/lib/site-background'

// 1. READ: Fetch all available sites
export async function getSitesAction() {
  await requireUserRole(['superadmin'])
  const supabaseAdmin = createAdminClient()
  const { data, error } = await supabaseAdmin
    .from('sites')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error("Error fetching sites:", error.message)
    return []
  }
  return (data as Database['public']['Tables']['sites']['Row'][]).map((site) => ({
    ...site,
    backgroundUrl: site.background_path
      ? supabaseAdmin.storage.from(SITE_BACKGROUND_BUCKET).getPublicUrl(site.background_path).data.publicUrl
      : null,
  }))
}

// 2. CREATE: Add a new site location
export async function createSiteAction(formData: FormData) {
  await requireUserRole(['superadmin'])
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
  await requireUserRole(['superadmin'])
  const siteId = formData.get('siteId') as string
  if (!siteId) return

  const supabaseAdmin = createAdminClient()
  const { data: site } = await supabaseAdmin.from('sites').select('*').eq('id', siteId).maybeSingle()
  const { error } = await supabaseAdmin
    .from('sites')
    .delete()
    .eq('id', siteId)

  if (error) {
    console.error("Error deleting site:", error.message)
    return
  }

  if (site?.background_path) {
    const { error: cleanupError } = await supabaseAdmin.storage.from(SITE_BACKGROUND_BUCKET).remove([site.background_path])
    if (cleanupError) console.error('Failed to remove deleted site background:', cleanupError.message)
  }

  revalidatePath('/superadmin/sites')
  revalidatePath('/superadmin/users')
}

export type BackgroundActionResult = { success: boolean; message: string };

export async function saveSiteBackgroundAction(formData: FormData): Promise<BackgroundActionResult> {
  await requireUserRole(['superadmin'])
  const siteId = formData.get('siteId')
  const reset = formData.get('reset') === 'true'
  if (typeof siteId !== 'string' || !siteId) {
    return { success: false, message: 'Site tidak valid.' }
  }

  const supabase = createAdminClient()
  const { data: site, error: siteError } = await supabase.from('sites')
    .select('id, background_path').eq('id', siteId).maybeSingle()
  if (siteError || !site) {
    console.error('Failed to load background settings:', siteError?.message)
    return { success: false, message: 'Pengaturan background belum tersedia atau site tidak ditemukan.' }
  }

  let newPath: string | null = null
  if (!reset) {
    const file = formData.get('background')
    if (!(file instanceof File)) return { success: false, message: 'Pilih file JPG terlebih dahulu.' }
    const validationError = await validateSiteBackground(file)
    if (validationError) return { success: false, message: validationError }
    newPath = `${encodeURIComponent(siteId)}/${crypto.randomUUID()}.jpg`
    const { error } = await supabase.storage.from(SITE_BACKGROUND_BUCKET)
      .upload(newPath, await file.arrayBuffer(), { contentType: 'image/jpeg', upsert: false })
    if (error) {
      console.error('Failed to upload site background:', error.message)
      return { success: false, message: 'Upload background gagal. Silakan coba lagi.' }
    }
  }

  // Compare the previous path so simultaneous edits cannot orphan a new upload.
  const update = supabase.from('sites').update({ background_path: newPath }).eq('id', siteId)
  const { data: updated, error: updateError } = await (site.background_path
    ? update.eq('background_path', site.background_path)
    : update.is('background_path', null)).select('id').maybeSingle()
  if (updateError || !updated) {
    if (newPath) await supabase.storage.from(SITE_BACKGROUND_BUCKET).remove([newPath])
    console.error('Failed to save site background:', updateError?.message)
    return { success: false, message: 'Background gagal disimpan atau baru diubah admin lain. Muat ulang dan coba lagi.' }
  }

  let cleanupFailed = false
  if (site.background_path) {
    const { error } = await supabase.storage.from(SITE_BACKGROUND_BUCKET).remove([site.background_path])
    cleanupFailed = Boolean(error)
    if (error) console.error('Failed to remove previous site background:', error.message)
  }
  revalidatePath('/superadmin/sites')
  revalidatePath('/staff')
  return {
    success: true,
    message: (reset ? 'Background dikembalikan ke default.' : 'Background site berhasil disimpan.') +
      (cleanupFailed ? ' File lama belum berhasil dibersihkan.' : ''),
  }
}
