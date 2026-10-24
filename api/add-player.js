export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { clubId, player } = req.body || {};
    return res.status(200).json({
      ok: true,
      clubId,
      player,
      message: 'Player registered successfully'
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
