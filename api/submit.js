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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method tidak diizinkan",
    });
  }

  try {
    const { nama, menu, catatan } = req.body;

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
      message: err.message,
      stack: err.stack,
    });
  }
}