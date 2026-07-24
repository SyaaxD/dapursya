import { google } from "googleapis";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const SHEET_NAME = "SARAN_MENU";
const HEADERS = ["Waktu", "Saran Menu"];
const SUGGESTION_MAX_LENGTH = 120;

const ratelimit =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(3, "24 h"),
      })
    : null;

function sanitize(value) {
  const text = String(value ?? "").trim();
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

async function ensureSuggestionSheet(sheets, spreadsheetId) {
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });
  const exists = metadata.data.sheets?.some(
    (sheet) => sheet.properties?.title === SHEET_NAME
  );

  if (!exists) {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: SHEET_NAME } } }],
        },
      });
    } catch (error) {
      // Dua request pertama bisa mencoba membuat tab bersamaan.
      // Abaikan hanya jika tab ternyata sudah dibuat oleh request lainnya.
      const latestMetadata = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: "sheets.properties.title",
      });
      const createdByAnotherRequest = latestMetadata.data.sheets?.some(
        (sheet) => sheet.properties?.title === SHEET_NAME
      );

      if (!createdByAnotherRequest) throw error;
    }
  }

  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A1:B1`,
  });
  const currentHeaders = headerResponse.data.values?.[0] || [];

  if (
    currentHeaders[0] !== HEADERS[0] ||
    currentHeaders[1] !== HEADERS[1]
  ) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!A1:B1`,
      valueInputOption: "RAW",
      requestBody: { values: [HEADERS] },
    });
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      success: false,
      message: "Method tidak diizinkan",
    });
  }

  if (ratelimit) {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
    const { success } = await ratelimit.limit(`menu-suggestion:${ip}`);

    if (!success) {
      return res.status(429).json({
        success: false,
        message: "Saran hari ini sudah cukup. Terima kasih ya!",
      });
    }
  }

  const suggestion = sanitize(req.body?.suggestion);

  if (suggestion.length < 3) {
    return res.status(400).json({
      success: false,
      message: "Tulis nama menu minimal 3 karakter ya.",
    });
  }

  if (suggestion.length > SUGGESTION_MAX_LENGTH) {
    return res.status(400).json({
      success: false,
      message: "Saran menu maksimal 120 karakter.",
    });
  }

  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    await ensureSuggestionSheet(sheets, spreadsheetId);

    const submittedAt = new Date().toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_NAME}!A:B`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[submittedAt, suggestion]],
      },
    });

    return res.status(200).json({
      success: true,
      message: "Terima kasih! Saran menunya sudah kami terima.",
    });
  } catch (error) {
    console.error("Gagal menyimpan saran menu:", error);
    return res.status(500).json({
      success: false,
      message: "Saran belum berhasil dikirim. Coba lagi ya.",
    });
  }
}
