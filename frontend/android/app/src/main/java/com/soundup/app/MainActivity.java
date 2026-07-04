package com.soundup.app;

import android.os.Bundle;
import android.util.Log;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
	private static final String TAG = "SoundUpMainActivity";

	@Override
	public void onCreate(Bundle savedInstanceState) {
		// Register custom plugin before BridgeActivity initializes plugin manager.
		registerPlugin(NativePlaybackPlugin.class);
		super.onCreate(savedInstanceState);
		Log.i(TAG, "NativePlaybackPlugin registered from MainActivity.onCreate");
	}
}
