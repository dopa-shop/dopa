// dopa — catalog. All brands and products are fictional.

export const CATS = [
  { id: 'food', name: '食品・飲料', short: '食品', icon: 'donut', words: 'お菓子 スイーツ 飲み物 ドリンク フード グルメ おやつ' },
  { id: 'fashion', name: 'ファッション', short: 'ファッション', icon: 'sneaker', words: '服 洋服 靴 シューズ 小物 アクセサリー バッグ' },
  { id: 'beauty', name: 'コスメ・美容', short: 'コスメ', icon: 'lipstick', words: '化粧品 メイク スキンケア ネイル 香水 美容' },
  { id: 'health', name: 'ドラッグストア', short: 'ドラッグ', icon: 'blister', words: '薬 くすり 医薬品 サプリ 健康 衛生 ヘルスケア' },
  { id: 'home', name: 'インテリア', short: 'インテリア', icon: 'lamp', words: '家具 雑貨 部屋 北欧 キッチン 植物' },
  { id: 'tech', name: '家電・ガジェット', short: '家電', icon: 'headphones', words: 'ガジェット 電子機器 オーディオ ゲーム スマホ' },
  { id: 'daily', name: '日用品', short: '日用品', icon: 'toiletpaper', words: '生活用品 消耗品 掃除 洗濯 バス' },
  { id: 'hobby', name: 'ホビー・スポーツ', short: 'ホビー', icon: 'duck', words: 'おもちゃ 趣味 スポーツ 運動 楽器 アウトドア' },
];

const V = (n, c, extra = {}) => ({ n, c, ...extra });

