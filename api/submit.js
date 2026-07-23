import { google } from "googleapis";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { randomBytes } from "node:crypto";
import {
  BASE_BOX_PRICE_FALLBACK,
  appendPaymentRows,
  appendRawOrders,
} from "../lib/payment-sheet.js";

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
const NAMA_PEMESAN_MAX_LENGTH = 100;
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

function normalizeConfigKey(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("id-ID");
}

function getConfigValue(config, key) {
  const normalizedKey = normalizeConfigKey(key);
  const matchedEntry = Object.entries(config).find(
    ([configKey]) => normalizeConfigKey(configKey) === normalizedKey
  );

  return matchedEntry?.[1];
}

function extractMenus(config) {
  const menus = [];

  for (let index = 1; ; index++) {
    const menu = String(getConfigValue(config, `Menu ${index}`) ?? "").trim();
    if (!menu) break;
    menus.push(menu);
  }

  return menus;
}

function parseHarga(value) {
  if (typeof value === "number") return Math.max(0, value);

  const digits = String(value ?? "").replace(/[^\d-]/g, "");
  return Math.max(0, Number(digits) || 0);
}

function normalizeWhatsapp(value) {
  let digits = String(value ?? "").replace(/\D/g, "");

  if (digits.startsWith("0")) {
    digits = `62${digits.slice(1)}`;
  } else if (digits.startsWith("8")) {
    digits = `62${digits}`;
  }

  return digits;
}

function validateCustomer(rawCustomer) {
  const nama = sanitize(rawCustomer?.nama);
  const whatsapp = normalizeWhatsapp(rawCustomer?.whatsapp);

  if (!nama) return { error: "Nama orang tua/pemesan wajib diisi" };
  if (nama.length > NAMA_PEMESAN_MAX_LENGTH) {
    return { error: "Nama orang tua/pemesan terlalu panjang" };
  }

  if (!/^628\d{8,11}$/.test(whatsapp)) {
    return { error: "Nomor WhatsApp belum valid. Gunakan nomor Indonesia aktif." };
  }

  return { nama, whatsapp };
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

function formatDateParts({ day, month, year }) {
  return [
    String(day).padStart(2, "0"),
    String(month).padStart(2, "0"),
    year,
  ].join("/");
}

function getJakartaDateWithOffset(offsetDays) {
  const today = getJakartaDateParts();
  const target = new Date(
    Date.UTC(today.year, today.month - 1, today.day + offsetDays)
  );

  return formatDateParts({
    day: target.getUTCDate(),
    month: target.getUTCMonth() + 1,
    year: target.getUTCFullYear(),
  });
}

function createOrderId() {
  const today = getJakartaDateParts();
  const datePart = [
    String(today.year).slice(-2),
    String(today.month).padStart(2, "0"),
    String(today.day).padStart(2, "0"),
  ].join("");

  return `DS-${datePart}-${randomBytes(3).toString("hex").toUpperCase()}`;
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

function isClosedStatus(value) {
  return ["tutup", "libur", "off", "closed"].includes(
    String(value || "").trim().toLocaleLowerCase("id-ID")
  );
}

function isMinuteWithinWindow(nowTotal, openTotal, closeTotal) {
  if (openTotal === closeTotal) return true;
  if (openTotal < closeTotal) {
    return nowTotal >= openTotal && nowTotal < closeTotal;
  }

  // Jadwal melewati tengah malam, misalnya 18:00 sampai 12:00 esok hari.
  return nowTotal >= openTotal || nowTotal < closeTotal;
}

function getServiceDateJakarta(nowTotal, openTotal, closeTotal) {
  const isOvernightWindow = openTotal > closeTotal;
  const isMorningPart = isOvernightWindow && nowTotal < closeTotal;
  return getJakartaDateWithOffset(isMorningPart ? 0 : 1);
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

  const openTime = String(getConfigValue(config, "Open Time") ?? "").trim();
  const closeTime = String(getConfigValue(config, "Close Time") ?? "").trim();
  const status = getConfigValue(config, "Status");
  const menuValid = extractMenus(config);

  const basePrice =
    parseHarga(getConfigValue(config, "Harga Box")) || BASE_BOX_PRICE_FALLBACK;

  if (isClosedStatus(status)) {
    return { withinWindow: false, menuValid, basePrice, serviceDate: "" };
  }

  if (!openTime || !closeTime) {
    return {
      withinWindow: true,
      menuValid,
      basePrice,
      serviceDate: getJakartaDateWithOffset(1),
    };
  }

  const now = getJakartaTimeParts();
  const nowTotal = now.hour * 60 + now.minute;

  const [openH, openM] = openTime.split(":").map(Number);
  const [closeH, closeM] = closeTime.split(":").map(Number);

  const openTotal = openH * 60 + openM;
  const closeTotal = closeH * 60 + closeM;

  return {
    withinWindow:
      [openTotal, closeTotal].every(Number.isFinite) &&
      isMinuteWithinWindow(nowTotal, openTotal, closeTotal),
    menuValid,
    basePrice,
    serviceDate: [openTotal, closeTotal].every(Number.isFinite)
      ? getServiceDateJakarta(nowTotal, openTotal, closeTotal)
      : "",
  };
}

// Duplikat dihitung dari nomor WhatsApp + nama anak untuk tanggal kirim yang sama.
// Nama anak yang sama dari dua keluarga berbeda tetap bisa memesan.
async function getOrderRows(sheets) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: "RESPON!A:J",
  });

  return response.data.values || [];
}

