import { google } from "googleapis";

const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

function parseTanggal(value) {
    const match = String(value).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!match) return null;

    return {
        day: Number(match[1]),
        month: Number(match[2]),
        year: Number(match[3]),
    };
}

function getJakartaDateParts() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        day: "numeric",
        month: "numeric",
        year: "numeric",
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));

    return {
        day: Number(values.day),
        month: Number(values.month),
        year: Number(values.year),
    };
}

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

        const today = getJakartaDateParts();
        const perMenu = {};

        rows.slice(1).forEach(row => {

            const tanggal = parseTanggal(row[0]);
            const menu = String(row[2] ?? "").trim();
            const isToday =
                tanggal &&
                tanggal.day === today.day &&
                tanggal.month === today.month &&
                tanggal.year === today.year;

            if (isToday && menu) {
                perMenu[menu] = (perMenu[menu] || 0) + 1;
            }

        });

        const total = Object.values(perMenu).reduce((sum, count) => sum + count, 0);

        // Cache di edge Vercel selama 5 detik, dan boleh serve versi basi
        // sampai 15 detik sambil di-refresh di belakang layar. Ini bikin
        // ratusan user yang polling barengan cukup 1x hit ke Google Sheets,
        // bukan 1 hit per user -- penting buat jaga kuota API.
        res.setHeader("Cache-Control", "s-maxage=5, stale-while-revalidate=15");

        res.status(200).json({

            success: true,

            total,

            perMenu

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            message: "Gagal mengambil statistik"

        });

    }

}
