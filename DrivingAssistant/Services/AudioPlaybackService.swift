import AVFoundation
import Combine
import Foundation

/// Manages random MP3 voice-line playback every 30 minutes.
/// - Background audio playback is enabled via the AVAudioSession `.playback` category.
/// - Audio ducking lowers other audio streams while a voice line plays.
final class AudioPlaybackService: NSObject, ObservableObject, AVAudioPlayerDelegate {

    // MARK: - Published state

    @Published private(set) var isPlaying = false
    @Published private(set) var isSchedulerRunning = false
    @Published private(set) var lastPlayedFile: String = ""
    @Published private(set) var nextPlayDate: Date?

    // MARK: - Configuration

    /// Interval between automatic playbacks (default: 30 minutes).
    var playbackInterval: TimeInterval = 30 * 60 {
        didSet {
            if isSchedulerRunning {
                restartScheduler()
            }
        }
    }

    // MARK: - Private

    private var player: AVAudioPlayer?
    private var schedulerTimer: Timer?

    // MARK: - Audio session setup

    /// Configure AVAudioSession for background playback with ducking support.
    /// Call once at app launch before any playback.
    func configureAudioSession() {
        let session = AVAudioSession.sharedInstance()
        do {
            // .playback keeps audio alive in background.
            // .duckOthers lowers other audio (e.g. navigation, music) while playing.
            try session.setCategory(
                .playback,
                mode: .spokenAudio,
                options: [.duckOthers, .allowBluetooth, .allowBluetoothA2DP]
            )
            try session.setActive(true)
        } catch {
            print("[AudioPlaybackService] Failed to configure audio session: \(error)")
        }
    }

    // MARK: - Scheduler

    /// Start the 30-minute automatic playback scheduler.
    func startScheduler() {
        guard !isSchedulerRunning else { return }
        isSchedulerRunning = true
        scheduleNextPlayback()
    }

    /// Stop the automatic playback scheduler.
    func stopScheduler() {
        schedulerTimer?.invalidate()
        schedulerTimer = nil
        nextPlayDate = nil
        isSchedulerRunning = false
    }

    /// Restart the scheduler (e.g. when the interval changes).
    func restartScheduler() {
        stopScheduler()
        startScheduler()
    }

    private func scheduleNextPlayback() {
        schedulerTimer?.invalidate()
        let fireDate = Date().addingTimeInterval(playbackInterval)
        nextPlayDate = fireDate
        schedulerTimer = Timer.scheduledTimer(
            withTimeInterval: playbackInterval,
            repeats: false
        ) { [weak self] _ in
            self?.playRandomVoiceLine()
            self?.scheduleNextPlayback()
        }
        // Ensure the timer fires even when the run loop is busy.
        RunLoop.main.add(schedulerTimer!, forMode: .common)
    }

    // MARK: - Playback

    /// Play a random MP3 from the app bundle's VoiceLines directory immediately.
    func playRandomVoiceLine() {
        guard let url = randomVoiceLineURL() else {
            print("[AudioPlaybackService] No voice lines found in bundle.")
            return
        }
        play(url: url)
    }

    /// Play a specific file URL.
    func play(url: URL) {
        do {
            // Reactivate session in case it was deactivated by another app.
            try AVAudioSession.sharedInstance().setActive(true)
            let newPlayer = try AVAudioPlayer(contentsOf: url)
            newPlayer.delegate = self
            newPlayer.prepareToPlay()
            newPlayer.play()
            player = newPlayer
            isPlaying = true
            lastPlayedFile = url.lastPathComponent
        } catch {
            print("[AudioPlaybackService] Playback error: \(error)")
        }
    }

    /// Stop any currently playing audio.
    func stop() {
        player?.stop()
        player = nil
        isPlaying = false
        deactivateSession()
    }

    // MARK: - AVAudioPlayerDelegate

    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        isPlaying = false
        deactivateSession()
    }

    func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        isPlaying = false
        print("[AudioPlaybackService] Decode error: \(String(describing: error))")
        deactivateSession()
    }

    // MARK: - Helpers

    /// Deactivate the audio session after playback so ducking is released.
    private func deactivateSession() {
        do {
            try AVAudioSession.sharedInstance().setActive(
                false,
                options: .notifyOthersOnDeactivation
            )
        } catch {
            print("[AudioPlaybackService] Failed to deactivate session: \(error)")
        }
    }

    /// Returns a random MP3 URL from the bundle's VoiceLines folder, or nil if none exist.
    private func randomVoiceLineURL() -> URL? {
        guard let resourceURL = Bundle.main.resourceURL else { return nil }
        let voiceLinesDir = resourceURL.appendingPathComponent("VoiceLines")
        guard
            let files = try? FileManager.default.contentsOfDirectory(
                at: voiceLinesDir,
                includingPropertiesForKeys: nil
            )
        else { return nil }
        let mp3Files = files.filter { $0.pathExtension.lowercased() == "mp3" }
        return mp3Files.randomElement()
    }
}
