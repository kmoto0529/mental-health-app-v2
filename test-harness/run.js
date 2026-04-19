#!/usr/bin/env node
/**
 * Aside API接続 検証ハーネス
 * アプリと同じリクエスト構造でGemini APIを叩き、エラー発生率を集計する
 */

const fs = require('fs');
const path = require('path');

// ---- 環境変数ロード ----
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('ERROR: .env ファイルが見つかりません。');
    console.error(`プロジェクトルート(${path.join(__dirname, '..')})に .env を作成し、以下を記載してください:`);
    console.error('  GEMINI_API_KEY=AIza...');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  });
  return env;
}

const env = loadEnv();
const API_KEY = env.GEMINI_API_KEY;
if (!API_KEY || !API_KEY.startsWith('AIza')) {
  console.error('ERROR: GEMINI_API_KEY が正しく設定されていません');
  process.exit(1);
}

const MODEL = env.GEMINI_MODEL || 'gemini-2.5-flash';
const ITERATIONS_PER_SCENARIO = parseInt(env.ITERATIONS || '8', 10);
const CONCURRENCY = parseInt(env.CONCURRENCY || '1', 10); // 1=直列, >1で並列
const INTER_CALL_DELAY_MS = parseInt(env.DELAY_MS || '500', 10);

// ---- アプリと同じリトライ実装 ----
async function fetchGeminiWithRetry(url, body, maxRetries = 5) {
  const retriableStatuses = [408, 429, 500, 502, 503, 504];
  let lastRes;
  let lastErr;
  const log = { attempts: [] };
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const start = Date.now();
    try {
      lastRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const elapsed = Date.now() - start;
      log.attempts.push({ attempt, status: lastRes.status, elapsed });
      if (lastRes.ok) return { res: lastRes, log };
      if (!retriableStatuses.includes(lastRes.status)) return { res: lastRes, log };
      if (attempt < maxRetries) {
        const base = 1500 * Math.pow(1.8, attempt);
        const jitter = Math.random() * 500;
        const delayMs = Math.min(20000, base + jitter);
        log.attempts[log.attempts.length - 1].delayAfter = Math.round(delayMs);
        await new Promise(r => setTimeout(r, delayMs));
      }
    } catch (netErr) {
      lastErr = netErr;
      const elapsed = Date.now() - start;
      log.attempts.push({ attempt, error: netErr.message, elapsed });
      if (attempt === maxRetries) throw netErr;
      const base = 1500 * Math.pow(1.8, attempt);
      const jitter = Math.random() * 500;
      const delayMs = Math.min(20000, base + jitter);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return { res: lastRes, log };
}

// ---- 各シナリオのリクエスト構築 ----
const SYSTEM_PROMPT_CHAT = `あなたは「Aside」— ユーザーにとって親でも先生でもない「少し年上の頼れる先輩」のような存在です。
丁寧語をベースに、やわらかく砕けた表現を少し混ぜる。
1回の返答は3文以内。質問は1回に1つだけ。
聞く8割、話す2割。感情を否定しない。`;

const SYSTEM_PROMPT_ALT = `あなたは、ユーザーが書いた出来事と気持ちに対して、「別の捉え方」を3つ、やさしく提案する役割のアシスタントです。
断定せず、「〜かもしれません」「〜とも考えられます」のような柔らかい表現を使う。
各提案は独立した別の角度から。過度な楽観論はNG。`;

function scenarioChatInitial() {
  return {
    name: 'chat_initial',
    url: `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    body: {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT_CHAT }] },
      contents: [{ role: 'user', parts: [{ text: 'ユーザー名: テストユーザー\n今日のきもちチェック: ふつう（3/5）\n\nこれが対話の始まりです。テストユーザーに、やさしく声をかけて最初のメッセージを送ってください。' }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            choices: { type: 'array', items: { type: 'string' } }
          },
          required: ['message', 'choices']
        },
        temperature: 0.9,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingBudget: 0 }
      }
    }
  };
}

function scenarioChatRally() {
  const history = [
    { role: 'user', parts: [{ text: 'なんか疲れた。' }] },
    { role: 'model', parts: [{ text: 'そうなんですね、今日もお疲れさま。\nどんな疲れでしょうか？' }] },
    { role: 'user', parts: [{ text: '人と話しすぎた気がする。' }] },
    { role: 'model', parts: [{ text: '人と話すのって、思ってるより体力使いますよね。\nどんな場面で一番疲れましたか？' }] },
    { role: 'user', parts: [{ text: 'ミーティングがずっと続いてた。' }] }
  ];
  return {
    name: 'chat_rally',
    url: `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    body: {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT_CHAT }] },
      contents: history,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            choices: { type: 'array', items: { type: 'string' } }
          },
          required: ['message', 'choices']
        },
        temperature: 0.9,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingBudget: 0 }
      }
    }
  };
}

