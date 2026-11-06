// dopa — シチュエーション爆買い: a random scenario to shop for, with no scoring.
// from: who sends the message, msgs: chat bubbles, reply: what they say after you buy,
// icon: a product id used as the scenario's 3D picture, cats: optional category shortcuts.
export const SITUATIONS = [
  {
    id: 'picnic', title: '突然のピクニック', done: 'ピクニックの準備、完了！', icon: 'onigiri', from: 'ゆい', rel: '友達',
    msgs: ['ねえ！今からピクニックしない？☀️', '天気よすぎるし。でもわたし何も準備してない笑', '必要そうなもの、そっちで揃えてくれたら最高！'],
    reply: 'え、こんなに！？最高のピクニックになりそう🧺✨', cats: ['food', 'hobby', 'daily'],
  },
  {
    id: 'sulky', title: '恋人の機嫌をとりたい', done: '仲直りの準備、完了！', icon: 'perfume', from: 'ハル', rel: '恋人',
    msgs: ['別に怒ってないけど。', '……', '今日なんの日か、覚えてる？'],
    reply: '……なにこれ。ずるい。許す😳💕', cats: ['beauty', 'fashion', 'food'],
  },
  {
    id: 'newlife', title: '家具ゼロの新生活', done: '新しい部屋、完成！', icon: 'sofa', from: 'ドーパ不動産', rel: '管理会社',
    msgs: ['本日より新居をご利用いただけます🔑', 'お部屋は家具・家電なしの状態です。', 'すてきな新生活をお祈りしております！'],
    reply: 'お部屋の写真、拝見しました。まるでモデルルームですね✨', cats: ['home', 'tech', 'daily'],
  },
  {
    id: 'birthday', title: '今夜サプライズ誕生日', done: 'サプライズの準備、完了！', icon: 'cake', from: 'けんた', rel: '友達',
    msgs: ['今夜、みかの誕生日サプライズやるぞ🎂', 'プレゼント担当おまえな！', 'あと飾りつけとケーキもよろしく笑'],
    reply: 'みか泣いて喜んでた！おまえ天才か🎉', cats: ['food', 'beauty', 'fashion'],
  },
  {
    id: 'camping', title: '明日いきなりキャンプ', done: 'キャンプ装備、完了！', icon: 'lantern', from: 'そうた', rel: '友達',
    msgs: ['明日キャンプ行くことになった⛺', 'テントは借りれたけど、それ以外ぜんぶ足りない', '夜けっこう冷えるらしい！'],
    reply: '装備ガチすぎ笑 最高の夜になったわ🔥', cats: ['hobby', 'food', 'fashion'],
  },
  {
    id: 'kitten', title: '子猫がやってきた', done: 'お迎えの準備、完了！', icon: 'cattower', from: 'まどか', rel: 'きょうだい',
    msgs: ['ねえ、子猫ひろっちゃった🐱', '今日からうちの子だって！', 'なんにもないから色々そろえてあげて！'],
    reply: '子猫、もう新しいベッドで寝てる…かわいすぎる😭', cats: ['pet', 'home', 'daily'],
  },
  {
    id: 'sick', title: '風邪で寝込んだ日', done: 'おうち療養セット、完了！', icon: 'thermometer', from: '自分', rel: 'メモ',
    msgs: ['熱っぽい…今日は一日寝込みそう🤒', '冷蔵庫になにもない', '元気が出そうなもの、ぜんぶほしい'],
    reply: 'だいぶ元気になってきた…ありがとう、さっきの自分', cats: ['health', 'food', 'home'],
  },
  {
    id: 'baby', title: '出産祝いを贈りたい', done: 'お祝いの準備、完了！', icon: 'rattle', from: 'さき', rel: '姉',
    msgs: ['無事に生まれたよ👶', '3,200gの元気な女の子！', '落ち着いたら会いにきてね'],
    reply: 'こんなにたくさん！？赤ちゃんも喜んでる気がする😊', cats: ['baby', 'beauty', 'food'],
  },
  {
    id: 'homeparty', title: '今夜10人で宅飲み', done: 'パーティーの準備、完了！', icon: 'pizza', from: 'りょう', rel: '友達',
    msgs: ['今夜うちで宅飲みしよ！', '…って言ったら10人来ることになった笑', '食べ物も飲み物もなんにもない！'],
    reply: 'パーティー大成功！みんな次もうちに来るって笑🍕', cats: ['food', 'home', 'hobby'],
  },
  {
    id: 'firstdate', title: '明日は初デート', done: 'デートの準備、完了！', icon: 'lipstick', from: 'あや', rel: '親友',
    msgs: ['明日、初デートなんでしょ？', '服とか大丈夫？笑', 'とびきりおしゃれしていこ！'],
    reply: 'デートどうだった！？…その顔は大成功だね😏', cats: ['fashion', 'beauty', 'health'],
  },
  {
    id: 'island', title: '来週から南の島', done: 'バカンスの準備、完了！', icon: 'sunglasses', from: 'まな', rel: '友達',
    msgs: ['来週の沖縄、楽しみすぎる🏝️', '水着しか持ってないんだけど大丈夫かな笑', '日焼け対策は大事！'],
    reply: '荷物パンパン笑 でもおかげで完璧なバカンス🌺', cats: ['fashion', 'beauty', 'hobby'],
  },
  {
    id: 'exam', title: '試験前夜の勉強部屋', done: '勉強部屋、完成！', icon: 'pencils', from: 'たいち', rel: '弟',
    msgs: ['来週テストなのに何もやってない…', 'やる気が出る部屋にしたい', 'ついでに文房具もなくした'],
    reply: '部屋が快適すぎて勉強はかどった！…たぶん📚', cats: ['study', 'home', 'food'],
  },
  {
    id: 'retire', title: '部長の退職祝い', done: '退職祝いの準備、完了！', icon: 'watch', from: 'たなか', rel: '総務部',
    msgs: ['来月で部長が定年退職されます。', '部署のみんなからの贈り物、担当をお願いできますか？', '予算は気にしなくて大丈夫です！'],
    reply: '部長、とても喜んでいました。さすがのセンスです👏', cats: ['fashion', 'home', 'food'],
  },
  {
    id: 'rainy', title: '雨の三連休をおうちで', done: 'おうち時間の準備、完了！', icon: 'cushion', from: 'お天気アプリ', rel: '通知',
    msgs: ['三連休はずっと雨の予報です☔', '不要不急の外出は控えましょう。', 'おうちで快適に過ごす準備を。'],
    reply: '三連休、一歩も外に出なかった。最高だった…☕', cats: ['home', 'food', 'tech'],
  },
  {
    id: 'streamer', title: '明日から配信デビュー', done: '配信環境、完成！', icon: 'headphones', from: 'ひかる', rel: '相方',
    msgs: ['ゲーム配信デビューするって言ったら、フォロワー1000人きた', 'でも機材ゼロ', '明日の夜8時スタートで！🎮'],
    reply: '初配信、同接500人いった！ありがとう🎮', cats: ['tech', 'home', 'food'],
  },
  {
    id: 'mother', title: '母の日のプレゼント', done: 'プレゼントの準備、完了！', icon: 'vase', from: '母', rel: '家族',
    msgs: ['今度の日曜、ひさしぶりに帰ってくる？', 'なにもいらないからね〜', '顔を見せてくれるだけでいいのよ'],
    reply: 'こんなに！？…でもうれしい。ありがとうね💐', cats: ['home', 'beauty', 'food'],
  },
  {
    id: 'fitness', title: '今日から本気で鍛える', done: 'トレーニング環境、完成！', icon: 'dumbbell', from: '自分', rel: 'メモ',
    msgs: ['今日から本気で体を変える💪', '家トレ環境、ゼロからそろえる', 'プロテインの味は大事'],
    reply: '3ヶ月後の自分、別人になってるかも…！', cats: ['hobby', 'health', 'fashion'],
  },
  {
    id: 'xmas', title: 'クリスマスパーティー', done: 'クリスマスの準備、完了！', icon: 'teddy', from: 'なつみ', rel: '友達',
    msgs: ['クリパの買い出し担当、任せた🎄', 'プレゼント交換もあるよ〜', 'キラキラしたもの多めでお願い！'],
    reply: 'プレゼント交換、全員当たりだった笑 最高のクリスマス🎁', cats: ['food', 'hobby', 'home'],
  },
  {
    id: 'lottery', title: '宝くじで1億円当たった', done: '人生最高の買い物、完了！', icon: 'ring', from: '自分', rel: 'メモ',
    msgs: ['…え？', '当たってる。1億円、当たってる。', 'とりあえず、ほしかったもの全部買おう。'],
    reply: '人生でいちばん買い物した日。悔いなし✨', cats: ['fashion', 'tech', 'home'],
  },
  {
    id: 'fridge', title: '冷蔵庫がからっぽ', done: 'ストック補充、完了！', icon: 'milk', from: 'はるか', rel: 'ルームメイト',
    msgs: ['冷蔵庫、からっぽなんだけど…', 'トイレットペーパーもあと1ロール', '今日なにか買ってきてくれる？🙏'],
    reply: 'ストックが山盛り！これで1ヶ月は戦える🙌', cats: ['food', 'daily', 'health'],
  },
];
export const sitById = Object.fromEntries(SITUATIONS.map((s) => [s.id, s]));
// cart milestones that earn a celebration while shopping for a scenario (amounts, not judgement)
export const COUNT_MILESTONES = [5, 10, 20, 30, 50, 100];
export const YEN_MILESTONES = [50000, 100000, 300000, 1000000, 3000000];
