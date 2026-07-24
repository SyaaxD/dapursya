# Update Brand Dapur Sya

Update ini memasang identitas visual terbaru Dapur Sya pada website:

- logo horizontal di bagian atas halaman;
- logogram sebagai favicon/tab browser;
- gambar preview profesional saat tautan dibagikan ke WhatsApp, Discord, dan media sosial;
- judul serta deskripsi tautan yang lebih jelas untuk orang tua.

## File yang diperbarui

- `index.html`
- `src/app.js`
- `src/style.css`
- `public/dapursya-logo.png`
- `public/dapursya-icon-512.png`
- `public/og-dapursya.png`

## Cara mencoba

Jalankan:

```powershell
npm.cmd run build
npx.cmd vercel@latest dev
```

Kemudian buka `http://localhost:3000`.

## Setelah sesuai

```powershell
git add index.html src/app.js src/style.css public/dapursya-logo.png public/dapursya-icon-512.png public/og-dapursya.png PANDUAN_LOGO_WEBSITE.md
git commit -m "Pasang logo dan preview link Dapur Sya"
git push origin main
```

Preview lama di WhatsApp atau Discord mungkin masih tersimpan di cache. Setelah deployment selesai, bagikan tautan baru dengan parameter sekali pakai, misalnya:

`https://www.dapursya.my.id/?brand=1`

Website yang dibuka tetap sama; parameter tersebut hanya membantu aplikasi chat mengambil preview terbaru.
