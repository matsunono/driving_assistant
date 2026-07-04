package com.soundup.app;

import android.Manifest;
import android.os.Build;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONObject;

import java.util.ArrayList;

@CapacitorPlugin(
    name = "NativePlayback",
    permissions = {
        @Permission(alias = "readMediaAudio", strings = { Manifest.permission.READ_MEDIA_AUDIO }),
        @Permission(alias = "readExternalStorage", strings = { Manifest.permission.READ_EXTERNAL_STORAGE })
    }
)
public class NativePlaybackPlugin extends Plugin {
    private static final String TAG = "NativePlaybackPlugin";
    private static final String ALIAS_READ_MEDIA_AUDIO = "readMediaAudio";
    private static final String ALIAS_READ_EXTERNAL_STORAGE = "readExternalStorage";

    @Override
    public void load() {
        super.load();
        NativePlaybackService.setEmitter(snapshot -> notifyListeners("snapshotChanged", snapshot));
        Log.i(TAG, "NativePlayback plugin loaded");
    }

    @PluginMethod
    public void start(PluginCall call) {
        Log.i(TAG, "start() called");

        if (!hasReadPermission()) {
            Log.i(TAG, "Requesting read permission before start()");
            requestPermissionForAlias(getReadPermissionAlias(), call, "onStartPermissionResult");
            return;
        }

        startInternal(call);
    }

    @PermissionCallback
    private void onStartPermissionResult(PluginCall call) {
        if (!hasReadPermission()) {
            rejectMissingPermission(call);
            return;
        }

        startInternal(call);
    }

    private void startInternal(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            call.reject("Native context is not available");
            return;
        }

        Intent intent = new Intent(context, NativePlaybackService.class);
        intent.setAction(NativePlaybackContract.ACTION_START);

        intent.putExtra(NativePlaybackContract.EXTRA_CONFIG_ID, call.getString("configId"));
        intent.putExtra(NativePlaybackContract.EXTRA_CONFIG_NAME, call.getString("configName"));
        intent.putExtra(NativePlaybackContract.EXTRA_TIMER_TYPE, call.getString("timerType"));
        intent.putExtra(NativePlaybackContract.EXTRA_INTERVAL_MINUTES, call.getInt("intervalMinutes", 1));
        intent.putExtra(NativePlaybackContract.EXTRA_ALARM_TIME, call.getString("alarmTime"));
        intent.putExtra(NativePlaybackContract.EXTRA_PLAYBACK_MODE, call.getString("playbackMode"));

        JSArray queue = call.getArray("queue");
        ArrayList<String> labels = new ArrayList<>();
        ArrayList<String> paths = new ArrayList<>();

        if (queue != null) {
            for (int i = 0; i < queue.length(); i++) {
                JSONObject item = queue.optJSONObject(i);
                if (item == null) {
                    continue;
                }

                String label = item.optString("label", "音声");
                String sourcePath = item.optString("sourcePath", "");
                String url = item.optString("url", "");
                String playbackPath = sourcePath.isEmpty() ? url : sourcePath;

                if (playbackPath == null || playbackPath.trim().isEmpty()) {
                    continue;
                }

                labels.add(label);
                paths.add(playbackPath);
            }
        }

        intent.putStringArrayListExtra(NativePlaybackContract.EXTRA_QUEUE_LABELS, labels);
        intent.putStringArrayListExtra(NativePlaybackContract.EXTRA_QUEUE_PATHS, paths);

        ContextCompat.startForegroundService(context, intent);

        JSObject accepted = new JSObject();
        accepted.put("running", true);
        accepted.put("configId", call.getString("configId"));
        accepted.put("configName", call.getString("configName"));
        accepted.put("timerType", call.getString("timerType"));
        accepted.put("queueSize", paths.size());
        accepted.put("nextRunAt", null);
        accepted.put("lastRunAt", null);
        accepted.put("lastPlayedLabel", null);
        accepted.put("errorMessage", null);
        call.resolve(accepted);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Log.i(TAG, "stop() called");
        Context context = getContext();
        if (context == null) {
            call.reject("Native context is not available");
            return;
        }

        Intent intent = new Intent(context, NativePlaybackService.class);
        intent.setAction(NativePlaybackContract.ACTION_STOP);
        context.startService(intent);

        JSObject snapshot = NativePlaybackService.getSnapshotCopy().toJsObject();
        snapshot.put("running", false);
        snapshot.put("nextRunAt", null);
        call.resolve(snapshot);
    }

    @PluginMethod
    public void triggerNow(PluginCall call) {
        Log.i(TAG, "triggerNow() called");

        if (!hasReadPermission()) {
            rejectMissingPermission(call);
            return;
        }

        Context context = getContext();
        if (context == null) {
            call.reject("Native context is not available");
            return;
        }

        Intent intent = new Intent(context, NativePlaybackService.class);
        intent.setAction(NativePlaybackContract.ACTION_TRIGGER_NOW);
        context.startService(intent);
        call.resolve(NativePlaybackService.getSnapshotCopy().toJsObject());
    }

    @PluginMethod
    public void getSnapshot(PluginCall call) {
        Log.i(TAG, "getSnapshot() called");
        call.resolve(NativePlaybackService.getSnapshotCopy().toJsObject());
    }

    private String getReadPermissionAlias() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return ALIAS_READ_MEDIA_AUDIO;
        }
        return ALIAS_READ_EXTERNAL_STORAGE;
    }

    private boolean hasReadPermission() {
        String alias = getReadPermissionAlias();
        return getPermissionState(alias) == PermissionState.GRANTED;
    }

    private void rejectMissingPermission(PluginCall call) {
        String permissionLabel = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            ? Manifest.permission.READ_MEDIA_AUDIO
            : Manifest.permission.READ_EXTERNAL_STORAGE;
        call.reject("音声ファイル再生の権限がありません: " + permissionLabel + " を許可してください");
    }
}
