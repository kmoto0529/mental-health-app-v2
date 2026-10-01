/* kokoni AIミニセッション：仮説を Gemini で作る
   - ブラウザ（demo-v2.html）と Node（QAスクリプト）の両方で同じプロンプト・同じ検証を使う
   - AIに渡すのは、アプリが実際に持っている情報だけ（ctx）。過去情報の捏造を防ぐため、
     「つなぐ情報（link）」は ctx にある出どころ（link_source）を名指しさせ、無ければ捨てる
   - 出力は JSON。検証に通らなければ呼び出し側はルールの仮説に戻す（validate が ok:false を返す）
   - mechanism は8種の列挙に限定。行動提案は呼び出し側が mechanism → Action Master のカテゴリで選ぶ（AIは行動を作らない）
*/
(function(root){
  const MECH = {
    push:     "その場で無理して頑張り続け、あとから疲れが出る",
    ruminate: "出来事のあと一人で考え続け、気持ちが長引く",
    blame:    "出来事のあと自分を責める考えが、つらさを強める",
    avoid:    "避ける・何もしないことで、その場は楽でも、しんどさが続く",
    stuck:    "何から手をつければいいか見えず、焦りや不安が強まる",
    fear:     "相手にどう思われたかを考え続け、不安が続く",
    tense:    "考える余裕がないほど、体に緊張がたまっている",
    general:  "上のどれにもはっきり当てはまらない（場面で浮かぶ考えと気持ちが重なっている）"
  };
  const LINK_SOURCES = ["confirmed_pattern","action_log","intake_want","first_scene","past_coping","none"];

  const SYSTEM = [
    "あなたは、セルフケアアプリ kokoni の対話パートナーです。臨床心理士のように落ち着いた、穏やかな日本語で話します。",
    "利用者が選んだ「場面・頭に浮かんだこと・気持ち/身体・そのあとの行動」から、つながりを短い仮説として返し、本人に確かめてもらいます。",
    "",
    "## 返答の構造（必ずこの順）",
    "1. said：本人が選んだ具体的な内容を拾う（1〜2文。「〜んですね。」で終える。共感だけ・オウム返しだけにしない）",
    "2. link：past に今回と関係する情報があれば、必ず1つ選んで今回の内容とつなぐ1文にする（例：「前に、〜という流れを一緒に確かめましたね。」）。優先順：confirmed_patterns → action_logs → first_scene → past_coping → intake.want。past に何も無ければ空文字。link_source に出どころを書く",
    "3. hypothesis：2つ以上の情報をつないだ仮説（1〜2文）。「もしかすると」に続く形で書き、必ず「〜かもしれません。」で終える",
    "4. 確認の問いは書かない（アプリが「この見方は近そうですか？」を付ける）",
    "",
    "## 守ること",
    "- 入力に無い過去の出来事・発言を作らない。past に無いことを「前に話してくれた」と書かない",
    "- 断定しない。「絶対に」「あなたは〜な人です」「〜という病気です」「〜が必要です」「〜すべきです」は使わない",
    "- 診断名・症状名・専門用語（認知の歪み、自動思考、認知再構成、行動活性化、スキーマ、CBT など）を使わない",
    "- 過剰に励まさない。子どもっぽくしない。絵文字は使わない",
    "- 本人の言葉（選んだ語句）をそのまま使う。言い換えすぎない",
    "- 各文は短く。said と hypothesis はそれぞれ70字以内を目安",
    "",
    "## mechanism（仮説の型）は次から1つだけ選ぶ",
    Object.keys(MECH).map(function(k){ return "- "+k+"："+MECH[k]; }).join("\n"),
    "",
    "## policy",
    "今週変えてみたいことを、やさしい一文で（「〜してみる」で終える。40字以内。具体的な行動名は書かない）",
    "",
    "## evidence",
    "仮説の根拠を、利用者向けのやさしい日本語で2〜5個。すべて入力にある事実だけ（例：「人と話したあとに疲れると選んだ」）",
    "",
    "## 出力（JSONのみ。前後に文章を書かない）",
    '{"said":"","link":"","link_source":"none","hypothesis":"","flow":["場面","考え","行動","結果"],"mechanism":"general","policy":"","evidence":[""],"confidence":0.5}',
    "flow は2〜4個の短い語句（各20字以内・本人の言葉を優先）。confidence は0〜1で、根拠が少ないほど低く。"
  ].join("\n");

  function buildPrompt(ctx){
    return { systemPrompt: SYSTEM, user: "入力:\n"+JSON.stringify(ctx, null, 1) };
  }

  const BANNED = [/絶対/, /あなたは[^。]{0,14}(な人|タイプ|性格)です/, /病気/, /診断/, /うつ病|鬱病|障害|症状|疾患/,
    /認知の歪み|認知のゆがみ|自動思考|認知再構成|行動活性化|スキーマ|CBT|認知行動療法/, /必要です/, /すべき|するべき/];
  const RISK = /死に|しにたい|死にたい|消えたい|いなくなりたい|自殺|リストカット|傷つけ|終わりに/;

  function hasSource(ctx, src){
    const p = ctx.past || {};
    if(src==="confirmed_pattern") return (p.confirmed_patterns||[]).length>0;
    if(src==="action_log") return (p.action_logs||[]).length>0;
    if(src==="intake_want") return !!(ctx.intake && ctx.intake.want);
    if(src==="first_scene") return !!p.first_scene;
    if(src==="past_coping") return (p.past_coping||[]).length>0;
    return false;
  }
  function str(v,max){ v = (v==null?"":String(v)).trim(); return v.length>max ? null : v; }

  /* 返り値：{ok:true, out} または {ok:false, reason} */
  function validate(raw, ctx){
    let o;
    try { o = typeof raw==="string" ? JSON.parse(raw.replace(/^```json\s*|```\s*$/g,"")) : raw; }
    catch(e){ return {ok:false, reason:"json_parse_error"}; }
    if(!o || typeof o!=="object") return {ok:false, reason:"not_object"};
    const said=str(o.said,140), hyp=str(o.hypothesis,140), policy=str(o.policy,60);
    if(!said || !hyp || !policy) return {ok:false, reason:"missing_or_too_long"};
    if(!/かもしれ/.test(hyp)) return {ok:false, reason:"assertive_hypothesis"};
    if(!MECH[o.mechanism]) return {ok:false, reason:"bad_mechanism"};
    let link = str(o.link,100) || "", src = LINK_SOURCES.indexOf(o.link_source)>=0 ? o.link_source : "none";
    if(link && (src==="none" || !hasSource(ctx,src))){ link=""; src="none"; }   // 出どころの無いつなぎは捨てる
    const flow = (Array.isArray(o.flow)?o.flow:[]).map(function(x){ return str(x,24); }).filter(Boolean).slice(0,4);
    if(flow.length<2) return {ok:false, reason:"bad_flow"};
    const ev = (Array.isArray(o.evidence)?o.evidence:[]).map(function(x){ return str(x,70); }).filter(Boolean).slice(0,5);
    if(ev.length<2) return {ok:false, reason:"bad_evidence"};
    const all=[said,link,hyp,policy].concat(flow,ev).join("\n");
    for(const re of BANNED){ if(re.test(all)) return {ok:false, reason:"banned:"+re.source.slice(0,12)}; }
    if(RISK.test(all)) return {ok:false, reason:"risk_word_in_output"};
    let c = Number(o.confidence); if(!(c>=0 && c<=1)) c=0.5;
    return {ok:true, out:{said:said, link:link, link_source:src, hypothesis:hyp, flow:flow, mechanism:o.mechanism,
      policy:policy, evidence:ev, confidence:c}};
  }

  root.KokoniMiniAI = { MECH:MECH, SYSTEM:SYSTEM, buildPrompt:buildPrompt, validate:validate,
    model:"gemini-2.5-flash", gen:{temperature:0.4, maxTokens:1200, thinkingBudget:0, responseMimeType:"application/json"} };
})(typeof window!=="undefined" ? window : module.exports);
