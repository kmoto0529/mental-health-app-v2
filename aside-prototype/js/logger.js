/*
 * MoyaLogger — もやの森 (ひといき) β版 ログSDK
 *
 * 役割:
 *   - 匿名ID発行・localStorage保存
 *   - Supabaseへ fire-and-forget でイベント送信
 *   - セッション管理（30分無操作で新セッション）
 *   - JSエラー自動捕捉
 *
 * 設計方針: 落ちても UI を止めない。失敗は console.warn に出すのみ。
 *
 * 使い方 (index.html に以下を追加):
 *   <script>
 *     window.ASIDE_CONFIG = {
 *       supabaseUrl: 'https://xxxxx.supabase.co',
 *       supabaseAnonKey: 'eyJ...',
 *       appVersion: '0.1.0-beta.1',
 *       consentVersion: 'v0.1-beta'
 *     };
 *   </script>
 *   <script src="js/logger.js"></script>
 *
 *   // 同意取得後に:
 *   MoyaLogger.init();
 */

(function (global) {
  'use strict';

  const LS_KEY = {
    USER_ID:         'aside_user_id',
    SESSION_ID:      'aside_session_id',
    SESSION_LAST:    'aside_session_last_activity',
    CONSENT:         'aside_consent_version'
  };
  const SESSION_IDLE_MINUTES = 30;

  let cfg = null;
  let initialized = false;
  let active = false;   // 同意取得後に true。false の間はネットワーク送信しない
  let userReadyPromise = Promise.resolve();  // user row がDBに存在することを保証するPromise

  // ----- utilities -----
  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    // fallback (RFC4122 v4)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function detectPlatform() {
    const ua = (global.navigator && global.navigator.userAgent) || '';
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
    const isChrome = /Chrome/.test(ua);
    if (isIOS && isSafari) return 'ios-safari';
    if (isIOS && isChrome) return 'ios-chrome';
    if (isIOS)             return 'ios-other';
    if (isAndroid)         return 'android-' + (isChrome ? 'chrome' : 'other');
    return 'web-' + (isChrome ? 'chrome' : isSafari ? 'safari' : 'other');
  }

  function nowISO() { return new Date().toISOString(); }

  // fire-and-forget REST call to Supabase（INSERT専用。更新系は supabaseRpc を使う）
  // POST on tables other than 'users' waits for user row を保証する Promise
  function supabaseRequest(method, path, body, params) {
    if (!cfg || !active) return Promise.resolve();

    // POST /users 自身は待たない（それが user 作成本体だから）
    // それ以外は userReadyPromise 完了まで待つ（FK制約のため user row が先に必要）
    const waitForUser = !(method === 'POST' && path === 'users');

    const doRequest = () => {
      let url = cfg.supabaseUrl + '/rest/v1/' + path;
      if (params) url += '?' + params;
      return fetch(url, {
        method: method,
        headers: {
          'apikey':        cfg.supabaseAnonKey,
          'Authorization': 'Bearer ' + cfg.supabaseAnonKey,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal'
        },
        body: body ? JSON.stringify(body) : undefined,
        keepalive: true
      }).then((res) => {
        if (!res.ok) {
          console.warn('[MoyaLogger]', method, path, res.status, res.statusText);
        }
        return null;  // return=minimal なので body は読まない
      }).catch((err) => {
        console.warn('[MoyaLogger] network error:', err && err.message);
        return null;
      });
    };

    return waitForUser ? userReadyPromise.then(doRequest) : doRequest();
  }

  // fire-and-forget RPC call to Supabase（SECURITY DEFINER 関数経由でRLSバイパス更新）
  // anon は users/sessions/action_log を直接 UPDATE できない（SELECTポリシー無し→0行更新）ため、
  // 更新系は必ずこの RPC を通す。user row 作成を待ってから呼ぶ。
  function supabaseRpc(fnName, params) {
    if (!cfg || !active) return Promise.resolve();
    const doRequest = () => {
      return fetch(cfg.supabaseUrl + '/rest/v1/rpc/' + fnName, {
        method: 'POST',
        headers: {
          'apikey':        cfg.supabaseAnonKey,
          'Authorization': 'Bearer ' + cfg.supabaseAnonKey,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal'
        },
        body: JSON.stringify(params || {}),
        keepalive: true
      }).then((res) => {
        if (!res.ok) console.warn('[MoyaLogger] rpc', fnName, res.status, res.statusText);
        return null;
      }).catch((err) => {
        console.warn('[MoyaLogger] rpc network error:', err && err.message);
        return null;
      });
    };
    return userReadyPromise.then(doRequest);
  }

  function commonFields() {
    return {
      app_version: cfg.appVersion,
      platform:    cfg.platform
    };
  }

  // ----- User ID management -----
  function getOrCreateUserId() {
    let id = localStorage.getItem(LS_KEY.USER_ID);
    if (id) return { userId: id, isNew: false };
    id = uuid();
    localStorage.setItem(LS_KEY.USER_ID, id);
    return { userId: id, isNew: true };
  }

  function createUserRow(userId) {
    return supabaseRequest('POST', 'users', {
      user_id:                userId,
      first_seen_app_version: cfg.appVersion,
      first_seen_platform:    cfg.platform,
      first_seen_user_agent:  (global.navigator && global.navigator.userAgent) || ''
    });
  }

  // ----- Session management -----
  function isSessionExpired() {
    const lastStr = localStorage.getItem(LS_KEY.SESSION_LAST);
    if (!lastStr) return true;
    const last = new Date(lastStr).getTime();
    return (Date.now() - last) > SESSION_IDLE_MINUTES * 60 * 1000;
  }

  function touchSession() {
    localStorage.setItem(LS_KEY.SESSION_LAST, nowISO());
  }

  function getSessionId() {
    return localStorage.getItem(LS_KEY.SESSION_ID);
  }

  function startSession(opts) {
    opts = opts || {};
    const sessionId = uuid();
    localStorage.setItem(LS_KEY.SESSION_ID, sessionId);
    touchSession();
    const body = Object.assign({
      session_id:  sessionId,
      user_id:     cfg.userId,
      entry_point: opts.entryPoint || 'direct',
      mood_before: opts.moodBefore == null ? null : opts.moodBefore,
      user_agent:  (global.navigator && global.navigator.userAgent) || ''
    }, commonFields());
    supabaseRequest('POST', 'sessions', body);
    return sessionId;
  }

  function endSession(opts) {
    opts = opts || {};
    const sessionId = getSessionId();
    if (!sessionId) return;
    supabaseRpc('end_session', {
      p_session_id: sessionId,
      p_mood_after: opts.moodAfter == null ? null : opts.moodAfter
    });
  }

  function ensureActiveSession() {
    if (!active) return null;
    if (!getSessionId() || isSessionExpired()) {
      return startSession({ entryPoint: 'resumed' });
    }
    touchSession();
    return getSessionId();
  }

  // 同意取得後にUser/Sessionの初回作成を行う
  function activate() {
    if (active) return;
    active = true;
    const userRowCreatedKey = 'aside_user_row_created';
    const alreadyCreated = localStorage.getItem(userRowCreatedKey) === '1';

    // user row を作成する Promise。以降の非-users POST はこれを待つ
    if (!alreadyCreated) {
      userReadyPromise = createUserRow(cfg.userId).then(() => {
        localStorage.setItem(userRowCreatedKey, '1');
      });
    }
    // user row が保証されたらセッション開始（これも userReadyPromise 経由で順序担保される）
    if (!getSessionId() || isSessionExpired()) {
      startSession({ entryPoint: 'direct' });
    } else {
      touchSession();
    }
  }

  // ----- Event APIs (public) -----
  const api = {

    init: function (configOverride) {
      if (initialized) return api;
      const c = Object.assign({}, global.ASIDE_CONFIG || {}, configOverride || {});
      if (!c.supabaseUrl || !c.supabaseAnonKey) {
        console.warn('[MoyaLogger] ASIDE_CONFIG.supabaseUrl / supabaseAnonKey が未設定。ログは送信されません。');
        return api;
      }
      cfg = {
        supabaseUrl:     c.supabaseUrl.replace(/\/$/, ''),
        supabaseAnonKey: c.supabaseAnonKey,
        appVersion:      c.appVersion || 'unknown',
        consentVersion:  c.consentVersion || 'v0.1-beta',
        platform:        detectPlatform(),
        userId:          null
      };
      const u = getOrCreateUserId();
      cfg.userId = u.userId;

      // JSエラーを自動捕捉（active 時のみ送信される）
      global.addEventListener('error', function (e) {
        api.error(e.error || e.message, { screen: api.currentScreen, url: global.location && global.location.href });
      });
      global.addEventListener('unhandledrejection', function (e) {
        api.error(e.reason, { screen: api.currentScreen, url: global.location && global.location.href, kind: 'unhandledrejection' });
      });
      global.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') touchSession();
        if (document.visibilityState === 'visible') ensureActiveSession();
      });

      initialized = true;

      // 既に同意済みなら即 active 化
      if (api.hasConsent()) {
        activate();
      }
      return api;
    },

    isInitialized: function () { return initialized; },
    getUserId:     function () { return cfg && cfg.userId; },
    getSessionId:  getSessionId,

    // 同意取得（初回同意モーダルでボタン押下時）
    recordConsent: function () {
      if (!cfg) return;
      localStorage.setItem(LS_KEY.CONSENT, cfg.consentVersion);
      activate(); // user / session row を作成 & 以降の送信を有効化
      // 少し遅延して consent_at を埋める（user row 作成完了後）
      setTimeout(function () {
        supabaseRpc('record_consent', {
          p_user_id:         cfg.userId,
          p_consent_version: cfg.consentVersion
        });
        api.event('consent_given', { version: cfg.consentVersion });
      }, 400);
    },
    hasConsent: function () {
      return !!localStorage.getItem(LS_KEY.CONSENT);
    },

    // プロフィールを user row に紐づけて保存（オンボーディングのプロフィール確定時に呼ぶ）
    // 渡されたキーのみ更新（部分更新可）。空文字は null として保存する。
    setProfile: function (profile) {
      if (!initialized || !cfg || !profile) return;
      supabaseRpc('set_user_profile', {
        p_user_id:    cfg.userId,
        p_nickname:   ('nickname'   in profile) ? (profile.nickname   || null) : null,
        p_occupation: ('occupation' in profile) ? (profile.occupation || null) : null,
        p_age_range:  ('ageRange'   in profile) ? (profile.ageRange   || null) : null,
        p_gender:     ('gender'     in profile) ? (profile.gender     || null) : null
      });
    },

    // 招待コード（配布コード）を匿名IDに紐づけて保存 — 配布ルート分析用
    setInviteCode: function (code) {
      if (!initialized || !cfg || !code) return;
      supabaseRpc('set_invite_code', { p_user_id: cfg.userId, p_invite_code: String(code) });
    },

    // ----- コンテンツ進捗（どのコンテンツを選び・どこまで進めたか） -----
    // app_events に INSERT（更新系ではないので確実に飛ぶ）。
    contentOpen: function (content, tab) {
      api.event('content_open', { content: content, tab: tab });
    },
    contentStep: function (content, tab, step, total, label) {
      api.event('content_step', { content: content, tab: tab, step: step, total: total, label: label });
    },
    contentDone: function (content, tab) {
      api.event('content_done', { content: content, tab: tab });
    },

    // 明示的に新セッションを開始したい場合（例: 長時間戻ってきた時）
    startNewSession: function (opts) {
      if (!initialized) return null;
      // 既存セッションを閉じる
      endSession({ moodAfter: opts && opts.moodAfter });
      return startSession(opts || {});
    },

    // セッション前後の mood_before / mood_after を後から埋める
    setSessionMoodBefore: function (level) {
      const sid = getSessionId();
      if (!sid) return;
      supabaseRpc('set_session_mood', { p_session_id: sid, p_mood_before: level });
    },
    setSessionMoodAfter: function (level) {
      const sid = getSessionId();
      if (!sid) return;
      supabaseRpc('set_session_mood', { p_session_id: sid, p_mood_after: level });
    },

    // 気持ちチェック記録
    logEmotion: function (level, note) {
      if (!initialized) return;
      ensureActiveSession();
      supabaseRequest('POST', 'emotion_log', Object.assign({
        user_id:       cfg.userId,
        session_id:    getSessionId(),
        emotion_level: level,
        note:          note || null
      }, commonFields()));
    },

    // 行動開始 → action_log.id を返す（完了時に使う）
    // id はクライアント側で生成し、そのまま返す（return=minimal 運用のため）
    startAction: function (args) {
      if (!initialized) return Promise.resolve(null);
      ensureActiveSession();
      const logId = uuid();
      const body = Object.assign({
        id:                     logId,
        user_id:                cfg.userId,
        session_id:             getSessionId(),
        action_id:              args.actionId,
        theme_id:               args.themeId || null,
        action_execution_type:  args.type,
        difficulty:             args.difficulty || null,
        status:                 'started'
      }, commonFields());
      supabaseRequest('POST', 'action_log', body);
      return Promise.resolve(logId);
    },

    // 行動完了 / 放棄
    completeAction: function (actionLogId, args) {
      if (!initialized || !actionLogId) return;
      args = args || {};
      supabaseRpc('complete_action', {
        p_id:             actionLogId,
        p_status:         args.status || 'done',
        p_memo_text:      args.memoText || null,
        p_selected_value: args.selectedValue || null,
        p_ai_session_id:  args.aiSessionId || null,
        p_reaction:       args.reaction || null
      });
    },

    // 行動後リアクション（完了後、別画面で取得する場合）
    setActionReaction: function (actionLogId, reaction) {
      if (!initialized || !actionLogId) return;
      supabaseRpc('set_action_reaction', { p_id: actionLogId, p_reaction: reaction });
    },

    // 汎用イベント（画面遷移・ボタン押下・任意のログ）
    currentScreen: null,
    screenView: function (screenName, extra) {
      api.currentScreen = screenName;
      api.event('screen_view', Object.assign({ screen: screenName }, extra || {}));
    },

    event: function (eventType, payload) {
      if (!initialized) return;
      ensureActiveSession();
      supabaseRequest('POST', 'app_events', Object.assign({
        user_id:    cfg.userId,
        session_id: getSessionId(),
        event_type: eventType,
        payload:    payload || {}
      }, commonFields()));
    },

    error: function (err, context) {
      if (!initialized) return;
      const msg = err && err.message ? err.message : String(err);
      const stack = err && err.stack ? err.stack : null;
      supabaseRequest('POST', 'app_events', Object.assign({
        user_id:    cfg.userId,
        session_id: getSessionId(),
        event_type: 'error',
        payload:    Object.assign({ message: msg, stack: stack }, context || {})
      }, commonFields()));
    }
  };

  global.MoyaLogger = api;

})(typeof window !== 'undefined' ? window : this);
