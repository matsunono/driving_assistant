import SwiftUI

/// Settings screen for configuring playback behaviour.
struct SettingsView: View {

    @EnvironmentObject private var audioService: AudioPlaybackService
    @Environment(\.dismiss) private var dismiss

    /// Backing store for the interval picker (in minutes).
    @State private var intervalMinutes: Int = 30

    private let intervalOptions: [Int] = [5, 10, 15, 30, 45, 60]

    var body: some View {
        NavigationStack {
            Form {

                // MARK: Playback interval
                Section {
                    Picker("Interval", selection: $intervalMinutes) {
                        ForEach(intervalOptions, id: \.self) { minutes in
                            Text("\(minutes) min").tag(minutes)
                        }
                    }
                    .pickerStyle(.segmented)
                    .onChange(of: intervalMinutes) { _, newValue in
                        audioService.playbackInterval = TimeInterval(newValue * 60)
                    }
                } header: {
                    Text("Playback interval")
                } footer: {
                    Text("A random voice line will play every \(intervalMinutes) minutes while the scheduler is running.")
                }

                // MARK: Voice line files info
                Section {
                    HStack {
                        Text("Voice line count")
                        Spacer()
                        Text("\(voiceLineCount)")
                            .foregroundStyle(.secondary)
                    }
                    Text("Add MP3 files to the **VoiceLines** folder inside the app bundle via Xcode to populate this list.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } header: {
                    Text("Voice lines")
                }

                // MARK: Audio session info
                Section {
                    LabeledContent("Background audio") { Text("Enabled").foregroundStyle(.green) }
                    LabeledContent("Audio ducking") { Text("Enabled").foregroundStyle(.green) }
                    LabeledContent("Bluetooth") { Text("Enabled").foregroundStyle(.green) }
                } header: {
                    Text("Audio session")
                } footer: {
                    Text("These settings are fixed and configured in the audio session category at startup.")
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .onAppear {
                // Sync slider to the current service interval.
                let currentMinutes = Int(audioService.playbackInterval / 60)
                if intervalOptions.contains(currentMinutes) {
                    intervalMinutes = currentMinutes
                }
            }
        }
    }

    // MARK: - Helpers

    private var voiceLineCount: Int {
        guard
            let resourceURL = Bundle.main.resourceURL,
            let files = try? FileManager.default.contentsOfDirectory(
                at: resourceURL.appendingPathComponent("VoiceLines"),
                includingPropertiesForKeys: nil
            )
        else { return 0 }
        return files.filter { $0.pathExtension.lowercased() == "mp3" }.count
    }
}

#Preview {
    SettingsView()
        .environmentObject(AudioPlaybackService())
}
