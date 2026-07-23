import { google } from "googleapis";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  ensurePaymentSheet,
  updatePaymentRow,
} from "../lib/payment-sheet.js";

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const ratelimit =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(30, "10 m"),
        prefix: "dapursya:admin-payment",
      })
    : null;

const ALLOWED_STATUS = new Set([
  "Belum Lunas",
  "Sebagian",
  "Lunas",
  "Dibatalkan",
  "Refund",
]);

const ALLOWED_METHOD = new Set([
  "",
  "Tunai",
  "Transfer",
  "QRIS",
  "Lainnya",
]);

function sanitize(value, maxLength = 200) {
  const text = String(value ?? "").trim().slice(0, maxLength);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function parseAmount(value) {
  if (typeof value === "number") return Math.max(0, value);
  return Math.max(0, Number(String(value ?? "").replace(/\D/g, "")) || 0);
}

function nowJakarta() {
  return new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
  });
}

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
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
        message: "Terlalu banyak perubahan. Tunggu beberapa menit.",
      });
    }
  }

  const key = req.headers["x-admin-key"];
  if (!process.env.ADMIN_PASSWORD || key !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({
      success: false,
      message: "Kode admin salah",
    });
  }

  const rowNumber = Number(req.body?.rowNumber);
  const status = String(req.body?.status || "");
  const method = String(req.body?.method || "");
  const adminNote = sanitize(req.body?.adminNote);

  if (!Number.isInteger(rowNumber) || rowNumber < 2 || rowNumber > 1000000) {
    return res.status(400).json({
      success: false,
      message: "Baris pembayaran tidak valid",
    });
  }

  if (!ALLOWED_STATUS.has(status) || !ALLOWED_METHOD.has(method)) {
    return res.status(400).json({
      success: false,
      message: "Status atau metode pembayaran tidak valid",
    });
  }

  try {
    const sheets = google.sheets({ version: "v4", auth });
    await ensurePaymentSheet(sheets, process.env.SPREADSHEET_ID);

    const currentResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `PEMBAYARAN!K${rowNumber}:P${rowNumber}`,
      valueRenderOption: "FORMATTED_VALUE",
    });
    const current = currentResponse.data.values?.[0];

    if (!current) {
      return res.status(404).json({
        success: false,
        message: "Data pembayaran tidak ditemukan",
      });
    }

    const total = parseAmount(current[0]);
    let paidAmount = Math.max(0, Number(req.body?.paidAmount) || 0);

    if (status === "Lunas") paidAmount = total;
    if (
      status === "Belum Lunas" ||
      status === "Dibatalkan" ||
      status === "Refund"
    ) {
      paidAmount = 0;
    }
    if (paidAmount > total) paidAmount = total;

    if (status === "Sebagian" && (paidAmount <= 0 || paidAmount >= total)) {
      return res.status(400).json({
        success: false,
        message: "Pembayaran sebagian harus lebih dari Rp0 dan kurang dari total",
      });
    }

    const paidAt =
      status === "Lunas" || status === "Sebagian"
        ? String(current[4] || nowJakarta())
        : "";

    await updatePaymentRow(
      sheets,
      process.env.SPREADSHEET_ID,
      rowNumber,
      [status, paidAmount, method, paidAt, adminNote]
    );

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      success: true,
      payment: {
        rowNumber,
        status,
        paidAmount,
        method,
        paidAt,
        adminNote,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui pembayaran",
    });
  }
}
