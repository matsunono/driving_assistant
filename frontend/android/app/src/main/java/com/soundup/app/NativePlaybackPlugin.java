package com.soundup.app;

import android.content.Context;
import android.content.Intent;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.util.ArrayList;

@CapacitorPlugin(name = "NativePlayback")
public class NativePlaybackPlugin extends Plugin {
    @Override
    public void load() {
        super.load();
        NativePlaybackService.setEmitter(snapshot -> notifyListeners("snapshotChanged", snapshot));
    }

    @PluginMethod
    public void start(PluginCall call) {
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
        call.resolve(NativePlaybackService.getSnapshotCopy().toJsObject());
    }
}
