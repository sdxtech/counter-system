// app/superadmin/sites/actions.ts
'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 1. READ: Fetch all available sites
export async function getSitesAction() {
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

// TEMPORARY DEVELOPER TOOL: Add to the bottom of app/superadmin/sites/actions.ts

export async function seedExampleSitesDev() {
  // 1. Check if there are already any sites in the database
  const { data: existingSites, error: checkError } = await supabaseAdmin
    .from('sites')
    .select('id')
    
  if (checkError) {
    console.error("Error checking sites table:", checkError.message);
    return;
  }

  // 2. If the table is completely empty, insert sample locations automatically
  if (!existingSites || existingSites.length === 0) {
    console.log("Sites table is empty. Injecting starter locations...");
    
    const sampleSites = [
      { name: "IDAME-CGK (Jakarta Headquarters)" },
      { name: "IDAME-SUB (Surabaya Hub)" },
      { name: "IDAME-DPS (Bali Branch)" }
    ];

    const { error: insertError } = await supabaseAdmin
      .from('sites')
      .insert(sampleSites);

    if (insertError) {
      console.error("Failed to seed sample sites:", insertError.message);
    } else {
      console.log("SUCCESS: Initialized sample operational sites successfully!");
    }
  }
}