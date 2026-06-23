# Driving Assistant

A minimal iOS proof-of-concept driving companion app that plays random local MP3 voice lines on a 30-minute schedule — even when the app is in the background.

---

## Features

| Feature | Implementation |
|---|---|
| Random MP3 playback every 30 min | `AudioPlaybackService` + `Timer` |
| Background audio playback | `AVAudioSession(.playback)` + `UIBackgroundModes: audio` |
| Audio ducking | `AVAudioSession` option `.duckOthers` |
| CarPlay detection | Route-change notifications via `AVAudioSession` |
| Settings screen | Playback interval picker (5 – 60 min) |
| Manual play button | Immediate playback outside the schedule |
| SwiftUI + AVFoundation | 100% native, no third-party dependencies |

---

## Project Structure

```
DrivingAssistant/
├── App/
│   ├── DrivingAssistantApp.swift   # @main entry point; audio session setup
│   └── Info.plist                  # Background audio capability declaration
├── Services/
│   ├── AudioPlaybackService.swift  # Core playback + scheduler
│   └── CarPlayDetectionService.swift # CarPlay connection detection
├── Views/
│   ├── ContentView.swift           # Main dashboard
│   └── SettingsView.swift          # Settings (interval picker, info)
└── Resources/
    └── VoiceLines/                 # Drop your .mp3 files here
        └── README.md
```

---

## How It Works

### Audio Playback (`AudioPlaybackService`)

- Configures `AVAudioSession` with category `.playback` and mode `.spokenAudio`.
- Passes the `.duckOthers` option so music or navigation audio is automatically
  lowered while a voice line plays, then restored to full volume when done.
- Uses a repeating `Timer` to call `playRandomVoiceLine()` every N minutes
  (default: 30). The timer is added to `RunLoop.main` in `.common` mode so it
  fires correctly even when the run loop is in a tracking mode.
- `AVAudioSession` is activated before each playback and explicitly deactivated
  with `.notifyOthersOnDeactivation` after playback ends — this is what signals
  other apps to restore their volume.

### Background Playback

The `UIBackgroundModes` key in `Info.plist` includes `audio`. This is the only
mechanism iOS provides to keep an `AVAudioSession` alive when the app is
backgrounded. **Without this key**, iOS will interrupt the audio session as soon
as the user locks the screen or switches apps, and the 30-minute timer will
stop firing.

> **Note:** The OS may throttle or suspend timers in background. For a
> production app consider using `BGTaskScheduler` or `AVAudioPlayer`'s own
> scheduling APIs. For this MVP the simple `Timer` approach works while the
> audio session is kept alive by an active (or recently active) audio route.

### CarPlay Detection (`CarPlayDetectionService`)

- Subscribes to `AVAudioSession.routeChangeNotification`.
- Checks `AVAudioSession.sharedInstance().currentRoute.outputs` for a port of
  type `.carAudio`.
- Publishes `isCarPlayConnected: Bool` — the UI reacts automatically because
  it observes the `@Published` property via `@EnvironmentObject`.

### Settings Screen (`SettingsView`)

- Segmented picker lets the user choose the playback interval: 5, 10, 15, 30,
  45 or 60 minutes.
- Shows the number of MP3 files currently in the bundle.
- Displays the audio session capabilities (background, ducking, Bluetooth).

---

## Getting Started

### Prerequisites

- Xcode 15 or later
- iOS 17+ deployment target (adjust `IPHONEOS_DEPLOYMENT_TARGET` as needed)
- A physical iPhone or an iPhone simulator (CarPlay requires a real device or
  the CarPlay Simulator add-on)

### Steps

1. **Open Xcode** and create a new *iOS App* project named `DrivingAssistant`.
2. **Replace** the generated source files with the files from this repository,
   keeping the same directory layout.
3. **Set the Info.plist** path to `DrivingAssistant/App/Info.plist` in the
   project's *Build Settings > Info.plist File* field (or merge the keys into
   the project's existing Info.plist).
4. **Add voice lines:**
   - Drag one or more `.mp3` files into `DrivingAssistant/Resources/VoiceLines/`
     in the Project Navigator.
   - Ensure *Copy items if needed* and *Add to target: DrivingAssistant* are
     both checked.
5. **Build & Run** on device or simulator.

### Testing Background Playback

1. Tap **Start Scheduler** on the main screen.
2. Lower the interval to **5 min** in Settings.
3. Press the Home button to background the app.
4. Wait 5 minutes — the voice line should play.

### Testing Audio Ducking

1. Start playing music in another app (e.g. Apple Music).
2. Tap **Play Now** in Driving Assistant.
3. The music volume should lower while the voice line plays, then return to
   normal.

### Testing CarPlay (real device only)

1. Connect the device to a CarPlay-enabled head unit.
2. The CarPlay status card on the main screen should turn green.

---

## Requirements Checklist

- [x] Play random local MP3 voice lines every 30 minutes
- [x] Continue working while the app is in the background
- [x] Detect Apple CarPlay connection
- [x] Support audio ducking during voice playback
- [x] SwiftUI + AVFoundation
- [x] No backend, no cloud, no authentication
- [x] Minimal viable product

---

## License

MIT
