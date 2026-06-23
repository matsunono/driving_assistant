# VoiceLines

Place your `.mp3` voice line files in this folder.

The `AudioPlaybackService` picks a random file from this directory every time
it needs to play a voice line (both on the automatic 30-minute schedule and
when the **Play Now** button is tapped).

## Requirements

- Files must have the `.mp3` extension (case-insensitive).
- Any number of files is supported; at least one file is required for playback.
- Files are read directly from the app bundle — no network or cloud access is needed.

## Adding files in Xcode

1. Drag your `.mp3` files into this folder in the Xcode Project Navigator.
2. Make sure **"Copy items if needed"** is checked.
3. Make sure **"Add to targets: DrivingAssistant"** is checked.
4. Build and run the app.

## Example

```
VoiceLines/
├── reminder_drink_water.mp3
├── reminder_take_break.mp3
└── safety_tip_check_mirrors.mp3
```
