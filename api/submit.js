export default function handler(req, res) {
  res.json({
    google: !!process.env.GOOGLE_SERVICE_ACCOUNT,
    spreadsheet: !!process.env.SPREADSHEET_ID,
    project: process.env.VERCEL_PROJECT_NAME,
    env: process.env.VERCEL_ENV,
    commit: process.env.VERCEL_GIT_COMMIT_SHA
  });
}