function scenarioAltFirst() {
  return {
    name: 'alt_first',
    url: `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    body: {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT_ALT }] },
      contents: [{ role: 'user', parts: [{ text: `【出来事】
上司から提出したレポートに細かく修正指示を受けた

【そのとき自然と浮かんだ考え】
自分はやっぱり仕事ができない、また失敗した

【そのときの感情】
落ち込み（強さ 7/10）

上記について、別の捉え方を3つ提案してください。` }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            alternatives: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  tag: { type: 'string' },
                  text: { type: 'string' }
                },
                required: ['tag', 'text']
              }
            }
          },
          required: ['alternatives']
        },
        temperature: 0.9,
        maxOutputTokens: 2400,
        thinkingConfig: { thinkingBudget: 0 }
      }
    }
  };
}

function scenarioAltRegen() {
  const prevAlts = [
    { tag: '事実を見る', text: '修正指示は改善機会かもしれません。' },
    { tag: '視点を変える', text: '同じ状況の友達がいたら何と声をかけますか。' },
    { tag: '小さな一歩', text: '今回の指摘を1つだけ次回に活かすこともできそうです。' }
  ];
  const prevBlock = `\n\n【すでに提案済み（これとは違う角度で、重複しないように）】\n${prevAlts.map((a, i) => `${i + 1}. [${a.tag}] ${a.text}`).join('\n')}`;
  return {
    name: 'alt_regen',
    url: `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    body: {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT_ALT }] },
      contents: [{ role: 'user', parts: [{ text: `【出来事】
上司から提出したレポートに細かく修正指示を受けた

【そのとき自然と浮かんだ考え】
自分はやっぱり仕事ができない、また失敗した

【そのときの感情】
落ち込み（強さ 7/10）

上記について、別の捉え方を3つ提案してください。${prevBlock}` }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            alternatives: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  tag: { type: 'string' },
                  text: { type: 'string' }
                },
                required: ['tag', 'text']
              }
            }
          },
          required: ['alternatives']
        },
        temperature: 0.9,
        maxOutputTokens: 2400,
        thinkingConfig: { thinkingBudget: 0 }
      }
    }
  };
}

const SCENARIOS = [scenarioChatInitial, scenarioChatRally, scenarioAltFirst, scenarioAltRegen];

// ---- 1回のテスト実行 ----
async function runOne(scenario, iterIdx) {
  const startTs = Date.now();
  let result = { scenario: scenario.name, iteration: iterIdx, startTs };
  try {
    const { res, log } = await fetchGeminiWithRetry(scenario.url, scenario.body);
    const totalMs = Date.now() - startTs;
    result.totalMs = totalMs;
    result.attemptCount = log.attempts.length;
    result.finalStatus = res.status;
    result.retriesUsed = log.attempts.length - 1;
    result.statusSequence = log.attempts.map(a => a.status || `ERR:${a.error}`).join(' → ');

    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        result.success = false;
        result.failReason = 'empty_response';
        result.errorDetail = JSON.stringify(data).slice(0, 300);
      } else {
        try {
          JSON.parse(text);
          result.success = true;
          result.outputTokens = data.usageMetadata?.candidatesTokenCount;
          result.inputTokens = data.usageMetadata?.promptTokenCount;
        } catch (e) {
          result.success = false;
          result.failReason = 'json_parse_error';
          result.errorDetail = `${e.message}: ${text.slice(0, 200)}`;
        }
      }
    } else {
      const errText = await res.text();
      result.success = false;
      result.failReason = `http_${res.status}`;
      result.errorDetail = errText.slice(0, 300);
    }
  } catch (err) {
    result.success = false;
    result.failReason = 'network_error';
    result.errorDetail = err.message;
    result.totalMs = Date.now() - startTs;
  }
  return result;
}

