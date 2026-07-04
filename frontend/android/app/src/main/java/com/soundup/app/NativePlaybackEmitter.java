package com.soundup.app;

import com.getcapacitor.JSObject;

public interface NativePlaybackEmitter {
    void onSnapshotChanged(JSObject snapshot);
}
