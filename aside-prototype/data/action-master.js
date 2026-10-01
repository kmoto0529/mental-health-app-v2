/* 自動生成（scripts/build-action-master-js.js）。直接編集しない。正本は action-master.json */
window.ACTION_MASTER = {
  "master_version": "0.3",
  "updated_at": "2026-10-01",
  "note": "行動マスター。介入内容は固定・パーソナライズは可変。将来は CSV/Sheets → Supabase → 心理士編集画面へ移行する。画面やロジックは action_id 経由でのみ参照すること。",
  "categories": [
    {
      "category_id": "THINK",
      "category_name": "考えを整理する",
      "order": 1
    },
    {
      "category_id": "ACT",
      "category_name": "小さく行動する",
      "order": 2
    },
    {
      "category_id": "CALM",
      "category_name": "気持ちを落ち着ける",
      "order": 3
    },
    {
      "category_id": "SOLVE",
      "category_name": "問題を整理する",
      "order": 4
    },
    {
      "category_id": "CONNECT",
      "category_name": "人とつながる",
      "order": 5
    },
    {
      "category_id": "KIND",
      "category_name": "自分に優しくする",
      "order": 6
    },
    {
      "category_id": "OBSERVE",
      "category_name": "記録して眺める",
      "order": 7
    }
  ],
  "actions": [
    {
      "action_id": "ACTION_001",
      "category_id": "THINK",
      "category_name": "考えを整理する",
      "title": "今の考えを書き出してみる",
      "short_description": "頭の中にあることを、そのまま外に出してみます。整理されなくても大丈夫です。",
      "purpose": "頭の中にある考えや気持ちを、まず外に出す（外在化）。整理されるのは結果であって目的ではない（9/22 大塚さん）。",
      "recommended_for": [
        "考えが止まらない",
        "頭の中がごちゃごちゃしている",
        "何が不安なのかわからない"
      ],
      "caution": "書きながらつらさが強くなったら、途中でやめてよいと伝える。",
      "difficulty": 1,
      "app_type": "guided_journal",
      "instruction": "うまく書こうとしなくて大丈夫です。今、頭の中にあることを、浮かんだ順にそのまま書いてみましょう。",
      "reflection": "書き出してみて、いまどんな感じですか。",
      "cadence_type": "trigger_based",
      "default_frequency": "考えが止まらなくなった時",
      "default_duration": 5,
      "minimum_frequency": null,
      "minimum_duration": 1,
      "adjustable_fields": [
        "duration",
        "content"
      ],
      "simpler_version": {
        "title": "今の考えを3行だけ書き出してみる",
        "instruction": "全部書かなくて大丈夫です。いま浮かんでいることを、3行だけ書いてみましょう。"
      },
      "easier_action_id": null,
      "cta_label": "書き出してみる",
      "match": {
        "want": [
          "頭の中を整理したい"
        ],
        "topic": [
          "仕事・学校",
          "将来・お金",
          "自分自身のこと",
          "まだわからない"
        ],
        "state": [
          "少ししんどい",
          "波がある",
          "うまく言えない"
        ],
        "keywords": [
          "考え",
          "ぐるぐる",
          "止まらない",
          "眠れない",
          "寝る前",
          "不安"
        ]
      },
      "status": "published",
      "version": "0.2"
    },
    {
      "action_id": "ACTION_002",
      "category_id": "THINK",
      "category_name": "考えを整理する",
      "title": "出来事・考え・気持ちを分けてみる",
      "short_description": "起きたことと、自分の受け取り方を切り分けます。",
      "purpose": "起きた出来事と、自分の解釈や感情を分けて整理する。",
      "recommended_for": [
        "嫌な出来事が頭から離れない",
        "感情が強くなっている",
        "何に反応しているのかわからない"
      ],
      "caution": "分けられなくてよい。分けようとしたこと自体を肯定する。",
      "difficulty": 2,
      "app_type": "guided_journal",
      "instruction": "3つに分けてみましょう。①実際に起きたこと ②そのとき頭に浮かんだこと ③そのときの気持ち。順番どおりでなくて構いません。",
      "reflection": "分けてみて、気づいたことはありましたか。",
      "cadence_type": "trigger_based",
      "default_frequency": "気持ちが大きく動いた時",
      "default_duration": 7,
      "minimum_frequency": null,
      "minimum_duration": 3,
      "adjustable_fields": [
        "duration",
        "content"
      ],
      "simpler_version": {
        "title": "出来事と気持ちの2つだけ書いてみる",
        "instruction": "「何があったか」と「どう感じたか」の2つだけ、ひとことずつ書いてみましょう。"
      },
      "easier_action_id": "ACTION_001",
      "cta_label": "整理してみる",
      "match": {
        "want": [
          "頭の中を整理したい",
          "自分のことを理解したい"
        ],
        "topic": [
          "人間関係",
          "仕事・学校"
        ],
        "state": [
          "少ししんどい",
          "波がある"
        ],
        "keywords": [
          "言われた",
          "怒られた",
          "頭から離れない",
          "気になって",
          "モヤモヤ"
        ]
      },
      "status": "published",
      "version": "0.2"
    },
    {
      "action_id": "ACTION_003",
      "category_id": "THINK",
      "category_name": "考えを整理する",
      "title": "別の見方を1つ探してみる",
      "short_description": "いま浮かんでいる考え以外の可能性をひとつ探します。",
      "purpose": "今浮かんでいる考え以外の可能性を探す。",
      "recommended_for": [
        "悪い方向に考えてしまう",
        "自分を責めてしまう",
        "一つの考えにとらわれている"
      ],
      "caution": "前向きに考え直させるワークではない。無理に別の見方が出なくてよい。",
      "difficulty": 3,
      "app_type": "guided_journal",
      "instruction": "いま浮かんでいる考えを1つ書いてみましょう。そのあとで、「他にどんな見方がありそうか」を1つだけ探してみます。出てこなければ、それでも大丈夫です。",
      "reflection": "別の見方を探してみて、いまどんな感じですか。",
      "cadence_type": "trigger_based",
      "default_frequency": "自分を責める考えが浮かんだ時",
      "default_duration": 7,
      "minimum_frequency": null,
      "minimum_duration": 3,
      "adjustable_fields": [
        "duration"
      ],
      "simpler_version": null,
      "easier_action_id": "ACTION_022",
      "cta_label": "別の見方を探す",
      "match": {
        "want": [
          "頭の中を整理したい",
          "気持ちを少し軽くしたい",
          "自分のことを理解したい"
        ],
        "topic": [
          "仕事・学校",
          "自分自身のこと",
          "将来・お金"
        ],
        "state": [
          "少ししんどい",
          "波がある"
        ],
        "keywords": [
          "自分が悪い",
          "ダメ",
          "失敗",
          "責め",
          "どうせ"
        ]
      },
      "status": "published",
      "version": "0.2"
    },
    {
      "action_id": "ACTION_004",
      "category_id": "THINK",
      "category_name": "考えを整理する",
      "title": "自分にかけたい言葉を考える",
      "short_description": "いまの自分に必要な言葉を、ひとつ言葉にします。",
      "purpose": "今の自分に必要な言葉を整理する。",
      "recommended_for": [
        "自分を責めている",
        "失敗について考え続けている",
        "自信をなくしている"
      ],
      "caution": "励ましを強要しない。出てこなければ書かなくてよい。",
      "difficulty": 2,
      "app_type": "guided_journal",
      "instruction": "いまの自分に、どんな言葉をかけたいですか。うまい言葉でなくて構いません。",
      "reflection": "書いてみて、いまどんな感じですか。",
      "cadence_type": "trigger_based",
      "default_frequency": "自分を責めてしまった時",
      "default_duration": 5,
      "minimum_frequency": null,
      "minimum_duration": 2,
      "adjustable_fields": [
        "duration"
      ],
      "simpler_version": null,
      "easier_action_id": "ACTION_021",
      "cta_label": "言葉を考える",
      "match": {
        "want": [
          "気持ちを少し軽くしたい",
          "自分のことを理解したい"
        ],
        "topic": [
          "自分自身のこと"
        ],
        "state": [
          "少ししんどい",
          "かなりしんどい"
        ],
        "keywords": [
          "自分が悪い",
          "責め",
          "情けない",
          "申し訳"
        ]
      },
      "status": "published",
      "version": "0.2"
    },
    {
      "action_id": "ACTION_005",
      "category_id": "ACT",
      "category_name": "小さく行動する",
      "title": "5分だけ散歩する",
      "short_description": "外に出て5分だけ歩き、気分の変化を見ます。",
      "purpose": "活動量を小さく増やし、気分の変化を観察する。",
      "recommended_for": [
        "何もする気になれない",
        "家にこもりがち",
        "少し身体を動かしたい"
      ],
      "caution": "体調が悪いときは行わない。天候・時間帯の安全に配慮する。",
      "difficulty": 2,
      "app_type": "activity_timer",
      "instruction": "家の外に出て、5分だけ歩いてみましょう。距離も速さも気にしなくて大丈夫です。",
      "reflection": "歩く前と後で、気分に違いはありましたか。",
      "cadence_type": "scheduled",
      "default_frequency": "週3回",
      "default_duration": 5,
      "minimum_frequency": "週1回",
      "minimum_duration": 2,
      "adjustable_fields": [
        "frequency",
        "duration",
        "content"
      ],
      "simpler_version": {
        "title": "外に出て、1分だけ外の空気を吸う",
        "instruction": "歩かなくても大丈夫です。玄関やベランダに出て、1分だけ外の空気を吸ってみましょう。"
      },
      "easier_action_id": null,
      "cta_label": "5分歩いてみる",
      "match": {
        "want": [
          "少し動けるようになりたい",
          "生活リズムを整えたい"
        ],
        "topic": [
          "生活・体調",
          "自分自身のこと"
        ],
        "state": [
          "少ししんどい",
          "波がある",
          "まあ大丈夫"
        ],
        "keywords": [
          "動けない",
          "こもって",
          "外に出",
          "だるい"
        ]
      },
      "status": "published",
      "version": "0.2"
    },
    {
      "action_id": "ACTION_006",
      "category_id": "ACT",
      "category_name": "小さく行動する",
      "title": "気分が少し上がりそうなことを1つやる",
      "short_description": "心地よさが少しある活動を、ひとつ生活に入れます。",
      "purpose": "小さな心地よい活動を生活に入れる。",
      "recommended_for": [
        "楽しみが減っている",
        "何もしたくない",
        "毎日が単調になっている"
      ],
      "caution": "「楽しめないこと」を責める材料にしない。",
      "difficulty": 2,
      "app_type": "activity_planner",
      "instruction": "少しだけ気分が上がりそうなことを1つ決めて、いつやるかまで決めておきましょう。小さいほど続きます。",
      "reflection": "やってみて、気分に変化はありましたか。",
      "cadence_type": "scheduled",
      "default_frequency": "週3回",
      "default_duration": 10,
      "minimum_frequency": "週1回",
      "minimum_duration": 3,
      "adjustable_fields": [
        "frequency",
        "duration"
      ],
      "simpler_version": null,
      "easier_action_id": null,
      "cta_label": "1つ決める",
      "match": {
        "want": [
          "少し動けるようになりたい",
          "気持ちを少し軽くしたい"
        ],
        "topic": [
          "生活・体調",
          "自分自身のこと",
          "その他"
        ],
        "state": [
          "少ししんどい",
          "波がある",
          "まあ大丈夫"
        ],
        "keywords": [
          "楽しめない",
          "何もしたくない",
          "つまらない",
          "単調"
        ]
      },
      "status": "published",
      "version": "0.2"
    },
    {
      "action_id": "ACTION_007",
      "category_id": "ACT",
      "category_name": "小さく行動する",
      "title": "やることを5分サイズまで小さくする",
      "short_description": "重く感じるタスクを、始められる大きさに割ります。",
      "purpose": "大きなタスクを実行可能なサイズまで分解する。",
      "recommended_for": [
        "やることを避けている",
        "タスクが重く感じる",
        "始められない"
      ],
      "caution": "分解しても取りかかれないこと自体を責めない。",
      "difficulty": 2,
      "app_type": "task_breakdown",
      "instruction": "気が重いことを1つ思い浮かべ、それを「5分でできる最初のひとかけら」まで小さくしてみましょう。",
      "reflection": "小さくしてみて、取りかかれそうな感じはありますか。",
      "cadence_type": "trigger_based",
      "default_frequency": "やることに手がつかない時",
      "default_duration": 10,
      "minimum_frequency": null,
      "minimum_duration": 3,
      "adjustable_fields": [
        "duration"
      ],
      "simpler_version": null,
      "easier_action_id": null,
      "cta_label": "小さくしてみる",
      "match": {
        "want": [
          "少し動けるようになりたい",
          "頭の中を整理したい"
        ],
        "topic": [
          "仕事・学校"
        ],
        "state": [
          "少ししんどい",
          "波がある",
          "まあ大丈夫"
        ],
        "keywords": [
          "先延ばし",
          "手がつかない",
          "始められない",
          "溜まって",
          "やらなきゃ"
        ]
      },
      "status": "published",
      "version": "0.2"
    },
    {
      "action_id": "ACTION_008",
      "category_id": "ACT",
      "category_name": "小さく行動する",
      "title": "やる前と後の気分を比べてみる",
      "short_description": "行動の前後で気分がどう動くかを実際に確かめます。",
      "purpose": "行動した時に実際にどう気分が変化するか確認する。",
      "recommended_for": [
        "行動する気にならない",
        "何をすると楽になるかわからない"
      ],
      "caution": "気分が変わらなくても失敗ではないと伝える。",
      "difficulty": 2,
      "app_type": "mood_experiment",
      "instruction": "やることを1つ決めて、やる前の気分を記録します。終わったらもう一度記録して、違いを見てみましょう。",
      "reflection": "前と後で、気分の数字は動きましたか。",
      "cadence_type": "scheduled",
      "default_frequency": "週2回",
      "default_duration": 10,
      "minimum_frequency": "週1回",
      "minimum_duration": 10,
      "adjustable_fields": [
        "frequency"
      ],
      "simpler_version": null,
      "easier_action_id": null,
      "cta_label": "試してみる",
      "match": {
        "want": [
          "少し動けるようになりたい",
          "自分のことを理解したい"
        ],
        "topic": [
          "生活・体調",
          "自分自身のこと",
          "その他"
        ],
        "state": [
          "波がある",
          "まあ大丈夫",
          "うまく言えない"
        ],
        "keywords": [
          "わからない",
          "何をすれば",
          "気分"
        ]
      },
      "status": "published",
      "version": "0.2"
    },
    {
      "action_id": "ACTION_009",
      "category_id": "CALM",
      "category_name": "気持ちを落ち着ける",
      "title": "3分間の呼吸",
      "short_description": "呼吸に意識を向けて、少しだけ今この瞬間に戻ります。",
      "purpose": "呼吸に注意を向けて、今この瞬間に意識を戻す。",
      "recommended_for": [
        "不安が強い",
        "緊張している",
        "頭の中がいっぱい"
      ],
      "caution": "実施中に苦しさが強くなった場合は中止する。",
      "difficulty": 1,
      "app_type": "breathing_timer",
      "instruction": "楽な姿勢で座り、鼻から息を吸って、口からゆっくり吐きます。考えごとが浮かんだら、そのまま呼吸に戻ってきてください。",
      "reflection": "呼吸のあと、身体や気持ちに変化はありましたか。",
      "cadence_type": "daily",
      "default_frequency": "毎日",
      "default_duration": 3,
      "minimum_frequency": "週1回",
      "minimum_duration": 1,
      "adjustable_fields": [
        "frequency",
        "duration"
      ],
      "simpler_version": null,
      "easier_action_id": null,
      "cta_label": "3分やってみる",
      "match": {
        "want": [
          "気持ちを少し軽くしたい",
          "頭の中を整理したい"
        ],
        "topic": [
          "仕事・学校",
          "人間関係",
          "将来・お金",
          "生活・体調"
        ],
        "state": [
          "かなりしんどい",
          "少ししんどい",
          "波がある"
        ],
        "keywords": [
          "不安",
          "緊張",
          "眠れない",
          "寝る前",
          "考えが",
          "動悸",
          "落ち着かない"
        ]
      },
      "status": "published",
      "version": "0.2"
    },
    {
      "action_id": "ACTION_010",
      "category_id": "CALM",
      "category_name": "気持ちを落ち着ける",
      "title": "3分間のマインドフルネス",
      "short_description": "いま感じていることに、評価せずに注意を向けます。",
      "purpose": "今この瞬間の感覚に注意を向ける。",
      "recommended_for": [
        "考えが止まらない",
        "不安が続いている",
        "少し落ち着きたい"
      ],
      "caution": "無理に無心になろうとしない。つらくなったら中止する。",
      "difficulty": 2,
      "app_type": "mindfulness_timer",
      "instruction": "いま聞こえている音、触れている感触に、順番に注意を向けてみましょう。良い悪いを決めなくて大丈夫です。",
      "reflection": "やってみて、いまどんな感じですか。",
      "cadence_type": "daily",
      "default_frequency": "毎日",
      "default_duration": 3,
      "minimum_frequency": "週1回",
      "minimum_duration": 1,
      "adjustable_fields": [
        "frequency",
        "duration"
      ],
      "simpler_version": null,
      "easier_action_id": "ACTION_009",
      "cta_label": "3分やってみる",
      "match": {
        "want": [
          "気持ちを少し軽くしたい",
          "頭の中を整理したい"
        ],
        "topic": [
          "仕事・学校",
          "将来・お金",
          "自分自身のこと"
        ],
        "state": [
          "少ししんどい",
          "波がある",
          "まあ大丈夫"
        ],
        "keywords": [
          "考えが止まらない",
          "ぐるぐる",
          "不安",
          "落ち着きたい"
        ]
      },
      "status": "published",
      "version": "0.2"
    },
    {
      "action_id": "ACTION_011",
      "category_id": "CALM",
      "category_name": "気持ちを落ち着ける",
      "title": "短いボディスキャン",
      "short_description": "身体の感覚を順にたどり、緊張に気づきます。",
      "purpose": "身体の感覚に注意を向け、緊張に気づく。",
      "recommended_for": [
        "身体が緊張している",
        "疲れている",
        "頭から身体へ注意を移したい"
      ],
      "caution": "痛みが強い部位は無理にたどらない。",
      "difficulty": 2,
      "app_type": "body_scan",
      "instruction": "足先から順に、頭まで注意を移していきます。力が入っているところを見つけたら、気づくだけで大丈夫です。",
      "reflection": "身体のどこかに、力が入っていることに気づけましたか。",
      "cadence_type": "daily",
      "default_frequency": "毎日",
      "default_duration": 5,
      "minimum_frequency": "週1回",
      "minimum_duration": 2,
      "adjustable_fields": [
        "frequency",
        "duration"
      ],
      "simpler_version": null,
      "easier_action_id": "ACTION_012",
      "cta_label": "やってみる",
      "match": {
        "want": [
          "気持ちを少し軽くしたい",
          "生活リズムを整えたい",
          "自分のことを理解したい"
        ],
        "topic": [
          "生活・体調"
        ],
        "state": [
          "かなりしんどい",
          "少ししんどい",
          "波がある"
        ],
        "keywords": [
          "疲れ",
          "身体",
          "肩",
          "こり",
          "だるい",
          "眠れない"
        ]
      },
      "status": "published",
      "version": "0.2"
    },
    {
      "action_id": "ACTION_012",
      "category_id": "CALM",
      "category_name": "気持ちを落ち着ける",
      "title": "筋肉をゆるめる",
      "short_description": "力を入れてから抜く差で、身体をゆるめます。",
      "purpose": "身体の緊張と弛緩を使ってリラックスする。",
      "recommended_for": [
        "身体に力が入っている",
        "寝る前に緊張している",
        "身体を使って落ち着きたい"
      ],
      "caution": "けがや痛みのある部位では行わない。",
      "difficulty": 1,
      "app_type": "muscle_relaxation",
      "instruction": "肩をぎゅっと上げて5秒。そのあと、いっきに力を抜きます。手、顔の順に繰り返してみましょう。",
      "reflection": "力を抜いたあと、身体はどんな感じですか。",
      "cadence_type": "daily",
      "default_frequency": "毎日",
      "default_duration": 5,
      "minimum_frequency": "週1回",
      "minimum_duration": 1,
      "adjustable_fields": [
        "frequency",
        "duration",
        "content"
      ],
      "simpler_version": {
        "title": "肩だけゆるめる",
        "instruction": "肩をぎゅっと上げて5秒、ストンと落とします。これを2回だけやってみましょう。"
      },
      "easier_action_id": null,
      "cta_label": "ゆるめてみる",
      "match": {
        "want": [
          "気持ちを少し軽くしたい",
          "生活リズムを整えたい"
        ],
        "topic": [
          "生活・体調",
          "仕事・学校"
        ],
        "state": [
          "かなりしんどい",
          "少ししんどい",
          "波がある"
        ],
        "keywords": [
          "緊張",
          "寝る前",
          "眠れない",
          "力が入",
          "肩"
        ]
      },
      "status": "published",
      "version": "0.2"
    },
    {
      "action_id": "ACTION_013",
      "category_id": "SOLVE",
      "category_name": "問題を整理する",
      "title": "困っていることを1文にしてみる",
      "short_description": "漠然とした困りごとを、ひとつの文にします。",
      "purpose": "漠然とした困りごとを具体化する。",
      "recommended_for": [
        "何に困っているかわからない",
        "問題が大きく感じる",
        "考えがまとまらない"
      ],
      "caution": "1文にまとまらなくてよい。大まかで構わないと伝える。",
      "difficulty": 2,
      "app_type": "problem_solving",
      "instruction": "「いま困っているのは、◯◯が◯◯であることだ」の形で、1文にしてみましょう。",
      "reflection": "1文にしてみて、見え方は変わりましたか。",
      "cadence_type": "one_off",
      "default_frequency": "今週1回",
      "default_duration": 7,
      "minimum_frequency": "今週1回",
      "minimum_duration": 3,
      "adjustable_fields": [
        "duration"
      ],
      "simpler_version": null,
      "easier_action_id": null,
      "cta_label": "整理してみる",
      "match": {
        "want": [
          "頭の中を整理したい",
          "自分のことを理解したい"
        ],
        "topic": [
          "仕事・学校",
          "将来・お金",
          "まだわからない",
          "その他"
        ],
        "state": [
          "少ししんどい",
          "波がある",
          "うまく言えない"
        ],
        "keywords": [
          "どうしたら",
          "わからない",
          "まとまらない",
          "問題"
        ]
      },
      "status": "published",
      "version": "0.2"
    },
    {
      "action_id": "ACTION_014",
      "category_id": "SOLVE",
      "category_name": "問題を整理する",
      "title": "変えられること・変えられないことを分ける",
      "short_description": "自分が手をつけられる範囲をはっきりさせます。",
      "purpose": "自分が取り組める範囲を明確にする。",
      "recommended_for": [
        "どうにもならないことを考え続けている",
        "問題が大きく感じる"
      ],
      "caution": "「変えられない」と結論づけて諦めさせる方向に使わない。",
      "difficulty": 2,
      "app_type": "problem_solving",
      "instruction": "気になっていることを挙げて、「自分で変えられそうなこと」と「そうでないこと」に分けてみましょう。",
      "reflection": "分けてみて、いまどんな感じですか。",
      "cadence_type": "one_off",
      "default_frequency": "今週1回",
      "default_duration": 7,
      "minimum_frequency": "今週1回",
      "minimum_duration": 3,
      "adjustable_fields": [
        "duration"
      ],
      "simpler_version": null,
      "easier_action_id": "ACTION_013",
      "cta_label": "分けてみる",
      "match": {
        "want": [
          "頭の中を整理したい",
          "気持ちを少し軽くしたい"
        ],
        "topic": [
          "仕事・学校",
          "人間関係",
          "将来・お金"
        ],
        "state": [
          "少ししんどい",
          "波がある"
        ],
        "keywords": [
          "どうにもならない",
          "変えられない",
          "会社",
          "上司",
          "制度"
        ]
      },
      "status": "published",
      "version": "0.2"
    },
    {
      "action_id": "ACTION_015",
      "category_id": "SOLVE",
      "category_name": "問題を整理する",
      "title": "解決策を3つ考える",
      "short_description": "ひとつの方法に絞らず、選択肢を並べます。",
      "purpose": "一つの方法ではなく、複数の選択肢を考える。",
      "recommended_for": [
        "どうしたらいいかわからない",
        "選択肢がないように感じる"
      ],
      "caution": "実行を迫らない。出すだけで終わってよい。",
      "difficulty": 3,
      "app_type": "problem_solving",
      "instruction": "良い案でなくて構いません。思いつく方法を3つ並べてみましょう。現実的でないものが混ざっていても大丈夫です。",
      "reflection": "3つ並べてみて、気持ちに変化はありましたか。",
      "cadence_type": "one_off",
      "default_frequency": "今週1回",
      "default_duration": 10,
      "minimum_frequency": "今週1回",
      "minimum_duration": 5,
      "adjustable_fields": [
        "duration"
      ],
      "simpler_version": null,
      "easier_action_id": "ACTION_013",
      "cta_label": "3つ考える",
      "match": {
        "want": [
          "頭の中を整理したい",
          "少し動けるようになりたい"
        ],
        "topic": [
          "仕事・学校",
          "将来・お金",
          "人間関係"
        ],
        "state": [
          "少ししんどい",
          "波がある",
          "まあ大丈夫"
        ],
        "keywords": [
          "どうしたら",
          "選択肢",
          "迷って",
          "決められない"
        ]
      },
      "status": "published",
      "version": "0.2"
    },
    {
      "action_id": "ACTION_016",
      "category_id": "SOLVE",
      "category_name": "問題を整理する",
      "title": "今日できる小さな一歩を決める",
      "short_description": "問題に対する、いちばん小さな一歩を決めます。",
      "purpose": "問題解決のための最小の行動を決める。",
      "recommended_for": [
        "何から始めればいいかわからない",
        "問題を先延ばししている"
      ],
      "caution": "できなかった週があっても責めない。",
      "difficulty": 2,
      "app_type": "problem_solving",
      "instruction": "今日か明日のうちにできる、いちばん小さな一歩を1つだけ決めましょう。",
      "reflection": "決めた一歩は、やれそうですか。",
      "cadence_type": "scheduled",
      "default_frequency": "週3回",
      "default_duration": 5,
      "minimum_frequency": "週1回",
      "minimum_duration": 2,
      "adjustable_fields": [
        "frequency",
        "duration"
      ],
      "simpler_version": null,
      "easier_action_id": null,
      "cta_label": "一歩を決める",
      "match": {
        "want": [
          "少し動けるようになりたい",
          "頭の中を整理したい"
        ],
        "topic": [
          "仕事・学校",
          "将来・お金",
          "その他"
        ],
        "state": [
          "少ししんどい",
          "波がある",
          "まあ大丈夫"
        ],
        "keywords": [
          "先延ばし",
          "何から",
          "始められない",
          "動けない"
        ]
      },
      "status": "published",
      "version": "0.2"
    },
    {
      "action_id": "ACTION_017",
      "category_id": "CONNECT",
      "category_name": "人とつながる",
      "title": "話せそうな人を1人考える",
      "short_description": "ひとりで抱えないために、話せる相手を思い出します。",
      "purpose": "一人で抱え込まず、人とのつながりを思い出す。",
      "recommended_for": [
        "一人で抱えている",
        "誰にも話せていない",
        "孤独を感じる"
      ],
      "caution": "思いつかない場合に、それを問題として扱わない。",
      "difficulty": 2,
      "app_type": "connection_planner",
      "instruction": "実際に話すかどうかは決めなくて大丈夫です。「もし話すとしたら誰か」を1人だけ思い浮かべてみましょう。",
      "reflection": "思い浮かべてみて、いまどんな感じですか。",
      "cadence_type": "one_off",
      "default_frequency": "今週1回",
      "default_duration": 5,
      "minimum_frequency": "今週1回",
      "minimum_duration": 3,
      "adjustable_fields": [
        "duration"
      ],
      "simpler_version": null,
      "easier_action_id": null,
      "cta_label": "考えてみる",
      "match": {
        "want": [
          "人との関わりを楽にしたい",
          "気持ちを少し軽くしたい"
        ],
        "topic": [
          "人間関係",
          "自分自身のこと"
        ],
        "state": [
          "かなりしんどい",
          "少ししんどい",
          "波がある"
        ],
        "keywords": [
          "ひとり",
          "孤独",
          "話せて",
          "相談",
          "誰にも"
        ]
      },
      "status": "published",
      "version": "0.2"
    },
    {
      "action_id": "ACTION_018",
      "category_id": "CONNECT",
      "category_name": "人とつながる",
      "title": "話したいことを整理する",
      "short_description": "相談の前に、伝えたいことを言葉にしておきます。",
      "purpose": "誰かに相談する前に、伝えたい内容を整理する。",
      "recommended_for": [
        "相談したいが何を話せばいいかわからない",
        "話すことに不安がある"
      ],
      "caution": "実際に相談することを前提にしない。",
      "difficulty": 2,
      "app_type": "guided_journal",
      "instruction": "「何が起きているか」「どうしてほしいか」を、短くて構わないので書いてみましょう。",
      "reflection": "整理してみて、話せそうな感じはありますか。",
      "cadence_type": "one_off",
      "default_frequency": "今週1回",
      "default_duration": 7,
      "minimum_frequency": "今週1回",
      "minimum_duration": 3,
      "adjustable_fields": [
        "duration"
      ],
      "simpler_version": null,
      "easier_action_id": "ACTION_017",
      "cta_label": "整理してみる",
      "match": {
        "want": [
          "人との関わりを楽にしたい",
          "頭の中を整理したい"
        ],
        "topic": [
          "人間関係",
          "仕事・学校"
        ],
        "state": [
          "少ししんどい",
          "波がある",
          "まあ大丈夫"
        ],
        "keywords": [
          "相談",
          "伝え",
          "話せば",
          "言えない"
        ]
      },
      "status": "published",
      "version": "0.2"
    },
    {
      "action_id": "ACTION_019",
      "category_id": "CONNECT",
      "category_name": "人とつながる",
      "title": "送るメッセージを下書きする",
      "short_description": "送るかどうかは決めずに、文面だけ作ります。",
      "purpose": "相談や連絡の最初の一歩を作る。",
      "recommended_for": [
        "誰かに連絡したい",
        "何と送ればいいかわからない",
        "連絡することにハードルを感じる"
      ],
      "caution": "送信を促さない。下書きのまま終わってよい。",
      "difficulty": 3,
      "app_type": "message_draft",
      "instruction": "実際に送らなくて大丈夫です。もし送るとしたら、という前提で文面だけ書いてみましょう。",
      "reflection": "書いてみて、送れそうな感じはありますか。",
      "cadence_type": "one_off",
      "default_frequency": "今週1回",
      "default_duration": 7,
      "minimum_frequency": "今週1回",
      "minimum_duration": 3,
      "adjustable_fields": [
        "duration",
        "content"
      ],
      "simpler_version": {
        "title": "メッセージの最初の1文だけ書いてみる",
        "instruction": "全部書かなくて大丈夫です。送りたいメッセージの、最初の1文だけ書いてみましょう。送らなくてもかまいません。"
      },
      "easier_action_id": "ACTION_018",
      "cta_label": "下書きを作る",
      "match": {
        "want": [
          "人との関わりを楽にしたい"
        ],
        "topic": [
          "人間関係",
          "仕事・学校"
        ],
        "state": [
          "少ししんどい",
          "波がある",
          "まあ大丈夫"
        ],
        "keywords": [
          "連絡",
          "返信",
          "メッセージ",
          "line",
          "LINE",
          "伝え"
        ]
      },
      "status": "published",
      "version": "0.2"
    },
    {
      "action_id": "ACTION_020",
      "category_id": "CONNECT",
      "category_name": "人とつながる",
      "title": "どんな助けがほしいか考える",
      "short_description": "自分が周りに求めていることを言葉にします。",
      "purpose": "自分が周囲に求めているサポートを整理する。",
      "recommended_for": [
        "相談したいが何を求めればいいかわからない",
        "周囲との関係に悩んでいる"
      ],
      "caution": "「助けを求められない自分」を責める方向に使わない。",
      "difficulty": 2,
      "app_type": "connection_planner",
      "instruction": "「聞いてほしい」「代わってほしい」「そっとしておいてほしい」。どれに近いか考えてみましょう。",
      "reflection": "考えてみて、いまどんな感じですか。",
      "cadence_type": "one_off",
      "default_frequency": "今週1回",
      "default_duration": 5,
      "minimum_frequency": "今週1回",
      "minimum_duration": 5,
      "adjustable_fields": [],
      "simpler_version": null,
      "easier_action_id": "ACTION_017",
      "cta_label": "考えてみる",
      "match": {
        "want": [
          "人との関わりを楽にしたい",
          "自分のことを理解したい"
        ],
        "topic": [
          "人間関係",
          "仕事・学校"
        ],
        "state": [
          "かなりしんどい",
          "少ししんどい",
          "波がある"
        ],
        "keywords": [
          "助け",
          "頼れ",
          "相談",
          "頼み",
          "ひとりで"
        ]
      },
      "status": "published",
      "version": "0.2"
    },
    {
      "action_id": "ACTION_021",
      "category_id": "KIND",
      "category_name": "自分に優しくする",
      "title": "今の自分にかける言葉を書く",
      "short_description": "自分への厳しさを、少しだけゆるめます。",
      "purpose": "自分自身への厳しい態度を少し緩める。",
      "recommended_for": [
        "自分を責めている",
        "落ち込んでいる",
        "失敗について考えている"
      ],
      "caution": "ポジティブな言葉を強要しない。",
      "difficulty": 1,
      "app_type": "self_compassion",
      "instruction": "がんばっている自分に、いまどんな言葉をかけたいですか。短くて大丈夫です。",
      "reflection": "書いてみて、いまどんな感じですか。",
      "cadence_type": "trigger_based",
      "default_frequency": "落ち込んでいる時",
      "default_duration": 5,
      "minimum_frequency": null,
      "minimum_duration": 1,
      "adjustable_fields": [
        "duration",
        "content"
      ],
      "simpler_version": {
        "title": "今の自分にひとことだけ声をかける",
        "instruction": "長く書かなくて大丈夫です。「おつかれさま」のような、ひとことだけ書いてみましょう。"
      },
      "easier_action_id": null,
      "cta_label": "書いてみる",
      "match": {
        "want": [
          "気持ちを少し軽くしたい",
          "自分のことを理解したい"
        ],
        "topic": [
          "自分自身のこと",
          "仕事・学校"
        ],
        "state": [
          "かなりしんどい",
          "少ししんどい"
        ],
        "keywords": [
          "責め",
          "自分が悪い",
          "情けない",
          "落ち込"
        ]
      },
      "status": "published",
      "version": "0.2"
    },
    {
      "action_id": "ACTION_022",
      "category_id": "KIND",
      "category_name": "自分に優しくする",
      "title": "友人なら何と言うか考える",
      "short_description": "同じ状況の友人にかける言葉を、自分に向けます。",
      "purpose": "自分に対する見方を少し違う角度から考える。",
      "recommended_for": [
        "自分に厳しい",
        "自己否定が強い"
      ],
      "caution": "自分と他人の扱いの差を責める材料にしない。",
      "difficulty": 2,
      "app_type": "self_compassion",
      "instruction": "同じ状況にいるのが親しい友人だったら、あなたは何と言いますか。それを書いてみましょう。",
      "reflection": "書いた言葉を自分に向けてみると、どんな感じですか。",
      "cadence_type": "trigger_based",
      "default_frequency": "自分に厳しくなっている時",
      "default_duration": 5,
      "minimum_frequency": null,
      "minimum_duration": 3,
      "adjustable_fields": [
        "duration"
      ],
      "simpler_version": null,
      "easier_action_id": "ACTION_021",
      "cta_label": "考えてみる",
      "match": {
        "want": [
          "気持ちを少し軽くしたい",
          "自分のことを理解したい"
        ],
        "topic": [
          "自分自身のこと",
          "人間関係"
        ],
        "state": [
          "少ししんどい",
          "かなりしんどい",
          "波がある"
        ],
        "keywords": [
          "自分に厳しい",
          "責め",
          "ダメ",
          "できない"
        ]
      },
      "status": "published",
      "version": "0.2"
    },
    {
      "action_id": "ACTION_023",
      "category_id": "KIND",
      "category_name": "自分に優しくする",
      "title": "今日できていることを1つ見つける",
      "short_description": "できなかったことではなく、できたことを1つ拾います。",
      "purpose": "できていないことだけでなく、すでにできていることにも注意を向ける。",
      "recommended_for": [
        "自信をなくしている",
        "できないことばかり考えている"
      ],
      "caution": "見つからない日があってよいと伝える。",
      "difficulty": 1,
      "app_type": "self_compassion",
      "instruction": "どんなに小さくて構いません。今日できたことを1つだけ書いてみましょう。起きた、でも大丈夫です。",
      "reflection": "1つ見つけてみて、いまどんな感じですか。",
      "cadence_type": "daily",
      "default_frequency": "毎日",
      "default_duration": 3,
      "minimum_frequency": "週1回",
      "minimum_duration": 1,
      "adjustable_fields": [
        "frequency",
        "duration",
        "content"
      ],
      "simpler_version": {
        "title": "今日できたことを1語だけ書く",
        "instruction": "「起きた」「食べた」など、1語だけで大丈夫です。"
      },
      "easier_action_id": null,
      "cta_label": "1つ見つける",
      "match": {
        "want": [
          "気持ちを少し軽くしたい",
          "自分のことを理解したい",
          "少し動けるようになりたい"
        ],
        "topic": [
          "自分自身のこと",
          "生活・体調",
          "仕事・学校"
        ],
        "state": [
          "かなりしんどい",
          "少ししんどい",
          "波がある"
        ],
        "keywords": [
          "できない",
          "自信",
          "ダメ",
          "何もできて"
        ]
      },
      "status": "published",
      "version": "0.2"
    },
    {
      "action_id": "ACTION_024",
      "category_id": "KIND",
      "category_name": "自分に優しくする",
      "title": "今日はやらなくてもいいことを1つ決める",
      "short_description": "自分に課している負担を、ひとつ降ろします。",
      "purpose": "自分に課している負担を少し減らす。",
      "recommended_for": [
        "頑張りすぎている",
        "疲れている",
        "やることに追われている"
      ],
      "caution": "重要な予定を安易に削らせない。",
      "difficulty": 1,
      "app_type": "self_compassion",
      "instruction": "今日やらなくても大きな問題にならないことを、1つだけ選んで手放してみましょう。",
      "reflection": "1つ手放してみて、いまどんな感じですか。",
      "cadence_type": "scheduled",
      "default_frequency": "週3回",
      "default_duration": 3,
      "minimum_frequency": "週1回",
      "minimum_duration": 3,
      "adjustable_fields": [
        "frequency"
      ],
      "simpler_version": null,
      "easier_action_id": null,
      "cta_label": "1つ決める",
      "match": {
        "want": [
          "気持ちを少し軽くしたい",
          "生活リズムを整えたい"
        ],
        "topic": [
          "仕事・学校",
          "生活・体調",
          "自分自身のこと"
        ],
        "state": [
          "かなりしんどい",
          "少ししんどい"
        ],
        "keywords": [
          "疲れ",
          "追われ",
          "頑張",
          "余裕がない",
          "休めない"
        ]
      },
      "status": "published",
      "version": "0.2"
    },
    {
      "action_id": "ACTION_025",
      "category_id": "OBSERVE",
      "category_name": "記録して眺める",
      "title": "1日の気分と過ごし方を記録する",
      "short_description": "1日の中で、何をしていて、どんな気分だったかをつけていきます。",
      "purpose": "気分と行動のつながりを、本人が自分の記録から見つける（行動記録表・セルフモニタリング）。",
      "recommended_for": [
        "休み始めたばかり",
        "1日の過ごし方がばらばら",
        "何をすると楽になるかわからない"
      ],
      "caution": "空白の時間帯を責めない。書けない日は気分だけ、または何も書かなくてよいと伝える。出典：9/22 大塚さん「休職し始めの人には特に」。",
      "difficulty": 1,
      "app_type": "activity_log",
      "instruction": "朝から夜まで、だいたいの時間帯ごとに「していたこと」と「気分」をつけてみましょう。思い出せないところは空けておいて大丈夫です。",
      "reflection": "並べてみて、気分が少し違った時間帯はありましたか。",
      "cadence_type": "daily",
      "default_frequency": "毎日",
      "default_duration": 5,
      "minimum_frequency": "週3回",
      "minimum_duration": 3,
      "adjustable_fields": [
        "frequency",
        "duration",
        "content"
      ],
      "simpler_version": {
        "title": "朝・昼・夜の気分だけつける",
        "instruction": "していたことは書かなくて大丈夫です。朝・昼・夜の気分だけ選んでみましょう。"
      },
      "easier_action_id": null,
      "cta_label": "記録する",
      "match": {
        "want": [
          "自分のことを理解したい",
          "生活リズムを整えたい",
          "少し動けるようになりたい"
        ],
        "topic": [
          "生活・体調",
          "自分自身のこと",
          "まだわからない"
        ],
        "state": [
          "かなりしんどい",
          "少ししんどい",
          "波がある",
          "うまく言えない"
        ],
        "keywords": [
          "休職",
          "休んで",
          "生活",
          "一日",
          "起き",
          "寝",
          "だらだら",
          "何もできない"
        ]
      },
      "status": "published",
      "version": "0.3"
    }
  ],
  "cadence_note": "cadence_type: daily=習慣として練習 / scheduled=週に数回 / trigger_based=特定の状況で行う（default_frequency は状況の文言） / one_off=今週1回。頻度・時間の調整は minimum_* の範囲内のみ。simpler_version と easier_action_id は v0.2 の仮登録（心理士レビュー前）。"
};
