import { google } from "googleapis";

// Ambil credential dari Environment Variable
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

// Ubah \n menjadi newline asli
credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");

// Buat autentikasi Google
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const MENU_VALID = ["Ayam Teriyaki", "Ikan Crispy"];
const NAMA_MAX_LENGTH = 100;
const CATATAN_MAX_LENGTH = 300;

// Cegah formula injection: kalau teks diawali =, +, -, @, Google Sheets
// bisa nge-treat itu sebagai formula, bukan teks biasa.
function sanitize(value) {
  const text = String(value ?? "").trim();

  if (/^[=+\-@]/.test(text)) {
    return `'${text}`;
  }

  return text;
}

function validateInput(body) {
  const nama = sanitize(body.nama);
  const menu = String(body.menu ?? "").trim();
  const catatan = sanitize(body.catatan);

  if (!nama) {
    return { error: "Nama anak wajib diisi" };
  }

  if (nama.length > NAMA_MAX_LENGTH) {
    return { error: "Nama terlalu panjang" };
  }

  if (!MENU_VALID.includes(menu)) {
    return { error: "Menu yang dipilih tidak valid" };
  }

  if (catatan.length > CATATAN_MAX_LENGTH) {
    return { error: "Catatan terlalu panjang" };
  }

  return { nama, menu, catatan };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method tidak diizinkan",
    });
  }

  const validated = validateInput(req.body || {});

  if (validated.error) {
    return res.status(400).json({
      success: false,
      message: validated.error,
    });
  }

  const { nama, menu, catatan } = validated;

  try {
    const sheets = google.sheets({
      version: "v4",
      auth,
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: "RESPON!A:D",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          new Date().toLocaleString("id-ID"),
          nama,
          menu,
          catatan,
        ]],
      },
    });

    return res.status(200).json({
      success: true,
      message: "Berhasil",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan di server, coba lagi.",
    });
  }
}