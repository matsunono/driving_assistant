package com.soundup.app;

public final class NativePlaybackContract {
    private NativePlaybackContract() {}

    public static final String ACTION_START = "com.soundup.app.action.START";
    public static final String ACTION_STOP = "com.soundup.app.action.STOP";
    public static final String ACTION_TRIGGER_NOW = "com.soundup.app.action.TRIGGER_NOW";

    public static final String EXTRA_CONFIG_ID = "configId";
    public static final String EXTRA_CONFIG_NAME = "configName";
    public static final String EXTRA_TIMER_TYPE = "timerType";
    public static final String EXTRA_INTERVAL_MINUTES = "intervalMinutes";
    public static final String EXTRA_ALARM_TIME = "alarmTime";
    public static final String EXTRA_PLAYBACK_MODE = "playbackMode";
    public static final String EXTRA_QUEUE_LABELS = "queueLabels";
    public static final String EXTRA_QUEUE_PATHS = "queuePaths";
}
