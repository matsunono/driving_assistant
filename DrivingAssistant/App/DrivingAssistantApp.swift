import SwiftUI

@main
struct DrivingAssistantApp: App {

    @StateObject private var audioService = AudioPlaybackService()
    @StateObject private var carPlayService = CarPlayDetectionService()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(audioService)
                .environmentObject(carPlayService)
                .onAppear {
                    // Configure the audio session and start the scheduler as
                    // soon as the first view appears.
                    audioService.configureAudioSession()
                    audioService.startScheduler()
                }
        }
    }
}
