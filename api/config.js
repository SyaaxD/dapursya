import { google } from "googleapis";
import { BASE_BOX_PRICE_FALLBACK } from "../lib/payment-sheet.js";

const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

function extractMenus(config) {
    const menus = [];

    for (let index = 1; ; index++) {
        const menu = String(config[`Menu ${index}`] ?? "").trim();
        if (!menu) break;
        menus.push(menu);
    }

    return menus;
}

function extractMenuDetails(config, menus) {
    return Object.fromEntries(
        menus.map((menu, index) => {
            const number = index + 1;
            const detail = String(
                config[`Side Dish ${number}`] ??
                config[`Detail Menu ${number}`] ??
                ""
            ).trim();

            return [menu, detail];
        })
    );
}

function parseHarga(value) {
    if (typeof value === "number") return Math.max(0, value);

    const digits = String(value ?? "").replace(/[^\d-]/g, "");
    return Math.max(0, Number(digits) || 0);
}

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
            const key = String(row[0] ?? "").trim();
            if (key) config[key] = row[1];
        });

        const menus = extractMenus(config);
        const menuDetails = extractMenuDetails(config, menus);
        const basePrice =
            parseHarga(config["Harga Box"]) || BASE_BOX_PRICE_FALLBACK;

        // ADDONS sheet sifatnya opsional -- kalau belum dibikin,
        // jangan sampai nge-break seluruh /api/config.
        let addons = [];

        try {

            const addonsResponse = await sheets.spreadsheets.values.get({
                spreadsheetId: process.env.SPREADSHEET_ID,
                range: "ADDONS!A:C",
                valueRenderOption: "UNFORMATTED_VALUE",
            });

            const addonsRows = addonsResponse.data.values || [];

            addons = addonsRows
                .slice(1) // baris pertama header: Nama | Harga | Aktif
                .filter(row => row[0] && row[2] === "Ya")
                .map(row => ({
                    nama: row[0],
                    harga: parseHarga(row[1]),
                }));

        } catch (addonErr) {
            addons = [];
        }

        res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=30");

        res.status(200).json({

            success: true,

            config,

            menus,

            menuDetails,

            addons,

            basePrice

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,
            message: "Gagal mengambil konfigurasi"

        });

    }

}
