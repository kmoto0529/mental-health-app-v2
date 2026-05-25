// もやの森β: 改善要望フォーム → 社長メール送信（Resend経由）
//
// 必須環境変数:
//   RESEND_API_KEY        Resend API キー
//
// 任意:
//   FEEDBACK_TO_EMAIL     送信先（未指定なら kmoto0529@gmail.com）
//   FEEDBACK_FROM_EMAIL   送信元（未指定なら onboarding@resend.dev = Resend共有ドメイン）

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const TO_EMAIL = process.env.FEEDBACK_TO_EMAIL || 'kmoto0529@gmail.com';
const FROM_EMAIL = process.env.FEEDBACK_FROM_EMAIL || 'もやの森β <onboarding@resend.dev>';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = async (req, res) => {
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

  if (!RESEND_API_KEY) {
    res.status(500).json({ error: 'server_misconfigured', detail: 'RESEND_API_KEY not set' });
    return;
  }

  const body = req.body || {};
  const text = (body.text || '').toString().trim();
  if (!text) {
    res.status(400).json({ error: 'text_required' });
    return;
  }
  if (text.length > 4000) {
    res.status(400).json({ error: 'text_too_long' });
    return;
  }

  const category = (body.category || 'other').toString().slice(0, 32);
  const userId = (body.userId || 'unknown').toString().slice(0, 64);
  const nickname = (body.nickname || '').toString().slice(0, 64);
  const screen = (body.screen || '-').toString().slice(0, 64);
  const appVersion = (body.appVersion || '-').toString().slice(0, 32);
  const userAgent = (req.headers['user-agent'] || '-').toString().slice(0, 256);

  const subject = `[もやの森β] 改善要望 / ${category}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 640px;">
      <h2 style="color: #4a6741; margin-bottom: 16px;">改善要望が届きました</h2>
      <table style="border-collapse: collapse; width: 100%; margin-bottom: 16px;">
        <tr><td style="padding: 6px 10px; background: #f5f7f1; width: 140px;">カテゴリ</td><td style="padding: 6px 10px;">${escapeHtml(category)}</td></tr>
        <tr><td style="padding: 6px 10px; background: #f5f7f1;">匿名ID</td><td style="padding: 6px 10px; font-family: monospace; font-size: 12px;">${escapeHtml(userId)}</td></tr>
        <tr><td style="padding: 6px 10px; background: #f5f7f1;">ニックネーム</td><td style="padding: 6px 10px;">${escapeHtml(nickname || '-')}</td></tr>
        <tr><td style="padding: 6px 10px; background: #f5f7f1;">画面</td><td style="padding: 6px 10px;">${escapeHtml(screen)}</td></tr>
        <tr><td style="padding: 6px 10px; background: #f5f7f1;">バージョン</td><td style="padding: 6px 10px;">${escapeHtml(appVersion)}</td></tr>
        <tr><td style="padding: 6px 10px; background: #f5f7f1;">User-Agent</td><td style="padding: 6px 10px; font-size: 11px; color: #888;">${escapeHtml(userAgent)}</td></tr>
      </table>
      <h3 style="color: #4a6741; margin: 16px 0 8px;">内容</h3>
      <pre style="white-space: pre-wrap; font-family: inherit; font-size: 14px; line-height: 1.7; background: #fafaf6; padding: 14px 16px; border-radius: 8px; border-left: 4px solid #9bb89f;">${escapeHtml(text)}</pre>
    </div>
  `;

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        subject,
        html,
        reply_to: TO_EMAIL,
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      console.warn('[feedback] resend', resp.status, errText);
      res.status(resp.status).json({ error: 'resend_error', status: resp.status, detail: errText });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    console.warn('[feedback] network', e && e.message);
    res.status(500).json({ error: 'network_error', detail: String(e && e.message) });
  }
};
