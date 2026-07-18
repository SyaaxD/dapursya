export default async function handler(req, res) {
  return res.status(200).json({
    google: !!process.env.GOOGLE_SERVICE_ACCOUNT,
    spreadsheet: process.env.SPREADSHEET_ID || null
  });
}