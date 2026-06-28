# さうんどあっぷ（Sound App）

## 概要

スマートフォンに保存したローカル音声ファイルを、タイマーやアラームのトリガーで自動再生する汎用サウンドアプリ。

ドライブ中の音声アシスタント再生をメインユースケースとしつつ、作業用BGMのランダム再生やポモドーロタイマーとの連携など、幅広い用途に対応する。

---

## 実現したい体験

- ローカルに保存したMP3をタイマー間隔で自動再生
- BGMを少し下げて（Audio Ducking）再生後、元の音量へ自動復帰
- ランダム再生で飽きない
- Android Auto接続中にも動作
- プロジェクト単位でセリフ・音声セットを管理

ユースケース例:

> **ドライブ用**: 30分ごとにキャラクター音声が「そろそろ休憩しませんか？」と話しかける
>
> **作業用**: ポモドーロ25分後に通知音＋音声が「休憩しましょう」と再生される
>
> **家事用**: 洗濯完了のタイミングに合わせた音声リマインダー

---

## 技術スタック

### フレームワーク構成

| レイヤー | 技術 | 理由 |
|---|---|---|
| UI | Vue 3 + TypeScript | 既存スキルを活用、開発効率が高い |
| ネイティブブリッジ | Capacitor | VueをAndroidアプリ化する最短経路 |
| ネイティブ拡張 | Capacitor Plugin（Kotlin） | バックグラウンド再生・Audio Duckingなど必要箇所のみ |
| ビルド環境 | Android Studio（Windows/Linux可） | Xcode不要、Mac不要 |

補足:

- UI スタイリングは Tailwind CSS + daisyUI を採用する。Capacitor は WebView 上で Vue アプリを描画するため、daisyUI のような CSS ベースの UI ライブラリも利用可能。
- 画面実装では scoped style への個別依存を避け、utility class 主体でレイアウトを組む。

### Capacitorを選ぶ理由

- Vue/TypeScript/FastAPIの既存スキルをそのまま活用できる
- Webベースの開発で高速にPoC〜本番まで到達できる
- 必要な部分（バックグラウンド再生・Audio Ducking）だけKotlinプラグインで補える
- Android StudioはWindowsでも動作するためMac不要

### iOSの将来対応

- CapacitorはiOSビルドにも対応しているため、将来Mac入手時にSwiftへの全面書き直し不要でiOS版を出せる

---

## 想定アーキテクチャ

```text
┌─────────────────────────┐
│   Vue 3 UI (WebView)    │
│   - プロジェクト管理     │
│   - タイマー設定         │
│   - 再生コントロール     │
└────────────┬────────────┘
             │ Capacitor Bridge
             ▼
┌─────────────────────────┐
│   Capacitor Plugin      │
│   (Kotlin)              │
│   - バックグラウンド再生  │
│   - Audio Ducking       │
│   - Android Auto連携    │
│   - ファイルアクセス     │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│   Android API           │
│   - MediaPlayer         │
│   - AudioManager        │
│   - ForegroundService   │
│   - MediaSession        │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│   ローカルMP3ファイル    │
└─────────────────────────┘
```

---

## ディレクトリ構成

### 方針

既存プロジェクトの構造（`api / assets / components / composable / router / stores / types / views`）をそのまま踏襲する。このアプリ固有の追加点は以下の2点のみ。

- **`plugins/`**: Capacitorブリッジ（ネイティブ機能の呼び出し口）を集約する。`api/`はHTTP通信専用とし、ネイティブAPIとは明確に分離する。
- **`components/feature/`配下をドメインで分割**: 画面数が多いため `project/`・`config/`・`playback/` のサブディレクトリで整理する。

### ツリー構造

