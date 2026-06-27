<template>
  <section class="page-card page-section settings-page">
    <p class="eyebrow">Settings</p>
    <h2 class="heading">アプリ設定</h2>
    <p class="subtle">再生通知、権限、バックグラウンド動作の設定をここに集約します。</p>

    <div class="settings-list">
      <div class="settings-list__item">
        <strong>ForegroundService</strong>
        <p>再生状態の正をネイティブ側で管理します。</p>
      </div>

      <div class="settings-list__item">
        <strong>Audio Ducking</strong>
        <p>外部音楽再生時に音量を下げて音声を重ねます。</p>
      </div>

      <div class="settings-list__item">
        <strong>SAF</strong>
        <p>ローカルファイルとフォルダの選択を許可します。</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.settings-list {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}

.settings-list__item {
  padding: 1rem;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(24, 22, 21, 0.08);
}

.settings-list__item p {
  margin: 0.35rem 0 0;
  color: var(--muted);
}
</style>