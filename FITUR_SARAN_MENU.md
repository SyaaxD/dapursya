# Fitur Saran Menu dan Perbaikan Popup

Perubahan ini menambahkan:

1. Card **Punya ide menu untuk besok?** di bawah tombol pemesanan.
2. Form saran menu singkat dengan batas 120 karakter.
3. Penyimpanan otomatis ke tab Google Sheet `SARAN_MENU`.
4. Saran bersifat anonim, dengan batas tiga saran per IP dalam 24 jam jika
   Upstash aktif.
5. Notifikasi berhasil berbentuk slide di kiri bawah tanpa blur. Notifikasi
   dapat diketuk untuk membuka rincian pesanan dan tombol simpan ke WhatsApp.
6. Menu awal menampilkan status memuat dan mencoba ulang otomatis jika koneksi
   konfigurasi pertama gagal.
7. Submit tidak lagi dibatalkan setelah 15 detik. Jika proses lebih dari 8
   detik, pengguna diminta menunggu dan tidak mengirim ulang.
8. Telegram dikirim sebagai tugas latar belakang resmi Vercel setelah data
   pesanan dan pembayaran berhasil disimpan.
9. Submit tidak lagi menulis ulang header Sheet atau memeriksa ulang tab
   `PEMBAYARAN` pada setiap pesanan. Setup hanya berjalan sebagai fallback jika
   tab belum ada.
10. `SETTING` dan `ADDONS` dibaca bersamaan agar menu awal lebih cepat tampil.

## File yang berubah

- `src/app.js`
- `src/style.css`
- `api/submit.js`
- `api/config.js`
- `api/suggestion.js` (file baru)
- `lib/payment-sheet.js`
- `package.json`
- `package-lock.json`

## Google Sheet

Tidak perlu membuat tab secara manual. Saat saran pertama berhasil dikirim,
server akan membuat tab `SARAN_MENU` dengan kolom:

- Waktu
- Saran Menu

Nama pemesan dan nomor WhatsApp tidak dikirim maupun disimpan.

## Pemeriksaan sebelum deploy

```powershell
npm.cmd install
npm.cmd run build
```

Setelah deploy, lakukan pengujian dari HP:

1. Buka card saran menu dan kirim satu saran.
2. Pastikan tab `SARAN_MENU` muncul di Google Sheet.
3. Buat pesanan dengan dua anak dan tetap berada di bagian bawah halaman.
4. Pastikan slide **Pesanan berhasil dikirim!** langsung muncul tanpa blur.
5. Ketuk slide dan periksa rincian, tombol WhatsApp, serta tombol **Tutup**.
