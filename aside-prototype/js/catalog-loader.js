/*
 * MoyaCatalog — もやの森 β版 行動カタログ ローダー
 *
 * 役割:
 *   Google Sheets で公開された CSV を取得して
 *   ACTIONS（いっぽの行動カタログ）を上書きする。
 *
 * 設計方針:
 *   - キャッシュ優先（ファーストペイント高速化）
 *   - 取得・パース失敗時はバンドル既定値にfallback
 *   - 不正な行は warn してスキップ（1行壊れてても全体動かす）
 *   - mutation のみ（const ACTIONS の参照を保つ）
 *
 * 使い方 (index.html):
 *   ASIDE_CONFIG.actionCatalogUrl = 'https://docs.google.com/.../export?format=csv';
 *   MoyaCatalog.init({
 *     target: ACTIONS,
 *     url: ASIDE_CONFIG.actionCatalogUrl,
 *     onUpdate: () => render()
 *   });
 *
 * Sheets 列順（ACTIONS スキーマ・2026-05-06〜）:
 *   id / cat / icon / title / desc / time / technique / domains
 *   - domains は パイプ区切り（例: 'work|self|sleep'）
 *   - icon は 絵文字1〜2文字（任意）
 *   - 履歴: v1（〜2026-05-05）は ACTION_CATALOG 用スキーマだったが
 *           現行アプリは ACTIONS（いっぽ50項目）を使用しているため
 *           v2 で ACTIONS スキーマにリプレース
 */