// [id, cat, model, name, brand, price, listPrice|0, variants, description]
const RAW = [
  // ---------- food ----------
  ['apple', 'food', 'apple', 'ふじりんご 5玉入り', '青森 dopa農園', 1680, 2180, [V('ふじ', '#ff3b3b'), V('青りんご', '#8fd14f'), V('シナノゴールド', '#ffcf3f')], '蜜がぎゅっと詰まった完熟りんご。シャキッとした歯ざわりと、あふれる果汁が自慢です。'],
  ['donut', 'food', 'donut', 'ふわもちドーナツ 6個セット', 'PUFFY DONUTS', 1290, 1580, [V('ストロベリー', '#ff7eb6'), V('ミント', '#6ee7c8'), V('チョコ', '#7a4630'), V('レモン', '#ffe066')], 'もっちり生地にツヤツヤのアイシング。カラフルなスプリンクルで、箱を開けた瞬間から楽しい。'],
  ['macaron', 'food', 'macaron', 'パリ風マカロン 12個入り', 'Maison Mellow', 2480, 0, [V('ラベンダー', '#b99cff'), V('ピスタチオ', '#a7d98a'), V('フランボワーズ', '#ff8fab')], 'さくっ、ねっちり。香り高いガナッシュをはさんだ、ひと口サイズのご褒美です。'],
  ['cupcake', 'food', 'cupcake', 'カップケーキ アソート', 'Sugar Cloud', 980, 1280, [V('ピンク', '#ff8fb8'), V('ブルー', '#7cc6ff'), V('イエロー', '#ffd166')], 'くるりと絞ったクリームとチェリーがのった、見た目もかわいいカップケーキ。'],
  ['icecream', 'food', 'icecream', 'ダブルコーン アイス 8本', 'GELATO POP', 1580, 0, [V('いちご×バニラ', '#ff9ec4', { c2: '#fff1d6' }), V('ミント×チョコ', '#7de3c4', { c2: '#7a4630' }), V('マンゴー×ソーダ', '#ffb347', { c2: '#8fd3ff' })], '2つの味を一度に楽しめるダブルコーン。サクサクのワッフルコーン付き。'],
  ['burger', 'food', 'burger', 'グルメバーガー 冷凍 4個', 'BIG BITE', 2380, 2980, [V('チーズ', '#ffc533'), V('アボカド', '#9bd36b'), V('ハラペーニョ', '#ff7a3d')], '肉汁あふれるパティと香ばしいバンズ。レンジで温めるだけで本格バーガー。'],
  ['milk', 'food', 'milk', '牛乳 1000ml × 6本', 'dopa farm', 1290, 0, [V('牛乳', '#3b82f6', { label: 'MILK', sub: '牛乳' }), V('いちご', '#ff6fa0', { label: 'BERRY', sub: 'いちごオレ' }), V('コーヒー', '#8b5a3c', { label: 'COFFEE', sub: 'コーヒー牛乳' }), V('バナナ', '#f4c430', { label: 'BANANA', sub: 'バナナオレ' })], '牧場直送のコクのある味わい。毎朝の一杯がちょっと楽しみになります。'],
  ['soda', 'food', 'soda', 'クラフトソーダ 350ml × 24缶', 'FIZZ & Co.', 2980, 3680, [V('ピーチ', '#ff6b8b', { label: 'PEACH' }), V('ライム', '#2fbf71', { label: 'LIME' }), V('グレープ', '#8b5cf6', { label: 'GRAPE' }), V('コーラ', '#d62828', { label: 'COLA' })], '強炭酸のシュワっと感と、果実の香り。冷やしてプシュッと開けて。'],
  ['sushi', 'food', 'sushi', '職人のにぎり寿司 2貫', '鮨 まつり', 880, 0, [V('まぐろ', '#d81e3f', { kind: 'maguro' }), V('サーモン', '#ff8a4c', { kind: 'salmon' }), V('たまご', '#ffd54a', { kind: 'tamago' })], 'ふっくらシャリにとろけるネタ。下駄に盛り付けてお届けします。'],
  ['onigiri', 'food', 'onigiri', '手むすび おにぎり', 'おむすび家', 180, 0, [V('梅', '#e8394d'), V('鮭', '#ff9966'), V('昆布', '#3b2f2a'), V('ツナマヨ', '#f1e3b5')], 'ふんわり握ったお米とパリパリの海苔。お昼のおともにどうぞ。'],
  ['pudding', 'food', 'pudding', 'とろけるカスタードプリン 4個', 'Sugar Cloud', 780, 0, [V('カスタード', '#ffd36a', { s: '#8a4a1c' }), V('抹茶', '#a9c97a', { s: '#3f5a2a' }), V('いちご', '#ffb3c7', { s: '#d6274f' })], 'ぷるんと揺れるなめらか食感。ほろ苦いカラメルソースがアクセント。'],
  ['coffee', 'food', 'coffee', 'カフェラテ テイクアウト', 'MORNING DOPA', 520, 0, [V('キャラメル', '#c48a55'), V('ミント', '#5ec4a4'), V('ベリー', '#e56b9f')], 'エスプレッソとミルクの黄金比。スリーブの色で気分を選べます。'],
  ['bottle', 'food', 'bottle', '緑茶 500ml × 24本', 'お茶の水', 1980, 2580, [V('緑茶', '#a6d36a', { label: 'GREEN TEA', sub: '緑茶' }), V('ソーダ', '#7fd8ff', { label: 'SODA', sub: '天然水スパークリング' }), V('オレンジ', '#ffab3d', { label: 'ORANGE', sub: '果汁100%' }), V('ピーチ', '#ff9bb5', { label: 'PEACH', sub: 'ピーチウォーター' })], 'すっきりとした後味。ケース買いでストックしておくと安心です。'],
  ['chocolate', 'food', 'chocolate', 'カカオ72% 板チョコ 10枚', 'CACAO LAB', 1480, 0, [V('ルビー', '#e63946', { label: 'CHOCO' }), V('ミルク', '#3a86ff', { label: 'MILK' }), V('ストロベリー', '#ff8fab', { label: 'BERRY' }), V('抹茶', '#52b788', { label: 'MATCHA' })], 'パキッと割れる気持ちいい厚み。カカオの香りがふわっと広がります。'],
  ['cake', 'food', 'cake', 'いちごのショートケーキ', 'Pâtisserie Hoshi', 640, 0, [V('いちご', '#ff2f4b'), V('ブルーベリー', '#4a4ae0'), V('マンゴー', '#ffb22e')], 'ふわふわスポンジと軽い生クリーム。てっぺんのフルーツは主役級。'],
  // ---------- fashion ----------
  ['tshirt', 'fashion', 'tshirt', 'オーバーサイズ コットンTシャツ', 'KUMO WEAR', 2990, 3990, [V('パープル', '#7c5cff'), V('ミント', '#4fd1a5'), V('サンセット', '#ff7a59'), V('ブラック', '#2b2a33')], '厚手コットンでくたっとしにくい。胸元のスターがさりげないポイント。'],
  ['hoodie', 'fashion', 'hoodie', 'ヘビーウェイト パーカー', 'KUMO WEAR', 6980, 8980, [V('マスタード', '#ffb84d'), V('ピンク', '#ff8fab'), V('スカイ', '#74c0fc'), V('グレー', '#a0a4b0')], '裏起毛であったか。大きめフードとカンガルーポケットで頼れる一着。'],
  ['sneaker', 'fashion', 'sneaker', 'クラウドラン スニーカー', 'ORBIT', 12800, 15800, [V('コーラル', '#ff5a5f', { c2: '#ffffff' }), V('ラベンダー', '#a78bfa', { c2: '#ffd23f' }), V('ミント', '#34d399', { c2: '#ffffff' }), V('ブラック', '#2b2a33', { c2: '#ff4d6d' })], '雲の上を歩くようなクッション性。どんなコーデにも合わせやすいワンカラー。'],
  ['cap', 'fashion', 'cap', 'ロゴ キャップ', 'ORBIT', 3980, 0, [V('グリーン', '#22c55e'), V('ネイビー', '#1e3a8a'), V('ピンク', '#f472b6'), V('ベージュ', '#d6b48c')], '深めのかぶり心地で小顔見え。サイズ調整できるアジャスター付き。'],
  ['handbag', 'fashion', 'handbag', 'ミニ ハンドバッグ', 'Mellow Atelier', 15800, 19800, [V('ピンク', '#ff6b9a'), V('クリーム', '#f2e2c4'), V('ブラック', '#26252c'), V('ミント', '#7ad3b5')], 'ツヤのあるレザー調に、ゴールドの留め具。スマホと財布がすっぽり入るサイズ。'],
  ['sunglasses', 'fashion', 'sunglasses', 'ポップ サングラス', 'SUNNY DAY', 4980, 0, [V('レッド', '#ff4d6d', { c2: '#2b2140' }), V('イエロー', '#ffd23f', { c2: '#3a1c71' }), V('クリア', '#e5e7eb', { c2: '#7c3aed' })], 'ミラー調レンズがきらりと光る。UVカット率99%以上。'],
  ['watch', 'fashion', 'watch', 'シリコンバンド ウォッチ', 'TICKTOCK', 8800, 11000, [V('オレンジ', '#ff8a3d'), V('ブルー', '#3b82f6'), V('ピンク', '#f472b6'), V('ブラック', '#26252c')], '軽くてやわらかいバンドで一日中快適。10気圧防水。'],
  ['socks', 'fashion', 'socks', 'ボーダー ソックス 3足組', 'KUMO WEAR', 1290, 0, [V('レッド', '#ff6b6b', { c2: '#ffd166' }), V('ブルー', '#4dabf7', { c2: '#ffe066' }), V('グリーン', '#51cf66', { c2: '#ff8fab' })], '足元からテンションを上げるボーダー柄。かかとがずれにくい設計。'],
  ['beanie', 'fashion', 'beanie', 'リブニット ビーニー', 'KUMO WEAR', 2490, 0, [V('スカイ', '#4cc9f0'), V('ピンク', '#ff8fab'), V('イエロー', '#ffd23f'), V('グレー', '#8d99ae')], 'ふわふわのポンポン付き。折り返して深さを調整できます。'],
  ['backpack', 'fashion', 'backpack', 'デイリー バックパック 20L', 'ORBIT', 7980, 9980, [V('イエロー', '#ffd23f'), V('ネイビー', '#3d5a80'), V('レッド', '#ef476f'), V('オリーブ', '#8a9a5b')], 'PCスリーブと撥水生地で通勤・通学に。サイドポケットにボトルも入ります。'],
  // ---------- beauty ----------
  ['lipstick', 'beauty', 'lipstick', 'ベルベット リップスティック', 'HOSHI BEAUTY', 3300, 0, [V('ルージュ', '#e11d48'), V('コーラル', '#ff6f61'), V('ローズ', '#d1477a'), V('ヌード', '#c98b78')], 'ひと塗りで発色するベルベット質感。乾燥しにくい保湿成分配合。'],
  ['perfume', 'beauty', 'perfume', 'オードパルファム 50ml', 'Maison Mellow', 9800, 12800, [V('ピオニー', '#ff8fab'), V('シトラス', '#ffd23f'), V('オーシャン', '#4cc9f0'), V('ラベンダー', '#b197fc')], '宝石のようなキャップのボトル。香りの余韻がふわりと長く続きます。'],
  ['nailpolish', 'beauty', 'nailpolish', 'ネイルカラー 10ml', 'Paletta', 1100, 0, [V('ローズピンク', '#ff3d7f'), V('スカイ', '#4dabf7'), V('ミント', '#3fd0a6'), V('ラベンダー', '#a78bfa'), V('ゴールド', '#f4b400')], '速乾でムラなく塗れるネイルカラー。ぷっくりツヤ仕上げ。'],
  ['compact', 'beauty', 'compact', 'クッションファンデーション', 'HOSHI BEAUTY', 3850, 0, [V('ピンク', '#ffb3c7', { c2: '#f0c8a8' }), V('ラベンダー', '#cdb4ff', { c2: '#e9c1a0' }), V('ゴールド', '#f2c46d', { c2: '#d9a77e' })], 'ポンポンのせるだけでツヤ肌に。ミラー付きでお直しも楽ちん。'],
  ['lotion', 'beauty', 'lotion', '高保湿 化粧水 200ml', 'MOIST LAB', 1980, 0, [V('アクア', '#9ad1d4', { label: 'MOIST' }), V('ローズ', '#ffc2d1', { label: 'ROSE' }), V('シトラス', '#ffe29a', { label: 'VITA C' })], 'とろみのあるテクスチャーが肌にすっとなじむ。ポンプ式で使いやすい。'],
  ['handcream', 'beauty', 'handcream', 'ハンドクリーム 50g', 'Mellow Atelier', 1320, 0, [V('ピーチ', '#ffc6a5'), V('ラベンダー', '#d0bfff'), V('ミント', '#b2f2bb')], 'べたつかないのにしっとり。バッグに入れておきたいミニサイズ。'],
  ['brush', 'beauty', 'brush', 'メイクブラシ 2本セット', 'Paletta', 2980, 0, [V('ピンク', '#ff9fbf'), V('ゴールド', '#e6b86a'), V('ブラック', '#2b2a33')], '肌あたりのやさしい高密度毛。チークとアイシャドウ用の2本セット。'],
  ['palette', 'beauty', 'palette', '8色 アイシャドウパレット', 'Paletta', 4180, 5280, [V('ピンク', '#f8b4c8'), V('ラベンダー', '#c8b6ff'), V('ピーチ', '#ffcfa8')], '毎日使えるブラウンから遊べるカラーまで。大きめミラー付き。'],
  // ---------- health / drugstore ----------
  ['blister', 'health', 'blister', '鼻すっきりカプセル 24カプセル', 'dopa製薬', 1480, 0, [V('レッド', '#ff5d73'), V('ブルー', '#4dabf7'), V('グリーン', '#40c057')], '季節のムズムズに。1日2回のカプセルタイプ。（架空の商品です）'],
  ['pillbottle', 'health', 'pillbottle', 'ビタミンC 1000mg 90粒', 'VITA BOX', 1680, 2280, [V('ビタミンC', '#ff9f1c', { label: 'VITAMIN C', sub: '1000mg · 90粒' }), V('マルチビタミン', '#8b5cf6', { label: 'MULTI', sub: '12種のビタミン' }), V('鉄分', '#e63946', { label: 'IRON', sub: 'ヘム鉄 · 60粒' })], '毎日の栄養補給に。飲みやすい小粒タイプ。'],
  ['eyedrops', 'health', 'eyedrops', 'クール目薬 12ml', 'dopa製薬', 780, 0, [V('クール', '#4cc9f0'), V('マイルド', '#ff9fbf'), V('ビタミン', '#ffd23f')], 'ひと差しで目もとスッキリ。画面を見る時間が長い日に。（架空の商品です）'],
  ['bandage', 'health', 'bandage', '防水 ばんそうこう 50枚', 'CARE+', 498, 0, [V('ベージュ', '#f1c3a0'), V('ピンク', '#ffb3c7'), V('ブルー', '#a5d8ff')], '水に強くてはがれにくい。肌にやさしい通気性素材。'],
  ['thermometer', 'health', 'thermometer', '15秒 電子体温計', 'CARE+', 1980, 2480, [V('ブルー', '#4f8cff'), V('ピンク', '#ff8fab'), V('ミント', '#3fd0a6')], 'わきで約15秒のスピード検温。見やすいバックライト付き。'],
  ['gummies', 'health', 'gummies', 'ビタミングミ 30日分', 'VITA BOX', 1280, 0, [V('ミックス', '#ff4d6d', { mixed: true }), V('ストロベリー', '#ff4d6d'), V('オレンジ', '#ff8c1a'), V('グレープ', '#9b5de5')], 'おやつ感覚でビタミン補給。ぷるぷるのくま型グミ。'],
  ['mask', 'health', 'mask', '不織布マスク 50枚', 'CARE+', 698, 980, [V('ホワイト', '#eef2f9'), V('ピンク', '#ffd6e0'), V('ラベンダー', '#e2d9ff'), V('グレー', '#b8bcc8')], '立体プリーツで息がしやすい。耳が痛くなりにくいやわらかゴム。'],
  ['firstaid', 'health', 'firstaid', '救急箱 Sサイズ', 'CARE+', 2980, 0, [V('レッド', '#ff4757'), V('ホワイト', '#f4f4f6'), V('ミント', '#63e6be')], 'もしもの備えをひとまとめ。持ち手付きで出し入れしやすい。'],
  ['protein', 'health', 'protein', 'ホエイプロテイン 1kg', 'PUMP UP', 4980, 5980, [V('チョコ', '#26252c', { c2: '#ff4d6d', sub: 'CHOCOLATE' }), V('ストロベリー', '#ff6b9a', { c2: '#26252c', sub: 'STRAWBERRY' }), V('バニラ', '#f2e8cf', { c2: '#d4a373', sub: 'VANILLA' })], '溶けやすく、おいしく続けられる。1杯でたんぱく質20g。'],
  // ---------- home ----------
  ['sofa', 'home', 'sofa', '3人掛け ファブリックソファ', 'NEST', 49800, 64800, [V('ブルー', '#7c9cff', { c2: '#ffd166' }), V('ピンク', '#ff9fb2', { c2: '#7c9cff' }), V('マスタード', '#e9b44c', { c2: '#ff8fab' }), V('グリーン', '#6fbf8e', { c2: '#ffd166' })], 'ふっくらクッションに包まれる座り心地。カバーは外して洗えます。'],
  ['lamp', 'home', 'lamp', 'きのこ テーブルランプ', 'NEST', 6980, 0, [V('ピンク', '#ffb3c1'), V('ミント', '#9ee6cf'), V('イエロー', '#ffd970'), V('ホワイト', '#f4f4f6')], 'ころんとしたきのこ型。やわらかな光で部屋の空気がほどけます。'],
  ['plant', 'home', 'plant', '観葉植物 ポトス 5号鉢', 'GREEN ROOM', 3480, 0, [V('ピンク鉢', '#ff8fab'), V('ホワイト鉢', '#efeff2'), V('テラコッタ', '#d9825b'), V('ブルー鉢', '#7aa7ff')], '育てやすくて丈夫なポトス。ツヤのある葉が部屋を明るくします。'],
  ['cactus', 'home', 'cactus', 'ミニサボテン 鉢付き', 'GREEN ROOM', 1280, 0, [V('テラコッタ', '#e07a5f'), V('ピンク', '#ffafcc'), V('イエロー', '#ffd166')], '水やりは月に数回でOK。小さな花が咲くとうれしい。'],
  ['clock', 'home', 'clock', 'レトロ 目覚まし時計', 'TICKTOCK', 3280, 3980, [V('レッド', '#ff6b6b'), V('ミント', '#40c9a2'), V('イエロー', '#ffc93c'), V('ネイビー', '#3d5a80')], 'ジリリと鳴るベル式。静かなスイープ秒針で夜も気になりません。'],
  ['chair', 'home', 'chair', 'ダイニングチェア', 'NEST', 12800, 0, [V('マスタード', '#ffb703'), V('テラコッタ', '#e76f51'), V('セージ', '#8ab17d'), V('ブルー', '#6c8cff')], '天然木の脚にやわらかなファブリック。長く座っても疲れにくい。'],
  ['vase', 'home', 'vase', 'フラワーベース チューリップ付き', 'GREEN ROOM', 4280, 0, [V('ブルー', '#6c8cff', { c2: '#ff6b8b' }), V('ホワイト', '#f1f1f4', { c2: '#ffb703' }), V('ピンク', '#ff9fb2', { c2: '#ff4d6d' })], '曲線がきれいな陶器のベース。季節のチューリップを添えてお届け。'],
  ['mug', 'home', 'mug', 'ぽってりマグカップ 350ml', 'NEST', 1650, 0, [V('オレンジ', '#ff8c42'), V('ブルー', '#4dabf7'), V('ピンク', '#ff8fab'), V('グリーン', '#69db7c')], '手になじむぽってりフォルム。電子レンジ・食洗機OK。'],
  ['cushion', 'home', 'cushion', 'ふわふわクッション 45cm', 'NEST', 2480, 0, [V('ピンク', '#ff8fab', { c2: '#ffd166' }), V('ブルー', '#74c0fc', { c2: '#ffa94d' }), V('ラベンダー', '#b197fc', { c2: '#96f2d7' })], 'ぎゅっと抱きしめたくなる弾力。2個セットで色合わせも楽しい。'],
  ['candle', 'home', 'candle', 'アロマキャンドル 200g', 'Mellow Atelier', 2980, 0, [V('ピオニー', '#ffd6e0', { label: 'PEONY' }), V('ラベンダー', '#e5dbff', { label: 'LAVENDER' }), V('シトラス', '#fff3bf', { label: 'CITRUS' })], 'ゆらめく炎とやさしい香り。ガラスジャーは小物入れに再利用できます。'],
  // ---------- tech ----------
  ['headphones', 'tech', 'headphones', 'ワイヤレス ヘッドホン', 'ORBIT AUDIO', 19800, 24800, [V('パープル', '#8b5cf6'), V('ホワイト', '#eef0f4'), V('ピンク', '#ff8fab'), V('ブラック', '#2b2a33')], 'ノイズキャンセリングで自分だけの世界へ。最大40時間再生。'],
  ['speaker', 'tech', 'speaker', 'スマートスピーカー', 'ORBIT AUDIO', 7980, 0, [V('ピンク', '#f4a3c0', { c2: '#5ee7ff' }), V('グレー', '#a5a9b4', { c2: '#7dffb2' }), V('ブルー', '#7aa7ff', { c2: '#ffd166' })], '360°に広がるサウンド。光るリングが声に反応します。'],
  ['controller', 'tech', 'controller', 'ワイヤレス ゲームコントローラー', 'PLAYTOY', 6980, 0, [V('ブルー', '#4cc9f0'), V('ピンク', '#ff8fab'), V('ホワイト', '#eef0f4'), V('ブラック', '#2b2a33')], '手にしっくりなじむグリップ。振動機能付きで没入感アップ。'],
  ['camera', 'tech', 'camera', 'インスタントカメラ', 'SNAP', 13800, 16800, [V('ミント', '#a0e7e5'), V('ピンク', '#ffaec9'), V('イエロー', '#ffe08a'), V('ラベンダー', '#cdb4ff')], '撮ったその場でプリント。思い出が手のひらサイズで残ります。'],
  ['phone', 'tech', 'phone', 'スマートフォン 128GB', 'ORBIT', 79800, 89800, [V('ピンク', '#ff8fab'), V('ブルー', '#74c0fc'), V('グリーン', '#8ce99a'), V('ブラック', '#2b2a33')], 'ツヤのあるガラスボディに高精細デュアルカメラ。一日中もつバッテリー。'],
  ['earbuds', 'tech', 'earbuds', '完全ワイヤレスイヤホン', 'ORBIT AUDIO', 9980, 12800, [V('ホワイト', '#f6f6f8', { c2: '#7dffb2' }), V('ピンク', '#ffc2d1', { c2: '#ffffff' }), V('ブラック', '#2f2e36', { c2: '#5ee7ff' })], '耳にすっぽり収まる小型設計。ケース込みで最大30時間。'],
  ['keyboard', 'tech', 'keyboard', 'コンパクト メカニカルキーボード', 'PLAYTOY', 11800, 0, [V('ピンク', '#ffd6e0', { c2: '#ff6b8b' }), V('ブルー', '#d0ebff', { c2: '#339af0' }), V('レモン', '#fff3bf', { c2: '#fab005' })], 'コトコト心地いい打鍵感。デスクがぱっと明るくなるカラーキー。'],
  ['hairdryer', 'tech', 'hairdryer', '大風量 ヘアドライヤー', 'AIRY', 8980, 11800, [V('ラベンダー', '#c3aed6'), V('ピンク', '#ffb3c7'), V('ミント', '#96f2d7')], 'たっぷりの風で速乾。髪がまとまりやすいマイナスイオン搭載。'],
  // ---------- daily ----------
  ['toiletpaper', 'daily', 'toiletpaper', 'トイレットペーパー 12ロール', 'SOFTY', 698, 0, [V('ホワイト', '#ffffff'), V('ピンク', '#ffe3ea'), V('ミント', '#e0f7f4')], 'ふんわりやわらかい2枚重ね。エンボス加工で肌ざわりなめらか。'],
  ['detergent', 'daily', 'detergent', '濃縮 洗濯洗剤 1.2L', 'CLEAN UP', 598, 798, [V('フレッシュ', '#4cc9f0', { label: 'CLEAN' }), V('フローラル', '#ff8fab', { label: 'FLORAL' }), V('シトラス', '#ffd23f', { label: 'CITRUS' })], '少ない量でしっかり洗える濃縮タイプ。部屋干しのにおいも防ぎます。'],
  ['toothbrush', 'daily', 'toothbrush', '歯ブラシ 2本セット', 'SMILE', 398, 0, [V('ブルー×ピンク', '#7bdff2', { c2: '#ff8fab' }), V('グリーン×イエロー', '#8ce99a', { c2: '#ffd43b' })], '奥まで届くコンパクトヘッド。家族で色分けできる2本セット。'],
  ['sponge', 'daily', 'sponge', 'キッチンスポンジ 5個', 'CLEAN UP', 298, 0, [V('イエロー', '#ffd23f', { c2: '#4caf50' }), V('ピンク', '#ffa8c5', { c2: '#7048e8' }), V('ブルー', '#74c0fc', { c2: '#1c7ed6' })], 'もこもこの泡立ちで洗い物がはかどる。へたりにくい高密度タイプ。'],
  ['soap', 'daily', 'soap', '固形せっけん 3個', 'SOFTY', 880, 0, [V('ミント×ピンク', '#b8f2e6', { c2: '#ffd6e0' }), V('レモン×ラベンダー', '#fff3b0', { c2: '#d0bfff' })], 'ころんとした形のやさしいせっけん。もちもちの泡で洗えます。'],
  ['umbrella', 'daily', 'umbrella', '晴雨兼用 長傘', 'SUNNY DAY', 2980, 0, [V('レッド', '#ff5a5f'), V('ブルー', '#3a86ff'), V('イエロー', '#ffbe0b'), V('ミント', '#2ec4b6')], '雨の日が楽しみになるキャンディカラー。日傘としても使えます。'],
  ['tumbler', 'daily', 'tumbler', '保温保冷 タンブラー 500ml', 'MORNING DOPA', 2480, 0, [V('グリーン', '#90be6d'), V('ピンク', '#f9a8d4'), V('ブルー', '#74c0fc'), V('ブラック', '#2b2a33')], '真空断熱で温かさも冷たさも長持ち。持ち運びやすいハンドル付き。'],
  ['tissue', 'daily', 'tissue', 'ボックスティッシュ 5箱', 'SOFTY', 548, 0, [V('ピーチ', '#ffd6a5', { c2: '#ff8fab' }), V('ミント', '#c3fae8', { c2: '#20c997' }), V('レモン', '#fff3bf', { c2: '#fab005' })], 'ドット柄の箱で出しっぱなしでもかわいい。しっとりやわらか。'],
  // ---------- hobby ----------
  ['duck', 'hobby', 'duck', 'ラバーダック', 'PLAYTOY', 680, 0, [V('イエロー', '#ffd23f'), V('ピンク', '#ff8fab'), V('ブルー', '#74c0fc'), V('グリーン', '#69db7c')], 'お風呂にぷかぷか。つぶらな瞳に癒やされます。'],
  ['blocks', 'hobby', 'blocks', 'カラフル積み木 50ピース', 'PLAYTOY', 3980, 4980, [V('レインボー', '#ff5d73'), V('パステル', '#ffb3c1'), V('オーシャン', '#4dabf7')], 'なめらかに磨いた木製ブロック。積んで、並べて、崩して遊べる。'],
  ['beachball', 'hobby', 'beachball', 'ビーチボール 50cm', 'SUNNY DAY', 580, 0, [V('レッド', '#ff4d6d'), V('ブルー', '#4dabf7'), V('グリーン', '#40c057')], '夏の主役。ふくらませるだけでテンションが上がります。'],
  ['dumbbell', 'hobby', 'dumbbell', 'ダンベル 2kg × 2', 'PUMP UP', 2980, 0, [V('レッド', '#ff5d73'), V('ブルー', '#4dabf7'), V('パープル', '#9775fa'), V('ブラック', '#343a40')], '転がりにくい六角形。お部屋に置いてもかわいいカラーダンベル。'],
  ['skateboard', 'hobby', 'skateboard', 'コンプリート スケートボード', 'ORBIT', 9800, 0, [V('パープル', '#7c5cff', { c2: '#ffd23f' }), V('ピンク', '#ff6b9a', { c2: '#7dffb2' }), V('グリーン', '#2ec4b6', { c2: '#ff9f1c' })], 'すぐに乗れる完成品。やわらかウィールで街乗りも快適。'],
  ['teddy', 'hobby', 'teddy', 'くまのぬいぐるみ M', 'Mocchi', 3480, 4280, [V('ブラウン', '#c98a5a', { c2: '#ff4d6d' }), V('ピンク', '#ffb3c7', { c2: '#7048e8' }), V('ホワイト', '#f4efe8', { c2: '#4dabf7' })], 'もちもち手ざわりのくまさん。蝶ネクタイがチャームポイント。'],
  ['ukulele', 'hobby', 'ukulele', 'ソプラノ ウクレレ', 'ALOHA', 6980, 8980, [V('ナチュラル', '#d9a066'), V('ピンク', '#ff9fb2'), V('ミント', '#8ce99a'), V('ブルー', '#74c0fc')], 'やさしい音色で初めての楽器にぴったり。チューナー付き。'],
  ['dice', 'hobby', 'dice', 'ジャンボ サイコロ 2個', 'PLAYTOY', 480, 0, [V('レッド', '#ff4d6d'), V('ミント', '#63e6be'), V('イエロー', '#ffd43b')], 'ころころ転がるツヤツヤのジャンボサイコロ。ボードゲームのおともに。'],
];

