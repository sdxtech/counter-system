# Key Map angka keyboard dan numpad berdasarkan posisi menu per site

## Deployment

1. Untuk database yang sudah berjalan, buka Supabase SQL Editor dan jalankan seluruh isi
   `supabase/migrations/202609280002_site_menu_slot_keymaps.sql` sebelum deploy aplikasi.
   Cukup migrasi ini: bisa dijalankan baik migrasi Key Map sebelumnya sudah diterapkan maupun belum.
   Migrasi menambah tabel, aturan akses, dan fungsi penyimpanan; tidak mengubah stok atau menu.
   Pengaturan lama, jika ada, disalin sekali ke posisi kartu saat migrasi pertama kali dijalankan.
   Instalasi database baru memakai `database/schema.sql`, yang sudah memuat definisi ini.
2. Deploy branch `feat/take-keyboard-digits` melalui tmux di VPS:

   ```bash
   cd ~/counter-system
   git fetch origin
   git switch feat/take-keyboard-digits
   sudo docker compose --env-file .env.docker up -d --build
   ```

Migrasi database tidak otomatis dijalankan oleh Docker build. Jika belum diterapkan,
pengaturan Key Map belum tersedia; Take dengan mouse/touch tetap berfungsi.
Jika migrasi posisi menu sudah diterapkan, dukungan angka baris atas ini tidak
memerlukan migrasi tambahan. Pilihan angka yang sudah tersimpan tetap berlaku.

## Penggunaan

1. Login Superadmin, buka **Key Map**, pilih site.
2. Atur angka 0–9 untuk **Menu 1** sampai **Menu 6**. Keenam posisi selalu tersedia,
   termasuk ketika site belum memiliki menu. Bisa juga fokuskan pilihan dan tekan angka baris atas atau numpad.
3. Pilih **Tidak diaktifkan** untuk menghapus pintasan posisi tersebut, kemudian **Simpan Key Map**.
4. Muat ulang dashboard staff pada perangkat site itu setelah perubahan disimpan.
5. Saat dashboard aktif, tekan angka baris atas atau numpad untuk mengambil satu porsi dari kartu pada posisi terkait.

Nomor yang sama boleh digunakan di site berbeda. Dalam satu site, satu nomor hanya
berlaku untuk satu posisi. Pengaturan tersimpan per site dan posisi, sehingga tetap
berlaku saat menu dihapus, di-reset, atau diganti nama/isinya. Tidak ada pintasan yang aktif otomatis.

Menu 1 adalah kartu pertama, Menu 2 kartu kedua, dan seterusnya dari kiri ke kanan,
lalu baris berikutnya. Urutan data mengikuti `created_at DESC, id DESC`, sama untuk
layout biasa dan Full Mode. Menu baru masuk di awal, sehingga kartu berikutnya bergeser.
Tombol selalu mengambil kartu yang saat itu berada di posisi terkait. Jika hanya ada
tiga menu, pintasan Menu 4–6 tidak melakukan apa pun sampai posisi tersebut terisi.
Kapasitas aplikasi saat ini enam menu aktif per site.

Pintasan bekerja pada mode biasa dan Full Mode melalui satu listener di provider
antrean Take. `KeyboardEvent.code` mengenali `Digit0`–`Digit9` dan `Numpad0`–`Numpad9`.
Keduanya memakai pengaturan angka yang sama. Numpad juga dikenali ketika Num Lock mati;
tombol yang ditahan diabaikan
setelah pengambilan pertama. Lepas dan tekan kembali untuk pengambilan berikutnya.
Rujukan: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent

Pintasan dijeda saat dropdown aksi/dialog terbuka, saat mengisi input/select/textarea,
atau saat tombol modifier (Ctrl/Alt/Shift/Meta) ditekan. Stok kosong atau status
pengambilan yang belum pasti mengikuti penjagaan yang sama dengan tombol Take.

## Penyimpanan dan akses

`site_menu_slot_keys` menyimpan site, posisi 1–6, dan nomor numpad. Pengaturan hanya
bergantung pada site, sehingga reset menu tidak menghapusnya. Unique constraint
mencegah dua posisi menggunakan nomor yang sama dalam satu site.

Staff hanya dapat membaca pengaturan site miliknya melalui RLS. Penyimpanan dilakukan
oleh fungsi `save_site_menu_slot_keymap`, yang memeriksa peran Superadmin, mengunci site,
memvalidasi rentang posisi/nomor, dan mengganti seluruh pengaturan site dalam satu transaksi.
Server Action juga memeriksa peran dan memvalidasi input. Tidak ada akses service-role
di browser. Simpan yang gagal membatalkan transaksi, termasuk penghapusan ikatan lama.

Pengaturan staff dimuat bersama halaman; perubahan di Superadmin berlaku setelah
halaman staff dimuat ulang. Migrasi SQL dan interaksi numpad fisik harus dikonfirmasi
pada lingkungan deployment; tidak dijalankan terhadap database produksi selama implementasi.
