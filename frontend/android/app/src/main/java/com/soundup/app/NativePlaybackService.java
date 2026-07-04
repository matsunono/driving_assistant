package com.soundup.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Date;
import java.util.Locale;

public class NativePlaybackService extends Service {
    private static final String CHANNEL_ID = "soundup.playback";
    private static final int NOTIFICATION_ID = 1101;
    private static final String PREFS_NAME = "native_playback";
    private static final String PREF_STATE_JSON = "state_json";

    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private static final NativePlaybackSnapshot snapshot = new NativePlaybackSnapshot();
    private static NativePlaybackEmitter emitter;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ArrayList<String> queueLabels = new ArrayList<>();
    private final ArrayList<String> queuePaths = new ArrayList<>();

    private MediaPlayer mediaPlayer;
    private Runnable scheduledRunnable;
    private int nextIndex = 0;
    private int lastRandomIndex = -1;
    private String playbackMode = "random";
    private int intervalMinutes = 1;
    private String alarmTime;
    private PowerManager.WakeLock wakeLock;
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;
    private final AudioManager.OnAudioFocusChangeListener audioFocusChangeListener = focusChange -> {
        // No-op for now. We only use transient ducking while the short voice clip is playing.
    };

    public static void setEmitter(@Nullable NativePlaybackEmitter nextEmitter) {
        emitter = nextEmitter;
    }

