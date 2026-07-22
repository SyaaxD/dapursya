import { google } from "googleapis";

const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

export default async function handler(req, res) {

    try {

        const sheets = google.sheets({
            version: "v4",
            auth
        });

        const settingResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SPREADSHEET_ID,
            range: "SETTING!A:B"
        });

        const settingRows = settingResponse.data.values || [];

        const config = {};

        settingRows.forEach(row => {
            config[row[0]] = row[1];
        });

        // ADDONS sheet sifatnya opsional -- kalau belum dibikin,
        // jangan sampai nge-break seluruh /api/config.
        let addons = [];

        try {

            const addonsResponse = await sheets.spreadsheets.values.get({
                spreadsheetId: process.env.SPREADSHEET_ID,
                range: "ADDONS!A:C",
            });

            const addonsRows = addonsResponse.data.values || [];

            addons = addonsRows
                .slice(1) // baris pertama header: Nama | Harga | Aktif
                .filter(row => row[0] && row[2] === "Ya")
                .map(row => ({
                    nama: row[0],
                    harga: Number(row[1]) || 0,
                }));

        } catch (addonErr) {
            addons = [];
        }

        res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=30");

        res.status(200).json({

            success: true,

            config,

            addons

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,
            message: "Gagal mengambil konfigurasi"

        });

    }

}