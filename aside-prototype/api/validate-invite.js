// もやの森β: 招待コード検証
// オンボーディングで入力時に有効/無効を即時判定するための軽量エンドポイント。

const ALLOWED_CODES = (process.env.INVITE_CODES || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body || {};
  const code = (body.inviteCode || '').toString().trim();
  if (!code) {
    res.status(400).json({ valid: false, error: 'invite_code_missing' });
    return;
  }
  if (ALLOWED_CODES.length === 0) {
    res.status(500).json({ valid: false, error: 'server_misconfigured' });
    return;
  }
  res.status(200).json({ valid: ALLOWED_CODES.includes(code) });
};
