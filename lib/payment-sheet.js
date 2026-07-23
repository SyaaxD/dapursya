export const PAYMENT_SHEET = "PEMBAYARAN";
export const BASE_BOX_PRICE_FALLBACK = 18000;

export const PAYMENT_HEADERS = [
  "ID Pesanan",
  "Waktu Pesan",
  "Tanggal Kirim",
  "Nama Pemesan",
  "WhatsApp",
  "Nama Anak",
  "Menu",
  "Harga Box",
  "Add-ons",
  "Total Add-ons",
  "Total Tagihan",
  "Status Pembayaran",
  "Jumlah Dibayar",
  "Metode",
  "Waktu Pembayaran",
  "Catatan Admin",
  "Sumber ID",
];

const RAW_EXTRA_HEADERS = [
  "ID Pesanan",
  "Nama Pemesan",
  "WhatsApp",
  "Tanggal Kirim",
  "Harga Box",
  "Total Tagihan",
  "Sumber ID",
];

function parseNumber(value) {
  if (typeof value === "number") return Math.max(0, value);
  const digits = String(value ?? "").replace(/[^\d-]/g, "");
  return Math.max(0, Number(digits) || 0);
}

function parseUpdatedRangeStart(updatedRange) {
  const match = String(updatedRange ?? "").match(/![A-Z]+(\d+):/i);
  return match ? Number(match[1]) : null;
}

async function sheetExists(sheets, spreadsheetId, title) {
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });

  return (response.data.sheets || []).some(
    (sheet) => sheet.properties?.title === title
  );
}

export async function ensureRawHeaders(sheets, spreadsheetId) {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "RESPON!G1:M1",
    valueInputOption: "RAW",
    requestBody: { values: [RAW_EXTRA_HEADERS] },
  });
}

export async function ensurePaymentSheet(sheets, spreadsheetId) {
  const exists = await sheetExists(sheets, spreadsheetId, PAYMENT_SHEET);

  if (!exists) {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: PAYMENT_SHEET,
                  gridProperties: {
                    frozenRowCount: 1,
                  },
                },
              },
            },
          ],
        },
      });
    } catch (error) {
      // Dua request pertama bisa mencoba membuat sheet pada saat bersamaan.
      // Kalau request lain sudah berhasil, lanjutkan ke penulisan header.
      const nowExists = await sheetExists(sheets, spreadsheetId, PAYMENT_SHEET);
      if (!nowExists) throw error;
    }
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${PAYMENT_SHEET}!A1:Q1`,
    valueInputOption: "RAW",
    requestBody: { values: [PAYMENT_HEADERS] },
  });
}

export async function appendRawOrders(sheets, spreadsheetId, rows) {
  await ensureRawHeaders(sheets, spreadsheetId);

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "RESPON!A:M",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });

  const startRow = parseUpdatedRangeStart(response.data.updates?.updatedRange);

  return rows.map((_, index) =>
    startRow ? `RESPON:${startRow + index}` : ""
  );
}

export async function appendPaymentRows(sheets, spreadsheetId, rows) {
  if (!rows.length) return;

  await ensurePaymentSheet(sheets, spreadsheetId);
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${PAYMENT_SHEET}!A:Q`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });
}

function makeLegacyOrderId(rawRowNumber, timestamp) {
  const dateDigits = String(timestamp ?? "").replace(/\D/g, "").slice(0, 8);
  return `LEGACY-${dateDigits || "DATA"}-${rawRowNumber}`;
}

function rawRowToPayment(row, rawRowNumber) {
  const addonsTotal = parseNumber(row[5]);
  const basePrice = parseNumber(row[10]) || BASE_BOX_PRICE_FALLBACK;
  const total = parseNumber(row[11]) || basePrice + addonsTotal;

  return [
    row[6] || makeLegacyOrderId(rawRowNumber, row[0]),
    row[0] || "",
    row[9] || "",
    row[7] || "",
    row[8] || "",
    row[1] || "",
    row[2] || "",
    basePrice,
    row[4] || "",
    addonsTotal,
    total,
    "Belum Lunas",
    0,
    "",
    "",
    "",
    row[12] || `RESPON:${rawRowNumber}`,
  ];
}

export async function backfillPaymentsFromRaw(sheets, spreadsheetId) {
  await ensurePaymentSheet(sheets, spreadsheetId);

  const [rawResponse, paymentResponse] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "RESPON!A2:M",
      valueRenderOption: "FORMATTED_VALUE",
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${PAYMENT_SHEET}!Q2:Q`,
      valueRenderOption: "FORMATTED_VALUE",
    }),
  ]);

  const rawRows = rawResponse.data.values || [];
  const existingSourceIds = new Set(
    (paymentResponse.data.values || []).map((row) => String(row[0] || ""))
  );

  const missingRows = rawRows
    .map((row, index) => ({ row, rawRowNumber: index + 2 }))
    .filter(({ row, rawRowNumber }) => {
      if (!row.some((value) => String(value ?? "").trim())) return false;
      const sourceId = String(row[12] || `RESPON:${rawRowNumber}`);
      return !existingSourceIds.has(sourceId);
    })
    .map(({ row, rawRowNumber }) => rawRowToPayment(row, rawRowNumber));

  await appendPaymentRows(sheets, spreadsheetId, missingRows);
  return missingRows.length;
}

export async function readPaymentRows(sheets, spreadsheetId) {
  await backfillPaymentsFromRaw(sheets, spreadsheetId);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${PAYMENT_SHEET}!A2:Q`,
    valueRenderOption: "FORMATTED_VALUE",
  });

  return (response.data.values || []).map((row, index) => ({
    rowNumber: index + 2,
    orderId: String(row[0] || ""),
    orderedAt: String(row[1] || ""),
    serviceDate: String(row[2] || ""),
    customerName: String(row[3] || ""),
    whatsapp: String(row[4] || ""),
    childName: String(row[5] || ""),
    menu: String(row[6] || ""),
    basePrice: parseNumber(row[7]),
    addons: String(row[8] || ""),
    addonsTotal: parseNumber(row[9]),
    total: parseNumber(row[10]),
    status: String(row[11] || "Belum Lunas"),
    paidAmount: parseNumber(row[12]),
    method: String(row[13] || ""),
    paidAt: String(row[14] || ""),
    adminNote: String(row[15] || ""),
    sourceId: String(row[16] || ""),
  }));
}

export async function updatePaymentRow(
  sheets,
  spreadsheetId,
  rowNumber,
  values
) {
  await ensurePaymentSheet(sheets, spreadsheetId);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${PAYMENT_SHEET}!L${rowNumber}:P${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
}
