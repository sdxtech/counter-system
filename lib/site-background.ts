export const SITE_BACKGROUND_BUCKET = "site-backgrounds";
export const DEFAULT_SITE_BACKGROUND = "/pexels-steve-6433209.jpg";
export const MAX_SITE_BACKGROUND_BYTES = 5 * 1024 * 1024;

export async function validateSiteBackground(file: File): Promise<string | null> {
  if (!file.size) return "Pilih file JPG terlebih dahulu.";
  if (file.size > MAX_SITE_BACKGROUND_BYTES) return "Ukuran background maksimal 5 MB.";
  if (!/\.jpe?g$/i.test(file.name) || file.type !== "image/jpeg") {
    return "Background harus berupa file JPG/JPEG.";
  }
  const signature = new Uint8Array(await file.slice(0, 3).arrayBuffer());
  if (signature[0] !== 0xff || signature[1] !== 0xd8 || signature[2] !== 0xff) {
    return "Isi file bukan gambar JPG yang valid.";
  }
  return null;
}
