export default function handler(req, res) {
  res.json({
    env: Object.keys(process.env).filter(key =>
      key.includes("GOOGLE") || key.includes("SPREAD") || key.includes("VERCEL")
    )
  });
}