package com.soundup.app;

import com.getcapacitor.JSObject;

public class NativePlaybackSnapshot {
    public boolean running = false;
    public String configId = null;
    public String configName = null;
    public String timerType = null;
    public int queueSize = 0;
    public String nextRunAt = null;
    public String lastRunAt = null;
    public String lastPlayedLabel = null;
    public String errorMessage = null;

    public JSObject toJsObject() {
        JSObject json = new JSObject();
        json.put("running", running);
        json.put("configId", configId);
        json.put("configName", configName);
        json.put("timerType", timerType);
        json.put("queueSize", queueSize);
        json.put("nextRunAt", nextRunAt);
        json.put("lastRunAt", lastRunAt);
        json.put("lastPlayedLabel", lastPlayedLabel);
        json.put("errorMessage", errorMessage);
        return json;
    }
}