/* deterministic pseudo-random per product so ratings/stock are stable */
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }

const BADGE_POOL = ['ベストセラー', '新着', '限定カラー', '人気急上昇'];
export const PRODUCTS = RAW.map(([id, cat, model, name, brand, price, list, variants, desc], i) => {
  const r1 = hash(id), r2 = hash(id + 'r'), r3 = hash(id + 's');
  const p = {
    id, cat, model, name, brand, price, list: list || 0, variants, desc,
    rating: Math.min(4.9, Math.round((3.9 + r1 * 1.05) * 10) / 10),
    reviews: Math.round(30 + Math.pow(r2, 2) * 4800),
    stock: 3 + Math.floor(r3 * 36),
    badge: r2 > 0.78 ? BADGE_POOL[Math.floor(r1 * 4)] : '',
    order: i,
  };
  p.sale = !!p.list && r3 < 0.72;
  return p;
});
export const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
export const catById = Object.fromEntries(CATS.map((c) => [c.id, c]));
export const offPct = (p) => (p.list ? Math.round((1 - p.price / p.list) * 100) : 0);

/* ---------- tile colors: a soft backdrop tinted by the product's color ---------- */
function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
const hslStr = (h, s, l) => `hsl(${h.toFixed(0)} ${(s * 100).toFixed(0)}% ${(l * 100).toFixed(0)}%)`;
const tileMemo = new Map();
export function tile(hex, dark = false) {
  const key = hex + dark;
  if (tileMemo.has(key)) return tileMemo.get(key);
  let [h, s] = hexToHsl(hex);
  if (s < 0.14) { h = 245; s = 0.14; }
  const out = dark
    ? [hslStr(h, Math.min(0.38, s * 0.42 + 0.1), 0.25), hslStr(h, Math.min(0.32, s * 0.36 + 0.08), 0.15)]
    : [hslStr(h, Math.min(0.8, s * 0.75 + 0.22), 0.94), hslStr(h, Math.min(0.62, s * 0.62 + 0.16), 0.86)];
  tileMemo.set(key, out);
  return out;
}

