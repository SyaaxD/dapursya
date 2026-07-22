import { google } from "googleapis";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Ambil credential dari Environment Variable
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

// Ubah \n menjadi newline asli
credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");

// Buat autentikasi Google
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// Rate limit: maksimal 5 request per IP per 10 menit.
const ratelimit =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(5, "10 m"),
      })
    : null;

const NAMA_MAX_LENGTH = 100;
const CATATAN_MAX_LENGTH = 300;
const MAX_ANAK_PER_SUBMIT = 10;

// Cegah formula injection: kalau teks diawali =, +, -, @, Google Sheets
// bisa nge-treat itu sebagai formula, bukan teks biasa.
function sanitize(value) {
  const text = String(value ?? "").trim();

  if (/^[=+\-@]/.test(text)) {
    return `'${text}`;
  }

  return text;
}

function parseTanggal(str) {
  const match = String(str).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);

  if (!match) return null;

  return {
    day: Number(match[1]),
    month: Number(match[2]),
    year: Number(match[3]),
  };
}

function extractMenus(config) {
  const menus = [];

  for (let index = 1; ; index++) {
    const menu = String(config[`Menu ${index}`] ?? "").trim();
    if (!menu) break;
    menus.push(menu);
  }

  return menus;
}

function getJakartaDateParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    day: Number(values.day),
    month: Number(values.month),
    year: Number(values.year),
  };
}

function getJakartaTimeParts() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

// Cek apakah sekarang masih dalam jam buka pemesanan, baca dari
// Sheet SETTING. Kalau setting belum diisi, biarkan lolos.
async function isWithinOrderWindow(sheets) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: "SETTING!A:B",
  });

  const rows = response.data.values || [];
  const config = {};

  rows.forEach((row) => {
    config[row[0]] = row[1];
  });

  const openTime = config["Open Time"];
  const closeTime = config["Close Time"];
  const menuValid = extractMenus(config);

  if (!openTime || !closeTime) return { withinWindow: true, menuValid };

  const now = getJakartaTimeParts();
  const nowTotal = now.hour * 60 + now.minute;

  const [openH, openM] = openTime.split(":").map(Number);
  const [closeH, closeM] = closeTime.split(":").map(Number);

  const openTotal = openH * 60 + openM;
  const closeTotal = closeH * 60 + closeM;

  return {
    withinWindow: nowTotal >= openTotal && nowTotal < closeTotal,
    menuValid,
  };
}

// Ambil nama-nama yang udah submit HARI INI (dipakai buat cek semua
// anak dalam 1 kali baca, bukan berkali-kali per anak).
async function getTodayNames(sheets) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: "RESPON!A:B",
  });

  const rows = response.data.values || [];
  const today = getJakartaDateParts();

  return rows
    .slice(1)
    .filter((row) => {
      const parsed = parseTanggal(row[0]);
      return (
        parsed &&
        parsed.day === today.day &&
        parsed.month === today.month &&
        parsed.year === today.year
      );
    })
    .map((row) => String(row[1] || "").trim().toLowerCase());
}

async function getActiveAddons(sheets) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: "ADDONS!A:C",
    });

    const rows = response.data.values || [];

    return rows
      .slice(1)
      .filter((row) => row[0] && row[2] === "Ya")
      .map((row) => ({ nama: row[0], harga: Number(row[1]) || 0 }));
  } catch (err) {
    return [];
  }
}

function resolveAddons(selectedNames, activeAddons) {
  const selected = Array.isArray(selectedNames) ? selectedNames : [];
  const matched = activeAddons.filter((addon) => selected.includes(addon.nama));

  const text = matched
    .map((a) => `${a.nama} (Rp${a.harga.toLocaleString("id-ID")})`)
    .join(", ");

  const total = matched.reduce((sum, a) => sum + a.harga, 0);

  return { text, total };
}

