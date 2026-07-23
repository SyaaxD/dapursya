# Aktivasi Sistem Pembayaran Dapur Sya

## 1. Atur harga box

Di tab `SETTING`, tambahkan baris:

| A | B |
|---|---:|
| Harga Box | 18000 |

Gunakan angka `18000`, tanpa `Rp` dan tanpa tanda titik. Jika baris ini belum
dibuat, server tetap menggunakan harga cadangan Rp18.000.

## 2. Tab PEMBAYARAN

Tidak perlu membuat tab ini secara manual. Tab `PEMBAYARAN` dan header-nya
dibuat otomatis ketika:

1. pesanan baru berhasil dikirim; atau
2. admin pertama kali membuka `/admin`.

Saat admin pertama kali membuka panel, data lama dari `RESPON` ikut disalin ke
`PEMBAYARAN` tanpa menggandakan baris yang sudah pernah diimpor.

Data lama tidak memiliki nama orang tua dan WhatsApp. Kolom tersebut akan
ditampilkan sebagai data lama, sedangkan harga box dihitung Rp18.000 ditambah
total add-ons.

## 3. Pengelolaan admin

Di `/admin`, admin dapat:

- memilih bulan dan tahun;
- menyaring tanggal pengiriman;
- melihat total tagihan, pembayaran diterima, dan sisa tagihan;
- membuka WhatsApp pemesan;
- mengubah status menjadi Belum Lunas, Sebagian, Lunas, Dibatalkan, atau Refund;
- mengisi jumlah dibayar, metode, dan catatan.

Kelola pembayaran melalui tab `PEMBAYARAN` atau halaman `/admin`. Jangan
mengubah urutan, menghapus, atau menyortir langsung tab `RESPON`; gunakan
filter view jika hanya ingin melihat data tertentu.

## 4. Pemeriksaan setelah deploy

1. Buka website dari HP.
2. Isi satu pesanan uji dengan nama pemesan dan WhatsApp.
3. Centang pilihan untuk mengingat data.
4. Pastikan total website sama dengan Telegram, `RESPON`, dan `PEMBAYARAN`.
5. Tutup lalu buka kembali website dan pastikan data pemesan otomatis terisi.
6. Masuk ke `/admin` dan ubah pesanan uji menjadi Lunas.
7. Pastikan perubahan juga terlihat di tab `PEMBAYARAN`.
