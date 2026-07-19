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
            range: "RESPON!A:D"
        });

        const rows = response.data.values || [];

        let ayam = 0;
        let ikan = 0;

        rows.slice(1).forEach(row => {

            const menu = row[2];

            if (menu === "Ayam Teriyaki") ayam++;

            if (menu === "Ikan Crispy") ikan++;

        });

        res.status(200).json({

            success: true,

            total: ayam + ikan,

            ayam,

            ikan

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

}