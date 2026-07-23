import { google } from "googleapis";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { readPaymentRows } from "../lib/payment-sheet.js";

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const ratelimit =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(20, "10 m"),
        prefix: "dapursya:admin-read",
      })
    : null;

// Kolom A disimpan pakai new Date().toLocaleString("id-ID") di submit.js,
// formatnya kira-kira "20/7/2026 08.15.00" -> ambil tgl/bln/thn dari situ.
function parseTanggal(str) {
  const match = String(str).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);

  if (!match) return null;

  return {
    day: Number(match[1]),
    month: Number(match[2]),
    year: Number(match[3]),
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
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
        message: "Terlalu banyak percobaan. Tunggu beberapa menit.",
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

  try {
    const sheets = google.sheets({ version: "v4", auth });

    const [response, allPayments] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: "RESPON!A:M",
      }),
      readPaymentRows(sheets, process.env.SPREADSHEET_ID),
    ]);

    const rows = response.data.values || [];

    const allData = rows.slice(1).map((row) => ({
      tanggal: row[0] || "",
      nama: row[1] || "",
      menu: row[2] || "",
      catatan: row[3] || "",
      addons: row[4] || "",
      totalAddons: Number(row[5]) || 0,
      orderId: row[6] || "",
      customerName: row[7] || "",
      whatsapp: row[8] || "",
      serviceDate: row[9] || "",
      basePrice: Number(row[10]) || 0,
      total: Number(row[11]) || 0,
    }));

    // Default: bulan & tahun berjalan. Bisa override lewat query
    // ?bulan=6&tahun=2026 buat lihat rekap bulan lain.
    const jakartaParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      month: "numeric",
      year: "numeric",
    }).formatToParts(new Date());
    const jakartaNow = Object.fromEntries(
      jakartaParts.map((part) => [part.type, part.value])
    );
    const targetMonth = Number(req.query.bulan) || Number(jakartaNow.month);
    const targetYear = Number(req.query.tahun) || Number(jakartaNow.year);

    const data = allData.filter((row) => {
      const parsed = parseTanggal(row.tanggal);
      if (!parsed) return false;
      return parsed.month === targetMonth && parsed.year === targetYear;
    });

    const payments = allPayments.filter((row) => {
      const parsed = parseTanggal(row.serviceDate || row.orderedAt);
      if (!parsed) return false;
      return parsed.month === targetMonth && parsed.year === targetYear;
    });

    const rekapPerAnak = {};
    const rekapTambahanPerAnak = {};
    const rekapMenu = {};

    data.forEach(({ nama, menu, totalAddons }) => {
      if (!nama) return;
      rekapPerAnak[nama] = (rekapPerAnak[nama] || 0) + 1;
      rekapTambahanPerAnak[nama] = (rekapTambahanPerAnak[nama] || 0) + totalAddons;

      if (menu) {
        rekapMenu[menu] = (rekapMenu[menu] || 0) + 1;
      }
    });

    const paymentSummary = payments.reduce(
      (summary, payment) => {
        summary.totalBilled += payment.total;
        summary.totalPaid += Math.min(payment.paidAmount, payment.total);
        summary.statusCounts[payment.status] =
          (summary.statusCounts[payment.status] || 0) + 1;
        return summary;
      },
      {
        totalBilled: 0,
        totalPaid: 0,
        statusCounts: {},
      }
    );

    paymentSummary.outstanding = Math.max(
      0,
      paymentSummary.totalBilled - paymentSummary.totalPaid
    );

    res.setHeader("Cache-Control", "no-store");

    res.status(200).json({
      success: true,
      bulan: targetMonth,
      tahun: targetYear,
      total: data.length,
      data,
      rekapPerAnak,
      rekapTambahanPerAnak,
      rekapMenu,
      payments,
      paymentSummary,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Gagal mengambil data",
    });
  }
}