// ---- メイン ----
async function main() {
  console.log('=== Aside API 検証ハーネス ===');
  console.log(`モデル: ${MODEL}`);
  console.log(`シナリオ: ${SCENARIOS.length}種類 × ${ITERATIONS_PER_SCENARIO}回 = ${SCENARIOS.length * ITERATIONS_PER_SCENARIO}コール`);
  console.log(`並列度: ${CONCURRENCY}, インターバル: ${INTER_CALL_DELAY_MS}ms`);
  console.log(`推定コスト: ~¥${Math.round(SCENARIOS.length * ITERATIONS_PER_SCENARIO * 0.5)}\n`);

  const results = [];
  let completed = 0;
  const totalCalls = SCENARIOS.length * ITERATIONS_PER_SCENARIO;

  for (let i = 0; i < ITERATIONS_PER_SCENARIO; i++) {
    for (const scenarioFn of SCENARIOS) {
      const scenario = scenarioFn();
      const r = await runOne(scenario, i);
      results.push(r);
      completed++;
      const statusIcon = r.success ? '✓' : '✗';
      const retryNote = r.retriesUsed > 0 ? ` (${r.retriesUsed}回リトライ)` : '';
      const failNote = r.success ? '' : ` [${r.failReason}]`;
      console.log(`[${completed}/${totalCalls}] ${statusIcon} ${r.scenario.padEnd(14)} ${r.totalMs}ms ${r.statusSequence}${retryNote}${failNote}`);
      if (completed < totalCalls && INTER_CALL_DELAY_MS > 0) {
        await new Promise(r => setTimeout(r, INTER_CALL_DELAY_MS));
      }
    }
  }

  // ---- サマリ出力 ----
  console.log('\n=== サマリ ===');
  const byScenario = {};
  results.forEach(r => {
    if (!byScenario[r.scenario]) byScenario[r.scenario] = [];
    byScenario[r.scenario].push(r);
  });

  for (const [name, rs] of Object.entries(byScenario)) {
    const success = rs.filter(r => r.success).length;
    const total = rs.length;
    const avgMs = Math.round(rs.reduce((s, r) => s + r.totalMs, 0) / total);
    const avgRetries = (rs.reduce((s, r) => s + (r.retriesUsed || 0), 0) / total).toFixed(2);
    const errors = rs.filter(r => !r.success).map(r => r.failReason);
    const errorCount = {};
    errors.forEach(e => errorCount[e] = (errorCount[e] || 0) + 1);
    console.log(`${name.padEnd(14)} 成功 ${success}/${total} (${Math.round(success/total*100)}%)  平均${avgMs}ms  平均リトライ${avgRetries}回  エラー: ${JSON.stringify(errorCount)}`);
  }

  const overall = results.filter(r => r.success).length / results.length;
  console.log(`\n全体成功率: ${Math.round(overall * 100)}% (${results.filter(r => r.success).length}/${results.length})`);

  // トークン使用量
  const totalInTokens = results.reduce((s, r) => s + (r.inputTokens || 0), 0);
  const totalOutTokens = results.reduce((s, r) => s + (r.outputTokens || 0), 0);
  const estCost = totalInTokens * 0.30 / 1000000 + totalOutTokens * 2.50 / 1000000;
  console.log(`入力トークン: ${totalInTokens.toLocaleString()}, 出力トークン: ${totalOutTokens.toLocaleString()}, 推定コスト: $${estCost.toFixed(4)} (≈¥${Math.round(estCost * 150)})`);

  // エラーサンプル表示
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.log(`\n=== 失敗サンプル（最大5件） ===`);
    failures.slice(0, 5).forEach(f => {
      console.log(`\n[${f.scenario} #${f.iteration}] ${f.failReason}`);
      console.log(`  シーケンス: ${f.statusSequence}`);
      console.log(`  詳細: ${f.errorDetail?.slice(0, 200)}`);
    });
  }

  // 結果を保存
  const outDir = path.join(__dirname, '..', 'test-results');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
  const outFile = path.join(outDir, `${stamp}.json`);
  fs.writeFileSync(outFile, JSON.stringify({
    meta: { model: MODEL, iterations: ITERATIONS_PER_SCENARIO, concurrency: CONCURRENCY, delayMs: INTER_CALL_DELAY_MS, startedAt: new Date(results[0].startTs).toISOString() },
    summary: { overall, byScenario: Object.fromEntries(Object.entries(byScenario).map(([k, v]) => [k, { success: v.filter(r => r.success).length, total: v.length, avgMs: Math.round(v.reduce((s, r) => s + r.totalMs, 0) / v.length) }])), totalInTokens, totalOutTokens, estCostUSD: estCost },
    results
  }, null, 2));
  console.log(`\n結果保存: ${outFile}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