    public static synchronized NativePlaybackSnapshot getSnapshotCopy() {
        NativePlaybackSnapshot copy = new NativePlaybackSnapshot();
        copy.running = snapshot.running;
        copy.configId = snapshot.configId;
        copy.configName = snapshot.configName;
        copy.timerType = snapshot.timerType;
        copy.queueSize = snapshot.queueSize;
        copy.nextRunAt = snapshot.nextRunAt;
        copy.lastRunAt = snapshot.lastRunAt;
        copy.lastPlayedLabel = snapshot.lastPlayedLabel;
        copy.errorMessage = snapshot.errorMessage;
        return copy;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        initAudioFocus();
        initWakeLock();
        restoreState();
        if (snapshot.running) {
            startAsForeground();
            scheduleNextFromCurrentState();
            notifySnapshotChanged();
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            if (snapshot.running) {
                startAsForeground();
                scheduleNextFromCurrentState();
            }
            return START_STICKY;
        }

        String action = intent.getAction();
        if (NativePlaybackContract.ACTION_START.equals(action)) {
            handleStart(intent);
            return START_STICKY;
        }

        if (NativePlaybackContract.ACTION_STOP.equals(action)) {
            handleStop();
            return START_NOT_STICKY;
        }

        if (NativePlaybackContract.ACTION_TRIGGER_NOW.equals(action)) {
            triggerNow();
            return START_STICKY;
        }

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        clearScheduledRunnable();
        releasePlayer();
        releaseWakeLock();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void handleStart(Intent intent) {
        clearScheduledRunnable();

        snapshot.running = true;
        snapshot.configId = intent.getStringExtra(NativePlaybackContract.EXTRA_CONFIG_ID);
        snapshot.configName = intent.getStringExtra(NativePlaybackContract.EXTRA_CONFIG_NAME);
        snapshot.timerType = intent.getStringExtra(NativePlaybackContract.EXTRA_TIMER_TYPE);
        snapshot.errorMessage = null;
        snapshot.lastPlayedLabel = null;

        intervalMinutes = Math.max(1, intent.getIntExtra(NativePlaybackContract.EXTRA_INTERVAL_MINUTES, 1));
        alarmTime = intent.getStringExtra(NativePlaybackContract.EXTRA_ALARM_TIME);
        playbackMode = safeString(intent.getStringExtra(NativePlaybackContract.EXTRA_PLAYBACK_MODE), "random");

        ArrayList<String> labels = intent.getStringArrayListExtra(NativePlaybackContract.EXTRA_QUEUE_LABELS);
        ArrayList<String> paths = intent.getStringArrayListExtra(NativePlaybackContract.EXTRA_QUEUE_PATHS);

        queueLabels.clear();
        queuePaths.clear();

        if (labels != null && paths != null) {
            int size = Math.min(labels.size(), paths.size());
            for (int i = 0; i < size; i++) {
                String label = labels.get(i);
                String path = paths.get(i);
                if (path == null || path.trim().isEmpty()) {
                    continue;
                }
                queueLabels.add(label == null ? "音声" : label);
                queuePaths.add(path);
            }
        }

        snapshot.queueSize = queuePaths.size();
        nextIndex = 0;
        lastRandomIndex = -1;

        if (queuePaths.isEmpty()) {
            snapshot.running = false;
            snapshot.errorMessage = "再生対象の音声がありません";
            snapshot.nextRunAt = null;
            saveState();
            notifySnapshotChanged();
            stopSelf();
            return;
        }

        acquireWakeLock();
        startAsForeground();
        scheduleNextFromCurrentState();
        saveState();
        notifySnapshotChanged();
    }

    private void handleStop() {
        clearScheduledRunnable();
        releasePlayer();

        snapshot.running = false;
        snapshot.nextRunAt = null;
        snapshot.errorMessage = null;

        saveState();
        notifySnapshotChanged();

        stopForegroundCompat();
        releaseWakeLock();
        stopSelf();
    }

    private void triggerNow() {
        if (!snapshot.running) {
            snapshot.errorMessage = "再生設定が開始されていません";
            notifySnapshotChanged();
            return;
        }

        int index = pickNextIndex();
        if (index < 0 || index >= queuePaths.size()) {
            snapshot.errorMessage = "再生対象の音声がありません";
            notifySnapshotChanged();
            return;
        }

        String path = queuePaths.get(index);
        String label = queueLabels.get(index);

        boolean started = playPath(path, label);
        snapshot.lastRunAt = toIsoString(new Date());
        if (started) {
            snapshot.lastPlayedLabel = label;
            snapshot.errorMessage = null;
        } else {
            if (snapshot.errorMessage == null || snapshot.errorMessage.trim().isEmpty()) {
                snapshot.errorMessage = "音声再生に失敗しました";
            }
        }

        scheduleNextFromCurrentState();
        saveState();
        updateNotification();
        notifySnapshotChanged();
    }

    private void scheduleNextFromCurrentState() {
        clearScheduledRunnable();

        if (!snapshot.running) {
            snapshot.nextRunAt = null;
            return;
        }

        long now = System.currentTimeMillis();
        long runAt;

        if ("alarm".equals(snapshot.timerType)) {
            runAt = computeNextAlarmMillis(alarmTime, now);
        } else {
            runAt = now + Math.max(1, intervalMinutes) * 60_000L;
        }

        long delay = Math.max(0, runAt - now);
        snapshot.nextRunAt = toIsoString(new Date(runAt));

        scheduledRunnable = this::triggerNow;
        handler.postDelayed(scheduledRunnable, delay);
        updateNotification();
    }

    private int pickNextIndex() {
        if (queuePaths.isEmpty()) {
            return -1;
        }

        if ("random".equals(playbackMode)) {
            int index = (int) (Math.random() * queuePaths.size());
            if (queuePaths.size() > 1 && index == lastRandomIndex) {
                index = (index + 1) % queuePaths.size();
            }
            lastRandomIndex = index;
            return index;
        }

        int index = nextIndex % queuePaths.size();
        nextIndex = (nextIndex + 1) % queuePaths.size();
        return index;
    }

    private boolean playPath(String path, String label) {
        try {
            releasePlayer();
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setOnCompletionListener(player -> {
                player.reset();
                abandonDuckingFocus();
            });

            if (path.startsWith("content://") || path.startsWith("file://")) {
                mediaPlayer.setDataSource(this, Uri.parse(path));
            } else {
                mediaPlayer.setDataSource(path);
            }

            mediaPlayer.prepare();

            if (!requestDuckingFocus()) {
                snapshot.errorMessage = "音声再生に失敗しました (AudioFocus取得不可) path=" + path;
                releasePlayer();
                return false;
            }

            mediaPlayer.start();
            snapshot.lastPlayedLabel = label;
            return true;
        } catch (Exception e) {
            String reason = e.getClass().getSimpleName();
            String detail = e.getMessage();
            if (detail != null && !detail.trim().isEmpty()) {
                reason = reason + ": " + detail;
            }
            snapshot.errorMessage = "音声再生に失敗しました (" + reason + ") path=" + path;
            releasePlayer();
            return false;
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Sound Up Playback",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("バックグラウンド再生中の状態を表示します");
        manager.createNotificationChannel(channel);
    }

    private Notification buildNotification() {
        String title = snapshot.configName == null ? "Sound Up" : snapshot.configName;
        String text = snapshot.running
            ? (snapshot.nextRunAt == null ? "再生中" : "次回: " + snapshot.nextRunAt)
            : "停止中";

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(text)
            .setOngoing(snapshot.running)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    private void startAsForeground() {
        Notification notification = buildNotification();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            int permission = ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS);
            if (permission != PackageManager.PERMISSION_GRANTED) {
                // Foreground service can still run without posting a visible notification on some devices.
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfoCompat.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            return;
        }

        startForeground(NOTIFICATION_ID, notification);
    }

    private void updateNotification() {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) {
            return;
        }
        manager.notify(NOTIFICATION_ID, buildNotification());
    }

    private void stopForegroundCompat() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
            return;
        }
        stopForeground(true);
    }

    private void clearScheduledRunnable() {
        if (scheduledRunnable != null) {
            handler.removeCallbacks(scheduledRunnable);
            scheduledRunnable = null;
        }
    }

    private void releasePlayer() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
            } catch (IllegalStateException ignored) {
            }
            mediaPlayer.release();
            mediaPlayer = null;
        }

        abandonDuckingFocus();
    }

    private void initAudioFocus() {
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
    }

    private boolean requestDuckingFocus() {
        if (audioManager == null) {
            return true;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (audioFocusRequest == null) {
                audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                    .setAudioAttributes(
                        new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .build()
                    )
                    .setAcceptsDelayedFocusGain(false)
                    .setOnAudioFocusChangeListener(audioFocusChangeListener)
                    .build();
            }

            int result = audioManager.requestAudioFocus(audioFocusRequest);
            return result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        }

        int result = audioManager.requestAudioFocus(
            audioFocusChangeListener,
            AudioManager.STREAM_MUSIC,
            AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
        );
        return result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
    }

    private void abandonDuckingFocus() {
        if (audioManager == null) {
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (audioFocusRequest != null) {
                audioManager.abandonAudioFocusRequest(audioFocusRequest);
            }
            return;
        }

        audioManager.abandonAudioFocus(audioFocusChangeListener);
    }

    private void notifySnapshotChanged() {
        NativePlaybackEmitter currentEmitter = emitter;
        if (currentEmitter != null) {
            currentEmitter.onSnapshotChanged(getSnapshotCopy().toJsObject());
        }
    }

    private void initWakeLock() {
        PowerManager manager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (manager == null) {
            return;
        }
        wakeLock = manager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "soundup:playback_wakelock");
        wakeLock.setReferenceCounted(false);
    }

    private void acquireWakeLock() {
        if (wakeLock == null || wakeLock.isHeld()) {
            return;
        }
        wakeLock.acquire();
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }

    private void saveState() {
        try {
            JSONObject root = new JSONObject();
            root.put("running", snapshot.running);
            root.put("configId", snapshot.configId);
            root.put("configName", snapshot.configName);
            root.put("timerType", snapshot.timerType);
            root.put("queueSize", snapshot.queueSize);
            root.put("nextRunAt", snapshot.nextRunAt);
            root.put("lastRunAt", snapshot.lastRunAt);
            root.put("lastPlayedLabel", snapshot.lastPlayedLabel);
            root.put("errorMessage", snapshot.errorMessage);
            root.put("intervalMinutes", intervalMinutes);
            root.put("alarmTime", alarmTime);
            root.put("playbackMode", playbackMode);

            JSONArray labels = new JSONArray();
            JSONArray paths = new JSONArray();
            for (int i = 0; i < queueLabels.size(); i++) {
                labels.put(queueLabels.get(i));
                paths.put(queuePaths.get(i));
            }
            root.put("queueLabels", labels);
            root.put("queuePaths", paths);

            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            prefs.edit().putString(PREF_STATE_JSON, root.toString()).apply();
        } catch (JSONException ignored) {
        }
    }

    private void restoreState() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String raw = prefs.getString(PREF_STATE_JSON, null);
        if (raw == null || raw.isEmpty()) {
            return;
        }

        try {
            JSONObject root = new JSONObject(raw);
            snapshot.running = root.optBoolean("running", false);
            snapshot.configId = nullIfEmpty(root.optString("configId", null));
            snapshot.configName = nullIfEmpty(root.optString("configName", null));
            snapshot.timerType = nullIfEmpty(root.optString("timerType", null));
            snapshot.queueSize = root.optInt("queueSize", 0);
            snapshot.nextRunAt = nullIfEmpty(root.optString("nextRunAt", null));
            snapshot.lastRunAt = nullIfEmpty(root.optString("lastRunAt", null));
            snapshot.lastPlayedLabel = nullIfEmpty(root.optString("lastPlayedLabel", null));
            snapshot.errorMessage = nullIfEmpty(root.optString("errorMessage", null));

            intervalMinutes = Math.max(1, root.optInt("intervalMinutes", 1));
            alarmTime = nullIfEmpty(root.optString("alarmTime", null));
            playbackMode = safeString(root.optString("playbackMode", "random"), "random");

            queueLabels.clear();
            queuePaths.clear();

            JSONArray labels = root.optJSONArray("queueLabels");
            JSONArray paths = root.optJSONArray("queuePaths");
            int size = Math.min(labels == null ? 0 : labels.length(), paths == null ? 0 : paths.length());
            for (int i = 0; i < size; i++) {
                String label = labels.optString(i, "音声");
                String path = paths.optString(i, "");
                if (path.isEmpty()) {
                    continue;
                }
                queueLabels.add(label);
                queuePaths.add(path);
            }
            snapshot.queueSize = queuePaths.size();

            if (queuePaths.isEmpty()) {
                snapshot.running = false;
                snapshot.nextRunAt = null;
            }
        } catch (JSONException ignored) {
            snapshot.running = false;
            snapshot.nextRunAt = null;
        }
    }

    private static String safeString(String value, String fallback) {
        if (value == null || value.trim().isEmpty()) {
            return fallback;
        }
        return value;
    }

    private static String nullIfEmpty(String value) {
        if (value == null || value.trim().isEmpty() || "null".equals(value)) {
            return null;
        }
        return value;
    }

    private static String toIsoString(Date date) {
        return new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.US).format(date);
    }

    private long computeNextAlarmMillis(String isoLike, long nowMillis) {
        if (isoLike == null || isoLike.trim().isEmpty()) {
            return nowMillis + 60_000L;
        }

        try {
            LocalDateTime target = LocalDateTime.parse(isoLike, ISO_FORMATTER);
            long targetMillis = target.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
            if (targetMillis > nowMillis) {
                return targetMillis;
            }
            return target.plusDays(1).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        } catch (Exception ignored) {
            return nowMillis + 60_000L;
        }
    }

    private static final class ServiceInfoCompat {
        private static final int FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK = 0x00000002;
    }
}
