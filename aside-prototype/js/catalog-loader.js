/*
 * AsideCatalog — Aside β版 行動カタログ ローダー
 *
 * 役割:
 *   Google Sheets で公開された CSV を取得して
 *   ACTION_CATALOG を上書きする。
 *
 * 設計方針:
 *   - キャッシュ優先（ファーストペイント高速化）
 *   - 取得・パース失敗時はバンドル既定値にfallback
 *   - 不正な行は warn してスキップ（1行壊れてても全体動かす）
 *   - mutation のみ（const ACTION_CATALOG の参照を保つ）
 *
 * 使い方 (index.html):
 *   ASIDE_CONFIG.actionCatalogUrl = 'https://docs.google.com/.../pub?output=csv';
 *   AsideCatalog.init({
 *     target: ACTION_CATALOG,
 *     url: ASIDE_CONFIG.actionCatalogUrl,
 *     onUpdate: () => render()
 *   });
 *
 * Sheets 列順:
 *   id / title / desc / type / difficulty / duration / category / goalKeys / states / ctaAct
 *   - goalKeys / states は パイプ区切り（例: 'calm|mixed|heavy'）
 */

(function (global) {
  'use strict';

  const CACHE_KEY = 'aside_catalog_cache_v1';
  const CACHE_FRESH_MS = 60 * 60 * 1000;        // 1h以内のキャッシュは「新鮮」（fetch成功してもネット送らない選択肢として用意）
  const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7日超は無視

  const VALID_TYPES        = ['app', 'daily', 'social'];
  const VALID_DIFFICULTIES = ['easy', 'normal', 'bold'];
  const VALID_STATES       = ['calm', 'mixed', 'heavy'];
  const VALID_GOALS        = ['organize_feelings', 'reduce_overthinking', 'understand_my_feelings', 'have_place_to_rely', 'not_sure_yet'];
  const VALID_CATEGORIES   = ['A','B','C','D','E','F','G','H'];

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
    // 空行を捨てる
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
    if (!o.id) errors.push(`L${lineNo}: id 必須`);
    if (!o.title) errors.push(`L${lineNo} (${o.id}): title 必須`);
    if (!o.type || !VALID_TYPES.includes(o.type)) errors.push(`L${lineNo} (${o.id}): type 不正 "${o.type}"`);
    if (!o.difficulty || !VALID_DIFFICULTIES.includes(o.difficulty)) errors.push(`L${lineNo} (${o.id}): difficulty 不正 "${o.difficulty}"`);
    const duration = parseInt(o.duration, 10);
    if (isNaN(duration)) errors.push(`L${lineNo} (${o.id}): duration が数値じゃない "${o.duration}"`);
    if (!o.category || !VALID_CATEGORIES.includes(o.category)) errors.push(`L${lineNo} (${o.id}): category 不正 "${o.category}"`);
    const goalKeys = splitPipe(o.goalKeys);
    const invalidGoals = goalKeys.filter(g => !VALID_GOALS.includes(g));
    if (invalidGoals.length > 0) errors.push(`L${lineNo} (${o.id}): goalKeys 不正 [${invalidGoals.join(',')}]`);
    const states = splitPipe(o.states);
    const invalidStates = states.filter(s => !VALID_STATES.includes(s));
    if (invalidStates.length > 0) errors.push(`L${lineNo} (${o.id}): states 不正 [${invalidStates.join(',')}]`);

    if (errors.length > 0) return { ok: false, errors };
    return {
      ok: true,
      action: {
        id: o.id,
        title: o.title,
        desc: o.desc || '',
        type: o.type,
        difficulty: o.difficulty,
        duration: duration,
        category: o.category,
        goalKeys: goalKeys,
        states: states,
        ctaAct: o.ctaAct ? o.ctaAct : null
      }
    };
  }

  function validate(rawObjects) {
    const errors = [];
    const validList = [];
    const seenIds = new Set();
    rawObjects.forEach((o, i) => {
      const lineNo = i + 2; // header=L1
      const r = normalizeAction(o, lineNo);
      if (!r.ok) { errors.push.apply(errors, r.errors); return; }
      if (seenIds.has(r.action.id)) {
        errors.push(`L${lineNo} (${r.action.id}): id 重複`);
        return;
      }
      seenIds.add(r.action.id);
      validList.push(r.action);
    });
    return { errors, validList };
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
        console.warn('[AsideCatalog] fetch failed:', res.status, res.statusText);
        return { failed: true, status: res.status };
      }
      const text = await res.text();
      const rows = parseCSV(text);
      const objs = rowsToObjects(rows);
      const { errors, validList } = validate(objs);
      if (errors.length > 0) {
        console.warn('[AsideCatalog] バリデーションエラー (' + errors.length + '件、最初の5件表示):');
        errors.slice(0, 5).forEach(e => console.warn('  -', e));
      }
      if (validList.length === 0) {
        console.warn('[AsideCatalog] 有効な行が0件。既存カタログを維持します');
        return { failed: true, reason: 'no_valid_rows' };
      }
      applyToCatalog(validList, target);
      saveCache(validList);
      console.log('[AsideCatalog] sheets から ' + validList.length + ' 件読み込み完了 (skip: ' + errors.length + ')');
      if (typeof onUpdate === 'function') onUpdate(validList);
      return { ok: true, count: validList.length, skipped: errors.length };
    } catch (e) {
      console.warn('[AsideCatalog] fetch error:', e && e.message);
      return { failed: true, error: e && e.message };
    }
  }

  // Public API
  global.AsideCatalog = {
    /**
     * 起動時に1回呼ぶ。
     * @param {object} opts
     * @param {Array}  opts.target  - 上書きされる ACTION_CATALOG の参照
     * @param {string} [opts.url]   - 公開Sheets CSVのURL。空ならバンドル既定値のまま
     * @param {Function} [opts.onUpdate] - 上書き完了時に呼ぶコールバック（再描画など）
     */
    init: function (opts) {
      opts = opts || {};
      const target = opts.target;
      const url = opts.url;
      if (!Array.isArray(target)) {
        console.warn('[AsideCatalog] init: target 配列が必要');
        return;
      }
      // 1. キャッシュ優先で即適用（オフライン耐性）
      const cached = loadFromCache();
      if (cached && cached.actions && cached.actions.length > 0) {
        applyToCatalog(cached.actions, target);
        const ageMin = Math.floor((Date.now() - cached.fetchedAt) / 60000);
        console.log('[AsideCatalog] キャッシュから ' + cached.actions.length + ' 件適用 (' + ageMin + '分前)');
      }
      // 2. 裏で最新取得を試行
      if (url) {
        fetchAndApply(url, target, opts.onUpdate);
      }
    },

    // 手動リロード（管理画面などから）
    refresh: function (url, target, onUpdate) {
      return fetchAndApply(url, target, onUpdate);
    }
  };
})(typeof window !== 'undefined' ? window : this);