```text
frontend/src
├── App.vue
├── main.ts
│
├── api/                          # HTTP通信（将来のFastAPI連携用）
│   ├── index.ts                  # axiosインスタンス・共通設定
│   └── sound.ts                  # セリフ・カテゴリ取得API（将来実装）
│
├── assets/
│   ├── base.css
│   ├── main.css
│   └── tailwind.css
│
├── components/
│   ├── common/                   # アプリ全体で使い回す汎用コンポーネント
│   │   ├── AppBottomNav.vue      # BottomNavigation
│   │   ├── AppHeader.vue         # 画面ヘッダー（戻るボタン等）
│   │   ├── ConfirmDialog.vue     # 削除確認などの共通ダイアログ
│   │   └── StarButton.vue        # お気に入りトグルボタン
│   │
│   └── feature/                  # 機能ドメイン別コンポーネント
│       ├── project/
│       │   ├── ProjectCard.vue   # プロジェクト一覧の1件カード
│       │   └── ProjectForm.vue   # 新規作成・編集フォーム（モーダル）
│       ├── config/
│       │   ├── ConfigCard.vue    # 設定ファイル一覧の1件カード
│       │   ├── ConfigForm.vue    # 設定ファイル編集フォーム
│       │   ├── TimerInput.vue    # DD/hh/mm入力コンポーネント
│       │   └── FilePickerButton.vue  # SAF経由のファイル/フォルダ選択
│       └── playback/
│           ├── PlaybackStatus.vue    # 再生中ステータス表示
│           └── HistoryItem.vue       # 再生履歴の1件行
│
├── composable/                   # 再利用ロジック（useXxx形式）
│   ├── useProject.ts             # プロジェクトCRUD操作
│   ├── useConfig.ts              # 設定ファイルCRUD操作
│   ├── usePlayback.ts            # 再生開始・停止・状態管理
│   └── useFilePicker.ts          # SAFファイル選択ラッパー
│
├── plugins/                      # Capacitorブリッジ（ネイティブAPI呼び出し口）
│   ├── index.ts                  # 各プラグインのre-export
│   ├── audioPlayer.ts            # 音声再生・Audio Ducking
│   ├── backgroundService.ts      # ForegroundService 開始・停止
│   └── filePicker.ts             # Storage Access Framework
│
├── router/
│   └── index.ts
│
├── stores/                       # Pinia
│   ├── project.ts                # プロジェクト一覧・選択中プロジェクト
│   ├── config.ts                 # 設定ファイル一覧・選択中設定
│   └── playback.ts               # 再生状態・履歴
│
├── types/
│   ├── project.ts                # Project interface
│   ├── config.ts                 # Config interface
│   └── playback.ts               # PlaybackHistory interface 等
│
└── views/
    ├── HomeView.vue              # ホーム（再生履歴）
    ├── ProjectListView.vue       # プロジェクト一覧
    ├── ProjectDetailView.vue     # プロジェクト詳細（設定ファイル一覧）
    ├── ConfigDetailView.vue      # 設定ファイル詳細・編集
    └── SettingsView.vue          # アプリ設定
```

### 既存構造との対応関係

| 既存プロジェクト | このアプリ | 変更内容 |
|---|---|---|
| `api/` | `api/` | 同じ。HTTP通信のみ。Capacitor呼び出しは`plugins/`へ分離 |
| `components/feature/` | `components/feature/project,config,playback/` | 機能増加に伴いサブディレクトリで分割 |
| `components/header/` | `components/common/AppHeader.vue` | `common/`に統合 |
| `composable/` | `composable/` | 同じ。`useXxx`形式を踏襲 |
| `stores/` | `stores/` | 同じ。Pinia。ドメインごとにファイル分割 |
| `types/` | `types/` | 同じ |
| `views/` | `views/` | 同じ |
| ―（新規） | `plugins/` | Capacitorブリッジ専用。ネイティブAPIはここだけが知る |

---

## データモデル

### プロジェクト

アプリの管理単位。用途ごとにプロジェクトを分けて使う。

```typescript
interface Project {
  id: string;
  name: string;         // 例: "ドライブ用ヌヌちゃん"
  description: string;
  starred: boolean;
  enabled: boolean;
  configs: Config[];    // このプロジェクトに紐づく設定ファイル一覧
}
```

### 設定ファイル（Config）

1プロジェクトに複数作成できる再生ルールセット。

```typescript
interface Config {
  id: string;
  projectId: string;
  name: string;               // 例: "設定ファイル1"
  description: string;
  timerType: "timer" | "alarm";
  interval: {                 // タイマーモード: DD日HH時間mm分
    days: number;
    hours: number;
    minutes: number;
  };
  alarmTime?: string;         // アラームモード: HH:mm
  requireActionOnEnd: boolean; // タイマー終了時/アラーム時の操作
  targetPath: string;         // 再生対象のファイルまたはフォルダパス
  playbackMode: "random" | "sequential";
  audioDucking: boolean;      // BGM音量を下げて再生するか
  enabled: boolean;
}
```

---

## MVP機能

### 必須

- [ ] プロジェクトのCRUD
- [ ] 設定ファイルのCRUD
- [ ] ローカルMP3ファイル・フォルダの選択
- [ ] タイマー間隔での自動再生
- [ ] ランダム / 順番再生
- [ ] バックグラウンド動作（ForegroundService）
- [ ] Audio Ducking（BGMを一時的に下げて再生）

### 優先度高

- [ ] Android Auto対応（MediaSession連携）
- [ ] 再生履歴の表示
- [ ] お気に入りプロジェクト（スター機能）

