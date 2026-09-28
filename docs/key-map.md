# Key Map numpad per site

## Deployment

1. Untuk database yang sudah berjalan, buka Supabase SQL Editor dan jalankan seluruh isi
   `supabase/migrations/202609280001_site_menu_keymaps.sql` sekali sebelum deploy aplikasi.
   Migrasi menambah tabel, aturan akses, dan fungsi penyimpanan; tidak mengubah stok atau menu.
   Instalasi database baru memakai `database/schema.sql`, yang sudah memuat definisi ini.
2. Deploy branch `feat/site-numpad-keymap` melalui tmux di VPS:

   ```bash
   cd ~/counter-system
   git fetch origin
   git switch feat/site-numpad-keymap
   sudo docker compose --env-file .env.docker up -d --build
   ```

Migrasi database tidak otomatis dijalankan oleh Docker build. Jika belum diterapkan,
pengaturan Key Map belum tersedia; Take dengan mouse/touch tetap berfungsi.

## Penggunaan

1. Login Superadmin, buka **Key Map**, pilih site.
2. Pilih Numpad 0–9 untuk setiap menu aktif. Bisa juga fokuskan pilihan numpad dan tekan tombol fisiknya.
3. Pilih **Tidak diaktifkan** untuk menghapus pintasan menu tersebut, kemudian **Simpan Key Map**.
4. Muat ulang dashboard staff pada perangkat site itu setelah perubahan disimpan.
5. Saat dashboard aktif, tekan numpad untuk mengambil satu porsi dari menu terkait.

Nomor yang sama boleh digunakan di site berbeda. Dalam satu site, satu nomor hanya
berlaku untuk satu menu. Pengaturan mengacu pada ID menu, bukan urutan tampilan.
Mengubah nama menu mempertahankan pengaturan; menghapus menu menghapus ikatannya.
Menu baru setelah reset perlu diatur kembali. Tidak ada pintasan yang aktif otomatis.

Pintasan bekerja pada mode biasa dan Full Mode melalui satu listener di provider
antrean Take. Angka baris atas keyboard tidak dipakai. `KeyboardEvent.code` mengenali
tombol fisik numpad, termasuk ketika Num Lock mati; tombol yang ditahan diabaikan
setelah pengambilan pertama. Lepas dan tekan kembali untuk pengambilan berikutnya.
Rujukan: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent

Pintasan dijeda saat dropdown aksi/dialog terbuka, saat mengisi input/select/textarea,
atau saat tombol modifier (Ctrl/Alt/Shift/Meta) ditekan. Stok kosong atau status
pengambilan yang belum pasti mengikuti penjagaan yang sama dengan tombol Take.

## Penyimpanan dan akses

`menu_key_bindings` menyimpan pasangan site, ID menu, dan nomor numpad. Foreign key
memastikan menu berasal dari site yang sama dan membersihkan pengaturan saat menu
dihapus. Unique constraint mencegah dua menu menggunakan nomor yang sama dalam satu site.

Staff hanya dapat membaca pengaturan site miliknya melalui RLS. Penyimpanan dilakukan
oleh fungsi `save_site_menu_keymap`, yang memeriksa peran Superadmin, mengunci site,
memvalidasi menu aktif, dan mengganti seluruh pengaturan site dalam satu transaksi.
Server Action juga memeriksa peran dan memvalidasi input. Tidak ada akses service-role
di browser. Simpan yang gagal membatalkan transaksi, termasuk penghapusan ikatan lama.

Pengaturan staff dimuat bersama halaman; perubahan di Superadmin berlaku setelah
halaman staff dimuat ulang. Migrasi SQL dan interaksi numpad fisik harus dikonfirmasi
pada lingkungan deployment; tidak dijalankan terhadap database produksi selama implementasi.
