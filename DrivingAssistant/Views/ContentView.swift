import SwiftUI

/// Main dashboard shown when the app is open.
struct ContentView: View {

    @EnvironmentObject private var audioService: AudioPlaybackService
    @EnvironmentObject private var carPlayService: CarPlayDetectionService
    @State private var showSettings = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {

                // MARK: Status cards
                statusCard(
                    icon: carPlayService.isCarPlayConnected ? "car.fill" : "car",
                    title: "CarPlay",
                    value: carPlayService.isCarPlayConnected ? "Connected" : "Not connected",
                    accent: carPlayService.isCarPlayConnected ? .green : .secondary
                )

                statusCard(
                    icon: audioService.isSchedulerRunning ? "timer" : "timer.circle",
                    title: "Scheduler",
                    value: audioService.isSchedulerRunning ? "Running" : "Stopped",
                    accent: audioService.isSchedulerRunning ? .blue : .secondary
                )

                if let next = audioService.nextPlayDate {
                    statusCard(
                        icon: "clock",
                        title: "Next voice line",
                        value: next.formatted(date: .omitted, time: .shortened),
                        accent: .orange
                    )
                }

                if !audioService.lastPlayedFile.isEmpty {
                    statusCard(
                        icon: "waveform",
                        title: "Last played",
                        value: audioService.lastPlayedFile,
                        accent: .purple
                    )
                }

                Spacer()

                // MARK: Manual playback button
                Button {
                    audioService.playRandomVoiceLine()
                } label: {
                    Label(
                        audioService.isPlaying ? "Playing…" : "Play Now",
                        systemImage: audioService.isPlaying ? "speaker.wave.2.fill" : "play.circle.fill"
                    )
                    .font(.title2.bold())
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(audioService.isPlaying ? Color.gray : Color.accentColor)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .disabled(audioService.isPlaying)
                .padding(.horizontal)

                // MARK: Scheduler toggle
                Button {
                    if audioService.isSchedulerRunning {
                        audioService.stopScheduler()
                    } else {
                        audioService.startScheduler()
                    }
                } label: {
                    Label(
                        audioService.isSchedulerRunning ? "Stop Scheduler" : "Start Scheduler",
                        systemImage: audioService.isSchedulerRunning ? "stop.circle" : "play.circle"
                    )
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(.systemGray5))
                    .foregroundStyle(.primary)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .padding(.horizontal)
            }
            .padding(.top)
            .navigationTitle("Driving Assistant")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showSettings = true
                    } label: {
                        Image(systemName: "gearshape")
                    }
                }
            }
            .sheet(isPresented: $showSettings) {
                SettingsView()
                    .environmentObject(audioService)
            }
        }
    }

    // MARK: - Helpers

    @ViewBuilder
    private func statusCard(
        icon: String,
        title: String,
        value: String,
        accent: Color
    ) -> some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(accent)
                .frame(width: 36)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(value)
                    .font(.body.bold())
            }
            Spacer()
        }
        .padding()
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
    }
}

#Preview {
    ContentView()
        .environmentObject(AudioPlaybackService())
        .environmentObject(CarPlayDetectionService())
}