/* ---------- reviews ---------- */
const NAMES = ['ゆうこ', 'たける', 'mii', 'Haru', 'さくら', 'ken', 'なな', 'りょう', 'あおい', 'Sora', 'まい', 'ひなた'];
const LINES = [
  '届いた瞬間テンションが上がりました！',
  '色が写真どおりでとってもかわいい。',
  'リピート確定です。家族にも好評でした。',
  '思っていたより存在感があって満足。',
  'ギフトにしたらすごく喜ばれました。',
  '毎日使っています。買ってよかった！',
  'コスパ最高。別の色も買い足しました。',
  '梱包が丁寧で、開ける前からワクワクしました。',
  '友達に「どこで買ったの？」と聞かれました。',
  '届くのが早すぎてびっくり。',
];
export function reviewsFor(p) {
  const out = [], n0 = Math.floor(hash(p.id + 'nm') * NAMES.length), l0 = Math.floor(hash(p.id + 'ln') * LINES.length);
  for (let i = 0; i < 3; i++) {
    const r = hash(p.id + 'rv' + i);
    out.push({ name: NAMES[(n0 + i * 5) % NAMES.length], stars: r > 0.18 ? 5 : 4, text: LINES[(l0 + i * 3) % LINES.length], days: 1 + Math.floor(r * 27) + i * 4 });
  }
  return out;
}
export function ratingBars(p) {
  const five = Math.round(48 + (p.rating - 3.9) * 40), four = Math.round((100 - five) * 0.62), three = Math.round((100 - five - four) * 0.6);
  return [five, four, three, Math.max(0, 100 - five - four - three - 1), 1];
}

export function search(q, cat = 'all') {
  const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return PRODUCTS.filter((p) => {
    if (cat !== 'all' && p.cat !== cat) return false;
    if (!terms.length) return true;
    const c = catById[p.cat];
    const hay = `${p.name} ${p.brand} ${c.name} ${c.words} ${p.variants.map((v) => v.n).join(' ')}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}
