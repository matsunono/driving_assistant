# driving_assistant

スマートフォンに保存したローカル音声ファイルを、タイマーやアラームで定期再生する Android アプリです。

## 概要

- フロントエンド: Vue 3 + TypeScript
- ネイティブ化: Capacitor
- Android ネイティブ再生: NativePlayback プラグイン（Java）

## 現在の実装状況（2026-07）

- 設定ファイル詳細画面から再生スケジュール開始/停止
- 即時再生
- 画面遷移後・バックグラウンドでの定期再生
- プロジェクト/設定ファイルの ON/OFF に連動した停止・再開
- 外部音声ファイルの実行時権限要求（READ_MEDIA_AUDIO / READ_EXTERNAL_STORAGE）
- Audio Focus（AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK）による ducking リクエスト

## セットアップ

前提:

- Node.js 22 以上
- Android Studio
- Android SDK

手順:

1. frontend で依存関係をインストール
2. Web アセットをビルド
3. Android へ同期

実行コマンド:

- cd frontend
- npm install
- npm run build
- npx cap sync android
- npx cap open android

## テスト

- 単体テスト: npm run test:unit
- 型チェック含むビルド: npm run build

## トラブルシューティング

### 端末が認識されない
- doc/wsl2-android-setup.md を見ながらセットアップする

### "NativePlayback plugin is not implemented on android" が出る

- Android Studio でクリーン/再ビルドする
- 端末のアプリを一度アンインストールして再インストールする
- npx cap sync android を再実行する

### 再生失敗で EACCES (Permission denied) が出る

- 音声ファイル権限ダイアログを許可する
- Android 設定画面でアプリの音楽/オーディオ権限が許可されているか確認する

### Youtube Music の音量が下がらないことがある

- Ducking は相手アプリ実装依存で、端末/アプリバージョン差がある
- 本アプリ側は Audio Focus の ducking リクエストを実装済み