### 対象外（MVP）

- ログイン・アカウント機能
- クラウド同期
- SNS連携
- 課金
- オンライン音声ダウンロード

---

## 設計上の決定事項

### データ永続化

アプリ内部ストレージ（`/data/data/<package>/files/`）にJSONファイルとして保存する。

- ユーザには不可視・アプリ削除時に自動削除されるため、外部に余計なファイルを残さない
- プロジェクト・設定ファイルの件数は個人利用の範囲に留まる想定のためSQLite移行は不要
- 将来的に件数が増えてパフォーマンス問題が出た場合にRoomへ移行を検討する

### 再生中の状態管理

ForegroundService をSSoT（信頼できる唯一の情報源）とする。

- タイマー・再生状態はすべてForegroundService（Kotlin）側で管理する
- ForegroundServiceが**1分ごと**に残り時間・再生状態をCapacitorイベントでVue側へ通知する
- Vue / Piniaは受け取った状態を画面表示に反映するだけ（表示用キャッシュ）
- アプリ起動・復帰時はForegroundServiceへ現在状態を問い合わせて復元する

### タイマー設定の制約

- タイマー間隔は**1分以上**のみ指定可能とする（状態同期の間隔が1分のため）

### 再生の競合制御

複数の設定ファイルが同時にONの場合、再生タイミングが重なることがある。音声の同時再生・重複再生は行わない。

```text
ルール: 再生中は割り込み禁止。後から来たトリガーはキューに積む。

例:
  15:00:00  設定A・設定Bのトリガーがほぼ同時に発火
              └─ 先に処理された設定Aの音声を再生開始
              └─ 設定Bはキューへ
  15:00:12  設定Aの音声（12秒）終了
              └─ キューの設定Bを再生開始
```

- 再生中フラグ（`isPlaying`）をForegroundService側で管理し、フラグがtrueの間はすべてのトリガーをキューに追加する
- キューはFIFO（受け付けた順）で処理する
- キューの上限は設ける（暫定10件。超えた場合は古いものから破棄）

---

## Android固有の技術課題

### バックグラウンド再生

- `ForegroundService` + 通知チャンネルで常駐
- Android 13以降は `POST_NOTIFICATIONS` 権限が必要
- Dozeモード対策として `WakeLock` の適切な利用が必要

### Audio Ducking

**これはこのアプリの最重要仕様。** YoutubeMusic・Spotify等の音楽再生中に、音楽側の音量を自動で下げた上で音声ファイルを再生し、終了後に音量を戻す。

```text
YoutubeMusic再生中（音量100%）
  │
  ├─ トリガー発火
  │    └─ AudioFocus取得 → YoutubeMusicが自動で音量を下げる（約30%）
  │    └─ 音声ファイル再生
  │    └─ 音声ファイル終了
  │    └─ AudioFocus解放 → YoutubeMusicが音量100%に復帰
  │
YoutubeMusic再生継続（音量100%）
```

実装方法：

- `AudioManager.requestAudioFocus()` で `AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK` を指定して取得
- 再生終了後に `abandonAudioFocus()` でフォーカスを解放
- 競合ルール（キュー処理）と組み合わせる場合は、キュー内の音声ファイルを連続再生している間はAudioFocusを保持し続け、キューが空になった時点で解放する（都度取得・解放するとYoutubeMusicの音量が細かく上下してしまうため）

注意点：

- Duckingに応じるかどうかは**再生アプリ側の実装に依存する**。YoutubeMusic・Spotify・Apple Music等の主要アプリは対応しているが、すべてのアプリで動作を保証することはできない
- AndroidのAudioFocusはOS側の仕組みのため、どのアプリが鳴っていても同じAPIで制御できる

### Android Auto対応

- `MediaBrowserService` + `MediaSession` の実装が必要
- Android Auto対応アプリとしてGoogleに申請が必要（個人利用であれば開発者モードで回避可能）
- Capacitorプラグインとして実装し、VueからブリッジAPI経由で操作

### ファイルアクセス

- Android 10以降はスコープドストレージのため `SAF（Storage Access Framework）` を使用
- CapacitorのFilesystemプラグインまたはカスタムプラグインで対応

---

## 画面構成（モック準拠）

