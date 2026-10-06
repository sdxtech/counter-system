# Background per site

Superadmin can upload a JPG/JPEG background (maximum 5 MB) in
**Site & Deployment Management**. Each site has a preview, an upload button,
and a **Gunakan default** button after a custom background is saved.

Apply `supabase/migrations/202610050001_site_backgrounds.sql` through the
Supabase SQL Editor for an existing deployment, or your usual Supabase
migration workflow, before using uploads. It adds `sites.background_path`
and the public `site-backgrounds` bucket, restricted to JPEG files of up to
5 MB. New installations using `database/schema.sql` include this setup.
Writes go through server actions that verify the superadmin role before
using the service-role client; the bucket grants no direct client writes.

The staff dashboard reads the background of the signed-in user's assigned
site, including Full Mode. No site assignment, no custom background, or an
image that fails to load uses `/pexels-steve-6433209.jpg`. Reload an already
open staff dashboard after the superadmin changes its background.

Replacement, reset, and site deletion remove the previous stored image.
Failed saves remove the new upload and preserve the previous background.
Concurrent edits are rejected if the previously loaded path has changed.

Run upload validation tests with:

```bash
node --experimental-strip-types --test lib/site-background.test.mjs
```
