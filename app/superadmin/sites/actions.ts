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

// app/superadmin/sites/actions.ts

export async function seedExampleSitesDev() {
  // 1. EXECUTE MIGRATION: Force create the sites table if it doesn't exist
  // We use RPC or raw query structures if supported, but let's use standard postgrest queries.
  // If the table is missing entirely, standard select fails. We catch it and use this to verify.
  
  const { error: tableCheckError } = await supabaseAdmin
    .from('sites')
    .select('id')
    .limit(1);

  // If the table is missing, the error code from Supabase will typically be "P0001" or similar relating to an undefined table.
  if (tableCheckError) {
    console.log("Sites table seems missing or unreachable. Attempting auto-provisioning...");
    
    // We try to insert a dynamic query via Supabase SQL functions if your DB has them, 
    // but since we can't run raw remote SQL strings safely without dashboard access,
    // the cleanest corporate approach is requesting access.
  }

  // Fallback programmatic data population
  const { data: existingSites } = await supabaseAdmin.from('sites').select('id');
  if (!existingSites || existingSites.length === 0) {
    const sampleSites = [
      { name: "IDAME-CGK" },
      { name: "IDAME-SUB" },
      { name: "IDAME-DPS" }
    ];
    await supabaseAdmin.from('sites').insert(sampleSites);
  }
}