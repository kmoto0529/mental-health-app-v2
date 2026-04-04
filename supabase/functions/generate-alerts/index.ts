// きもちチェック — アラート自動生成バッチ
// Supabase Edge Function (Deno)
// 毎日 AM 2:00 JST (17:00 UTC) に実行

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SECRET = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY  = Deno.env.get('RESEND_API_KEY') ?? '';

const sb = createClient(SUPABASE_URL, SUPABASE_SECRET);

Deno.serve(async () => {
  try {
    const result = await runBatch();
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});

async function runBatch() {
  const today = new Date().toISOString().slice(0, 10);
  const day7ago  = daysAgo(7);
  const day30ago = daysAgo(30);

  // 全学生を取得
  const { data: students } = await sb.from('students').select('id, class_id');
  if (!students?.length) return { processed: 0 };

  let created = 0;

  for (const student of students) {
    const sid = student.id;

    // 直近7日の気分記録
    const { data: moods7 } = await sb
      .from('mood_records')
      .select('score, recorded_at')
      .eq('student_id', sid)
      .gte('recorded_at', day7ago)
      .order('recorded_at');

    // 直近30日のチャットセッション
    const { data: chats30 } = await sb
      .from('chat_sessions')
      .select('session_date, crisis_detected')
      .eq('student_id', sid)
      .gte('session_date', day30ago)
      .order('session_date');

    // ─── Lv.3 判定（最優先）───────────────────────────
    const todayCrisis = (chats30 || []).some(c => c.session_date === today && c.crisis_detected);
    const todayMood   = (moods7 || []).find(m => m.recorded_at === today);
    const yesterdayMood = (moods7 || []).find(m => m.recorded_at === daysAgo(1));
    const scoreDrop   = todayMood && yesterdayMood ? (todayMood.score - yesterdayMood.score) <= -2 : false;

    if (todayCrisis || scoreDrop) {
      const reason = todayCrisis ? 'crisis_word' : 'score_drop';
      const detail = scoreDrop ? { today: todayMood?.score, yesterday: yesterdayMood?.score } : {};
      await insertAlert(sid, 3, reason, detail, true);
      await sendCrisisEmail(sid, reason);
      created++;
      continue; // Lv.3が出たら以降の判定はスキップ
    }

    // ─── Lv.2 判定 ───────────────────────────────────
    const scores7 = (moods7 || []).map(m => m.score);
    const avg7    = scores7.length ? scores7.reduce((a, b) => a + b, 0) / scores7.length : null;

    const chats7count  = (chats30 || []).filter(c => c.session_date >= day7ago).length;
    const chats30count = (chats30 || []).length;
    const chatAvg30    = chats30count > 0 ? chats30count / 30 * 7 : 0; // 7日換算
    const chatSpike    = chatAvg30 > 0 && chats7count >= chatAvg30 * 3;

    const { data: existingLv1 } = await sb
      .from('alerts')
      .select('created_at')
      .eq('student_id', sid).eq('level', 1).is('resolved_at', null)
      .order('created_at').limit(1);
    const lv1DaysOld = existingLv1?.length
      ? Math.floor((Date.now() - new Date(existingLv1[0].created_at).getTime()) / 86400000)
      : 0;

    const hasLv2 = (avg7 !== null && avg7 <= 1.5) || chatSpike || lv1DaysOld >= 14;

    if (hasLv2) {
      const { data: existingLv2 } = await sb
        .from('alerts').select('id').eq('student_id', sid).eq('level', 2).is('resolved_at', null).limit(1);
      if (!existingLv2?.length) {
        const reason = avg7 !== null && avg7 <= 1.5 ? 'score_low'
                     : chatSpike ? 'chat_spike' : 'score_low';
        await insertAlert(sid, 2, reason, { avg_score: avg7, days: 7 });
        created++;
      }
      continue;
    }

    // ─── Lv.1 判定 ───────────────────────────────────
    const last3 = (moods7 || []).slice(-3);
    const consecutive3Low = last3.length === 3 && last3.every(m => m.score <= 2);

    const lastRecordDate = moods7?.at(-1)?.recorded_at;
    const daysSinceRecord = lastRecordDate
      ? Math.floor((Date.now() - new Date(lastRecordDate).getTime()) / 86400000)
      : 999;
    const longAbsence = daysSinceRecord >= 5;

    if (consecutive3Low || longAbsence) {
      const { data: existingLv1b } = await sb
        .from('alerts').select('id').eq('student_id', sid).eq('level', 1).is('resolved_at', null).limit(1);
      if (!existingLv1b?.length) {
        const reason = consecutive3Low ? 'score_low' : 'score_low';
        await insertAlert(sid, 1, reason, { days: 3 });
        created++;
      }
    }
  }

  return { processed: students.length, created };
}

async function insertAlert(studentId: string, level: number, reason: string, detail: object, externalNotifiable = false) {
  await sb.from('alerts').insert({
    student_id: studentId,
    level,
    reason,
    detail,
    external_notifiable: externalNotifiable,
  });
}

async function sendCrisisEmail(studentId: string, reason: string) {
  if (!RESEND_API_KEY) return;

  // 担当教員のメールを取得
  const { data: student } = await sb.from('students').select('class_id, display_name').eq('id', studentId).single();
  if (!student) return;

  const { data: tc } = await sb
    .from('teacher_classes')
    .select('teacher_id, teachers(email, name)')
    .eq('class_id', student.class_id)
    .limit(5);

  for (const row of (tc || [])) {
    const teacher = (row as any).teachers;
    if (!teacher?.email) continue;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: teacher.email,
        subject: '【緊急】きもちチェック Lv.3 アラート',
        html: `
          <h2>⚠️ 緊急アラートが発生しました</h2>
          <p>生徒名：${student.display_name || '（匿名）'}</p>
          <p>理由：${reason === 'crisis_word' ? '危機ワード検出' : 'スコア急落'}</p>
          <p>ダッシュボードを確認し、速やかに対応してください。</p>
        `,
      }),
    });
  }
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