function getOrderKeysForServiceDate(rows, serviceDate) {
  const target = parseTanggal(serviceDate);

  return rows
    .slice(1)
    .filter((row) => {
      const parsed = parseTanggal(row[9] || row[0]);
      return (
        parsed && target &&
        parsed.day === target.day &&
        parsed.month === target.month &&
        parsed.year === target.year
      );
    })
    .map((row) => {
      const whatsapp = normalizeWhatsapp(row[8]);
      const childName = String(row[1] || "").trim().toLowerCase();
      return whatsapp && childName ? `${whatsapp}|${childName}` : "";
    })
    .filter(Boolean);
}

async function getActiveAddons(sheets) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: "ADDONS!A:C",
      valueRenderOption: "UNFORMATTED_VALUE",
    });

    const rows = response.data.values || [];

    return rows
      .slice(1)
      .filter((row) => row[0] && row[2] === "Ya")
      .map((row) => ({ nama: row[0], harga: parseHarga(row[1]) }));
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

async function notifyTelegram({ orderId, customer, orders, grandTotal }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return;

  const lines = orders.map((o, i) => {
    let line = `${i + 1}. ${o.nama} — ${o.menu}`;
    if (o.catatan) line += ` (Catatan: ${o.catatan})`;
    if (o.addonsText) line += ` | Add-ons: ${o.addonsText}`;
    return line;
  });

  const text = [
    "🍱 Pesanan baru masuk!",
    `ID: ${orderId}`,
    `Pemesan: ${customer.nama}`,
    `WhatsApp: +${customer.whatsapp}`,
    ...lines,
    `Total: Rp${grandTotal.toLocaleString("id-ID")}`,
  ].join("\n");

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
  const customer = validateCustomer(req.body?.customer);

  if (customer.error) {
    return res.status(400).json({ success: false, message: customer.error });
  }

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

    const [
      { withinWindow, menuValid, basePrice, serviceDate },
      orderRows,
      activeAddons,
    ] = await Promise.all([
      isWithinOrderWindow(sheets),
      getOrderRows(sheets),
      getActiveAddons(sheets),
    ]);
    const serviceDateOrderKeys = getOrderKeysForServiceDate(
      orderRows,
      serviceDate
    );

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
    const keysInThisSubmission = new Set();

    for (const rawOrder of rawOrders) {
      const validated = validateOrder(rawOrder, menuValid);

      if (validated.error) {
        return res.status(400).json({ success: false, message: validated.error });
      }

      const orderKey = `${customer.whatsapp}|${validated.nama.toLowerCase()}`;

      if (
        serviceDateOrderKeys.includes(orderKey) ||
        keysInThisSubmission.has(orderKey)
      ) {
        return res.status(409).json({
          success: false,
          message: `${validated.nama} udah submit pesanan hari ini. Mau ubah pilihan? Chat admin lewat tombol WA ya.`,
        });
      }

      keysInThisSubmission.add(orderKey);
      validatedOrders.push(validated);
    }

    const orderId = createOrderId();
    const orderedAt = new Date().toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
    });
    const resolvedOrders = validatedOrders.map((order) => {
      const { text: addonsText, total: addonsTotal } = resolveAddons(
        order.addons,
        activeAddons
      );

      order.addonsText = addonsText;
      order.addonsTotal = addonsTotal;
      order.total = basePrice + addonsTotal;
      return order;
    });

    const sourceIds = resolvedOrders.map(
      (_, index) => `ORDER:${orderId}:${index + 1}`
    );
    const rawRows = resolvedOrders.map((order, index) => [
      orderedAt,
      order.nama,
      order.menu,
      order.catatan,
      order.addonsText,
      order.addonsTotal,
      orderId,
      customer.nama,
      `'${customer.whatsapp}`,
      serviceDate,
      basePrice,
      order.total,
      sourceIds[index],
    ]);

    await appendRawOrders(
      sheets,
      process.env.SPREADSHEET_ID,
      rawRows
    );

    const paymentRows = resolvedOrders.map((order, index) => [
      orderId,
      orderedAt,
      serviceDate,
      customer.nama,
      `'${customer.whatsapp}`,
      order.nama,
      order.menu,
      basePrice,
      order.addonsText,
      order.addonsTotal,
      order.total,
      "Belum Lunas",
      0,
      "",
      "",
      "",
      sourceIds[index],
    ]);

    try {
      await appendPaymentRows(
        sheets,
        process.env.SPREADSHEET_ID,
        paymentRows
      );
    } catch (paymentError) {
      // RESPON sudah tersimpan. Panel admin akan memperbaiki baris pembayaran
      // yang tertinggal lewat backfill saat dibuka.
      console.error("Gagal menulis PEMBAYARAN, menunggu backfill:", paymentError);
    }

    const grandTotal = resolvedOrders.reduce((sum, order) => sum + order.total, 0);

    await notifyTelegram({
      orderId,
      customer,
      orders: resolvedOrders,
      grandTotal,
    });

    return res.status(200).json({
      success: true,
      message: "Berhasil",
      orderId,
      customer: { nama: customer.nama, whatsapp: customer.whatsapp },
      serviceDate,
      basePrice,
      grandTotal,
      orders: resolvedOrders.map((order) => ({
        nama: order.nama,
        menu: order.menu,
        addons: order.addonsText,
        addonsTotal: order.addonsTotal,
        total: order.total,
      })),
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan di server, coba lagi.",
    });
  }
}