function validateOrder(order, menuValid) {
  const nama = sanitize(order.nama);
  const menu = String(order.menu ?? "").trim();
  const catatan = sanitize(order.catatan);

  if (!nama) {
    return { error: "Nama anak wajib diisi" };
  }

  if (nama.length > NAMA_MAX_LENGTH) {
    return { error: `Nama "${nama}" terlalu panjang` };
  }

  if (!menu) {
    return { error: `Menu untuk "${nama}" wajib dipilih` };
  }

  if (!menuValid.includes(menu)) {
    return { error: `Menu untuk "${nama}" tidak valid, coba refresh halaman` };
  }

  if (catatan.length > CATATAN_MAX_LENGTH) {
    return { error: `Catatan untuk "${nama}" terlalu panjang` };
  }

  return { nama, menu, catatan, addons: order.addons };
}

async function notifyTelegram(orders) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return;

  const lines = orders.map((o, i) => {
    let line = `${i + 1}. ${o.nama} — ${o.menu}`;
    if (o.catatan) line += ` (Catatan: ${o.catatan})`;
    if (o.addonsText) line += ` | Add-ons: ${o.addonsText}`;
    return line;
  });

  const text = ["🍱 Pesanan baru masuk!", ...lines].join("\n");

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (err) {
    console.error("Gagal kirim notifikasi Telegram:", err);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method tidak diizinkan",
    });
  }

  if (ratelimit) {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
    const { success } = await ratelimit.limit(ip);

    if (!success) {
      return res.status(429).json({
        success: false,
        message: "Kebanyakan percobaan, coba lagi beberapa menit lagi ya.",
      });
    }
  }

  const rawOrders = Array.isArray(req.body?.orders) ? req.body.orders : [];

  if (rawOrders.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Data pesanan kosong",
    });
  }

  if (rawOrders.length > MAX_ANAK_PER_SUBMIT) {
    return res.status(400).json({
      success: false,
      message: `Maksimal ${MAX_ANAK_PER_SUBMIT} anak per pengiriman`,
    });
  }

  try {
    const sheets = google.sheets({ version: "v4", auth });

    const [{ withinWindow, menuValid }, todayNames, activeAddons] = await Promise.all([
      isWithinOrderWindow(sheets),
      getTodayNames(sheets),
      getActiveAddons(sheets),
    ]);

    if (!withinWindow) {
      return res.status(403).json({
        success: false,
        message: "Pemesanan sedang ditutup. Coba lagi besok ya.",
      });
    }

    if (menuValid.length === 0) {
      return res.status(503).json({
        success: false,
        message: "Menu belum tersedia. Silakan hubungi admin.",
      });
    }

    const validatedOrders = [];
    const namesInThisSubmission = new Set();

    for (const rawOrder of rawOrders) {
      const validated = validateOrder(rawOrder, menuValid);

      if (validated.error) {
        return res.status(400).json({ success: false, message: validated.error });
      }

      const namaLower = validated.nama.toLowerCase();

      if (todayNames.includes(namaLower) || namesInThisSubmission.has(namaLower)) {
        return res.status(409).json({
          success: false,
          message: `${validated.nama} udah submit pesanan hari ini. Mau ubah pilihan? Chat admin lewat tombol WA ya.`,
        });
      }

      namesInThisSubmission.add(namaLower);
      validatedOrders.push(validated);
    }

    const rows = validatedOrders.map((order) => {
      const { text: addonsText, total: addonsTotal } = resolveAddons(
        order.addons,
        activeAddons
      );

      order.addonsText = addonsText;

      return [
        new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
        order.nama,
        order.menu,
        order.catatan,
        addonsText,
        addonsTotal,
      ];
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: "RESPON!A:F",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: rows },
    });

    await notifyTelegram(validatedOrders);

    return res.status(200).json({
      success: true,
      message: "Berhasil",
      orders: validatedOrders.map((o) => ({ nama: o.nama, menu: o.menu })),
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan di server, coba lagi.",
    });
  }
}
