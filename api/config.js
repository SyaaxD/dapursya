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

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SPREADSHEET_ID,
            range: "SETTING!A:B"
        });

        const rows = response.data.values || [];

        const config = {};

        rows.forEach(row => {

            const key = row[0];
            const value = row[1];

            config[key] = value;

        });

        // Config jarang berubah (biasanya cuma kamu edit manual di Sheet),
        // jadi cache-nya bisa lebih lama dari stats.
        res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=30");

        res.status(200).json({

            success: true,

            config

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,
            message: "Gagal mengambil konfigurasi"

        });

    }

}