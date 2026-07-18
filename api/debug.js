export default function handler(req, res) {
  res.json({
    envKeys: Object.keys(process.env).sort(),
    hasGoogle: "GOOGLE_SERVICE_ACCOUNT" in process.env,
    hasSpreadsheet: "SPREADSHEET_ID" in process.env,
    google: process.env.GOOGLE_SERVICE_ACCOUNT,
    spreadsheet: process.env.SPREADSHEET_ID
  });
}