```text
BottomNavigation
├── ホーム（履歴）         - 最近使ったプロジェクト一覧
├── プロジェクト一覧       - 全プロジェクト管理
└── アカウント/設定        - アプリ全体設定

プロジェクト詳細
└── 設定ファイル一覧（各カードにON/OFFトグル）
    └── 設定ファイル詳細
        - タイマー/アラーム設定（タイマーは1分以上のみ）
        - 再生対象ファイル選択
        - 再生方法設定
        - Audio Ducking ON/OFF

UI実装メモ:

- ホーム/プロジェクト一覧/設定ファイル一覧の各行は、右側を「三点メニュー + 有効/無効トグル」で統一する。
- 三点メニュー押下時に「編集・削除」を表示し、編集は詳細/編集画面へ遷移する。
- 削除は即時実行せず、確認モーダルで「はい」を押した場合のみ実行する。
- ヘッダーは中央タイトルを優先し、左右アクション有無に関係なくタイトルが中央に見える固定幅レイアウトを使う。
- 設定ファイル詳細の `タイマー/アラーム` は、選択中ではない入力群を相互に disabled にする。
  - `timer` 選択中: `再生間隔` を有効、`日時設定` を disabled
  - `alarm` 選択中: `日時設定` を有効、`再生間隔` を disabled
- `日時設定` は年/月/日/時/分を個別に指定できる UI にする。
- `次回実行条件`（旧: タイマー終了時/アラーム時の操作）は、ON のとき「操作があるまで次回タイマーを停止」の意味で扱う。既定値は OFF。
- `再生対象` は `ファイル追加` と `フォルダ追加` をサポートし、音声ファイルのみを受け付ける。
  - 許可例: mp3/wav/m4a/aac/ogg/flac
  - 非対応ファイルは除外して件数を表示
- 選択結果は `アイテム` セクションに表示し、`アイテム` 以下の確認ラベルで現在の設定（再生間隔/日時設定/再生方法/次回実行条件）を可視化する。
- `設定` ボタンは当面ストア更新のみ接続し、JSON書き出し（永続化）は後続 Phase で実装する。
```

---

## 開発ロードマップ

### Phase 0: 画面先行（現在）

- モック準拠で画面を先に整える（一覧、詳細、設定）
- 一覧行の操作導線を確定する（三点メニュー -> 編集/削除 -> 確認モーダル）
- 画面ごとのレイアウト・タイポ・余白を先に固める

### Phase 1: 画面に処理を接続

- プロジェクト/設定ファイルのCRUDを各画面導線に接続
- トグル・編集遷移・削除確認の挙動を実装
- 単体テストで主要導線（編集・削除・トグル）を固定化

### Phase 2: Capacitor導入 + Androidプロジェクト生成

- Capacitor導入、`npx cap add android` で Android プロジェクトを生成
- WebView で既存 Vue UI が動作することを確認
- 必要な権限・通知チャンネル・ビルド設定の土台を整備

### Phase 3: project/config の永続化

- まずは JSON ベースのローカル永続化を実装
- アプリ再起動時に project/config 状態を復元
- データ破損時のフォールバック（初期データ復元）を追加

### Phase 4: 再生エンジン（本筋）

- ForegroundService によるバックグラウンド再生
- Audio Ducking 実装
- タイマー/アラームトリガーからのキュー再生制御

### Phase 5: Android Auto対応・品質向上

- MediaSession / MediaBrowserService 実装
- 再生履歴、エラーハンドリング、バッテリー最適化

---

## 開発環境

| 項目 | 内容 |
|---|---|
| 開発端末 | iPad（コーディング）+ Android実機（テスト） |
| IDE | Android Studio（Windows/Linux/クラウドIDEも可） |
| 言語 | Vue 3 + TypeScript（UI）、Kotlin（ネイティブプラグイン） |
| 経験 | TypeScript / Vue / FastAPI あり、Kotlin は新規習得 |

---

## 将来的な拡張案

### 音声カテゴリ管理

- 眠気対策 / 雑談 / 安全運転 / 応援 / 天候 など
- カテゴリ別のクールダウン設定

### 状況依存再生

- 時刻（深夜帯は別セリフ）
- 長時間再生中の検知
- GPS連携（SA付近で別音声など）

### FastAPI連携

サーバ側でセリフ・出現確率・カテゴリを管理する構成。

```json
{
  "id": "rest_01",
  "category": "safety",
  "cooldown": 1800,
  "file": "rest_01.mp3"
}
```

### iOS版

- Capacitorベースのため、Mac入手後にSwiftプラグインを追加するだけでiOS版ビルドが可能
- CarPlay対応はiOS版で改めて実装

---

## 最終目標

「スマートフォンに保存した音声を、好きなタイミングと間隔で自動再生できるアプリ」として、ドライブ・作業・家事など日常のあらゆるシーンで使えるツールを実現する。

ドライブ用途では「助手席に好きなキャラクターが座っていて、自然なタイミングで話しかけてくれる体験」を目指す。