(function (global) {
  'use strict';

  const CACHE_KEY = 'moyanomori_actions_cache_v2';   // v2: ACTIONS スキーマ
  const CACHE_FRESH_MS = 60 * 60 * 1000;
  const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

  // 推奨値域（厳格バリデーション）
  const VALID_CATS       = ['physical', 'cognitive', 'relax', 'assertion'];
  const VALID_DOMAINS    = ['work', 'self', 'sleep', 'relationship', 'future'];
  // 技法は CBT 拡張で増えうるため warning のみ・skip しない
  const KNOWN_TECHNIQUES = [
    '行動活性化', 'リラクセーション', 'マインドフルネス',
    '認知の外在化', '認知再構成', '下向き矢印法', 'ホット思考特定',
    '行動実験', '感情ラベリング',
    'アサーション準備', 'アサーション', 'アサーション計画'
  ];

  // ---- CSV parser (handles quoted fields, double-quote escaping, embedded commas/newlines) ----
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let inQuote = false;
    let i = 0;
    const len = text.length;
    while (i < len) {
      const ch = text[i];
      if (inQuote) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cell += '"'; i += 2; continue; }
          inQuote = false; i++;
        } else { cell += ch; i++; }
      } else {
        if (ch === '"') { inQuote = true; i++; }
        else if (ch === ',') { row.push(cell); cell = ''; i++; }
        else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; }
        else if (ch === '\r') { i++; }
        else { cell += ch; i++; }
      }
    }
    if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.length > 0 && !(r.length === 1 && r[0] === ''));
  }

  function rowsToObjects(rows) {
    if (rows.length < 2) return [];
    const header = rows[0].map(h => (h || '').trim());
    return rows.slice(1).map(cells => {
      const obj = {};
      header.forEach((h, idx) => { obj[h] = ((cells[idx] !== undefined ? cells[idx] : '')).trim(); });
      return obj;
    });
  }

  function splitPipe(s) {
    return (s || '').split('|').map(x => x.trim()).filter(x => x.length > 0);
  }

  function normalizeAction(o, lineNo) {
    const errors = [];
    const warnings = [];
    if (!o.id) errors.push(`L${lineNo}: id 必須`);
    if (!o.title) errors.push(`L${lineNo} (${o.id}): title 必須`);
    if (!o.desc) errors.push(`L${lineNo} (${o.id}): desc 必須`);
    if (!o.time) errors.push(`L${lineNo} (${o.id}): time 必須`);
    if (!o.cat || !VALID_CATS.includes(o.cat)) {
      errors.push(`L${lineNo} (${o.id}): cat 不正 "${o.cat}" — 許可値: ${VALID_CATS.join('/')}`);
    }
    if (!o.technique) {
      errors.push(`L${lineNo} (${o.id}): technique 必須`);
    } else if (!KNOWN_TECHNIQUES.includes(o.technique)) {
      // 既知でない技法は warn だが skip しない（CBT 技法拡張に対応）
      warnings.push(`L${lineNo} (${o.id}): technique 既知リスト外 "${o.technique}"（受け入れます）`);
    }
    const domains = splitPipe(o.domains);
    const invalidDomains = domains.filter(d => !VALID_DOMAINS.includes(d));
    if (invalidDomains.length > 0) {
      errors.push(`L${lineNo} (${o.id}): domains 不正 [${invalidDomains.join(',')}] — 許可値: ${VALID_DOMAINS.join('/')}`);
    }

    if (errors.length > 0) return { ok: false, errors, warnings };
    return {
      ok: true,
      warnings,
      action: {
        id: o.id,
        cat: o.cat,
        icon: o.icon || '',
        title: o.title,
        desc: o.desc,
        time: o.time,
        technique: o.technique,
        domains: domains
      }
    };
  }

  function validate(rawObjects) {
    const errors = [];
    const warnings = [];
    const validList = [];
    const seenIds = new Set();
    rawObjects.forEach((o, i) => {
      const lineNo = i + 2; // header=L1
      const r = normalizeAction(o, lineNo);
      (r.warnings || []).forEach(w => warnings.push(w));
      if (!r.ok) { errors.push.apply(errors, r.errors); return; }
      if (seenIds.has(r.action.id)) {
        errors.push(`L${lineNo} (${r.action.id}): id 重複`);
        return;
      }
      seenIds.add(r.action.id);
      validList.push(r.action);
    });
    return { errors, warnings, validList };
  }

  function loadFromCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const cached = JSON.parse(raw);
      if (!cached.fetchedAt || (Date.now() - cached.fetchedAt) > CACHE_MAX_AGE_MS) return null;
      return cached;
    } catch (e) { return null; }
  }

  function saveCache(actions) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        fetchedAt: Date.now(),
        actions: actions
      }));
    } catch (e) {}
  }

  function applyToCatalog(actions, target) {
    target.length = 0;
    actions.forEach(a => target.push(a));
  }

  async function fetchAndApply(url, target, onUpdate) {
    if (!url) return { skipped: true };
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) {
        console.warn('[MoyaCatalog] fetch failed:', res.status, res.statusText);
        return { failed: true, status: res.status };
      }
      const text = await res.text();
      const rows = parseCSV(text);
      const objs = rowsToObjects(rows);
      const { errors, warnings, validList } = validate(objs);
      if (warnings.length > 0) {
        console.warn('[MoyaCatalog] 警告 (' + warnings.length + '件、最初の3件):');
        warnings.slice(0, 3).forEach(w => console.warn('  -', w));
      }
      if (errors.length > 0) {
        console.warn('[MoyaCatalog] バリデーションエラー (' + errors.length + '件、最初の5件):');
        errors.slice(0, 5).forEach(e => console.warn('  -', e));
      }
      if (validList.length === 0) {
        console.warn('[MoyaCatalog] 有効な行が0件。既存カタログを維持します');
        return { failed: true, reason: 'no_valid_rows' };
      }
      applyToCatalog(validList, target);
      saveCache(validList);
      console.log('[MoyaCatalog] sheets から ' + validList.length + ' 件読み込み完了 (skip: ' + errors.length + ', warn: ' + warnings.length + ')');
      if (typeof onUpdate === 'function') onUpdate(validList);
      return { ok: true, count: validList.length, skipped: errors.length, warnings: warnings.length };
    } catch (e) {
      console.warn('[MoyaCatalog] fetch error:', e && e.message);
      return { failed: true, error: e && e.message };
    }
  }

  // Public API
  global.MoyaCatalog = {
    /**
     * 起動時に1回呼ぶ。
     * @param {object} opts
     * @param {Array}  opts.target  - 上書きされる ACTIONS の参照
     * @param {string} [opts.url]   - 公開Sheets CSVのURL。空ならバンドル既定値のまま
     * @param {Function} [opts.onUpdate] - 上書き完了時に呼ぶコールバック（再描画など）
     */
    init: function (opts) {
      opts = opts || {};
      const target = opts.target;
      const url = opts.url;
      if (!Array.isArray(target)) {
        console.warn('[MoyaCatalog] init: target 配列が必要');
        return;
      }
      if (!url) {
        // URL 未設定（運用前 / バンドル既定値で動作）
        console.log('[MoyaCatalog] actionCatalogUrl 未設定 — バンドル既定値で動作');
        return;
      }
      // 1. キャッシュ優先で即適用（オフライン耐性）
      const cached = loadFromCache();
      if (cached && cached.actions && cached.actions.length > 0) {
        applyToCatalog(cached.actions, target);
        const ageMin = Math.floor((Date.now() - cached.fetchedAt) / 60000);
        console.log('[MoyaCatalog] キャッシュから ' + cached.actions.length + ' 件適用 (' + ageMin + '分前)');
      }
      // 2. 裏で最新取得を試行
      fetchAndApply(url, target, opts.onUpdate);
    },

    // 手動リロード（管理画面などから）
    refresh: function (url, target, onUpdate) {
      return fetchAndApply(url, target, onUpdate);
    },

    // キャッシュクリア（デバッグ・初期化用）
    clearCache: function () {
      try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
      console.log('[MoyaCatalog] キャッシュをクリアしました');
    }
  };
})(typeof window !== 'undefined' ? window : this);
