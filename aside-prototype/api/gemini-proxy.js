// もやの森β: Gemini API プロキシ
// 招待コードを検証してから Gemini に転送。APIキーはサーバー環境変数のみで保持。
//
// 必須環境変数:
//   GEMINI_API_KEY      Google AI Studio で発行した Gemini API キー
//   INVITE_CODES        β招待コードをカンマ区切りで列挙（例: abc123,xyz789,...）
//
// 任意:
//   INVITE_CODES_2        追加の招待コード（INVITE_CODES が Sensitive で追記しづらい場合の増設枠。両方マージされる）
//   GEMINI_DEFAULT_MODEL  デフォルトモデル（未指定なら gemini-2.5-flash）

// 招待コードは INVITE_CODES と INVITE_CODES_2 の両方から読み込む（追加分は
// Sensitive な INVITE_CODES を触らずに INVITE_CODES_2 へ足せるようにするため）。
const ALLOWED_CODES = [process.env.INVITE_CODES, process.env.INVITE_CODES_2]
  .filter(Boolean)
  .join(',')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DEFAULT_MODEL = process.env.GEMINI_DEFAULT_MODEL || 'gemini-2.5-flash';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Invite-Code');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body || {};
  const code = (req.headers['x-invite-code'] || body.inviteCode || '').toString().trim();
  if (!code) {
    res.status(401).json({ error: 'invite_code_missing' });
    return;
  }
  if (ALLOWED_CODES.length === 0) {
    res.status(500).json({ error: 'server_misconfigured', detail: 'INVITE_CODES not set' });
    return;
  }
  if (!ALLOWED_CODES.includes(code)) {
    res.status(403).json({ error: 'invalid_invite_code' });
    return;
  }
  if (!GEMINI_API_KEY) {
    res.status(500).json({ error: 'server_misconfigured', detail: 'GEMINI_API_KEY not set' });
    return;
  }

  const { model, systemPrompt, messages, temperature, maxTokens, thinkingBudget, responseMimeType } = body;
  if (!Array.isArray(messages)) {
    res.status(400).json({ error: 'messages_must_be_array' });
    return;
  }

  const targetModel = (model || DEFAULT_MODEL).toString();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(m.content || '') }],
  }));
  const reqBody = {
    contents,
    systemInstruction: systemPrompt ? { parts: [{ text: String(systemPrompt) }] } : undefined,
    generationConfig: {
      temperature: typeof temperature === 'number' ? temperature : 0.8,
      maxOutputTokens: typeof maxTokens === 'number' ? maxTokens : 512,
      thinkingConfig: { thinkingBudget: typeof thinkingBudget === 'number' ? thinkingBudget : 0 },
      ...(responseMimeType ? { responseMimeType: String(responseMimeType) } : {}),
    },
  };

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      console.warn('[gemini-proxy]', resp.status, errText);
      res.status(resp.status).json({ error: 'gemini_error', status: resp.status, detail: errText });
      return;
    }
    const data = await resp.json();
    const text = (data && data.candidates && data.candidates[0] &&
                  data.candidates[0].content && data.candidates[0].content.parts &&
                  data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) || '';
    res.status(200).json({ text });
  } catch (e) {
    console.warn('[gemini-proxy] network', e && e.message);
    res.status(500).json({ error: 'network_error', detail: String(e && e.message) });
  }
};
