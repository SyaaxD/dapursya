import { google } from "googleapis";

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// Kolom A disimpan pakai new Date().toLocaleString("id-ID") di submit.js,
// formatnya kira-kira "20/7/2026 08.15.00" -> ambil tgl/bln/thn dari situ.
function parseTanggal(str) {
  const match = String(str).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);

  if (!match) return null;

  return {
    day: Number(match[1]),
    month: Number(match[2]),
    year: Number(match[3]),
  };
}

export default async function handler(req, res) {
  const key = req.headers["x-admin-key"];

  if (!process.env.ADMIN_PASSWORD || key !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({
      success: false,
      message: "Kode admin salah",
    });
  }

  try {
    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: "RESPON!A:F",
    });

    const rows = response.data.values || [];

    const allData = rows.slice(1).map((row) => ({
      tanggal: row[0] || "",
      nama: row[1] || "",
      menu: row[2] || "",
      catatan: row[3] || "",
      addons: row[4] || "",
      totalAddons: Number(row[5]) || 0,
    }));

    // Default: bulan & tahun berjalan. Bisa override lewat query
    // ?bulan=6&tahun=2026 buat lihat rekap bulan lain.
    const now = new Date();
    const targetMonth = Number(req.query.bulan) || now.getMonth() + 1;
    const targetYear = Number(req.query.tahun) || now.getFullYear();

    const data = allData.filter((row) => {
      const parsed = parseTanggal(row.tanggal);
      if (!parsed) return false;
      return parsed.month === targetMonth && parsed.year === targetYear;
    });

    const rekapPerAnak = {};
    const rekapTambahanPerAnak = {};
    const rekapMenu = {};

    data.forEach(({ nama, menu, totalAddons }) => {
      if (!nama) return;
      rekapPerAnak[nama] = (rekapPerAnak[nama] || 0) + 1;
      rekapTambahanPerAnak[nama] = (rekapTambahanPerAnak[nama] || 0) + totalAddons;

      if (menu) {
        rekapMenu[menu] = (rekapMenu[menu] || 0) + 1;
      }
    });

    res.setHeader("Cache-Control", "no-store");

    res.status(200).json({
      success: true,
      bulan: targetMonth,
      tahun: targetYear,
      total: data.length,
      data,
      rekapPerAnak,
      rekapTambahanPerAnak,
      rekapMenu,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Gagal mengambil data",
    });
  }
}