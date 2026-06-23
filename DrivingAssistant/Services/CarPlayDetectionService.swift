import AVFoundation
import Combine
import Foundation

/// Detects whether the device is connected to Apple CarPlay by monitoring
/// the AVAudioSession route changes.
///
/// CarPlay exposes itself as a `.carAudio` port type in the audio route.
final class CarPlayDetectionService: ObservableObject {

    // MARK: - Published state

    @Published private(set) var isCarPlayConnected = false

    // MARK: - Private

    private var cancellable: AnyCancellable?

    // MARK: - Init / deinit

    init() {
        startObserving()
        checkCurrentRoute()
    }

    deinit {
        stopObserving()
    }

    // MARK: - Private helpers

    private func startObserving() {
        cancellable = NotificationCenter.default
            .publisher(for: AVAudioSession.routeChangeNotification)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.checkCurrentRoute()
            }
    }

    private func stopObserving() {
        cancellable?.cancel()
        cancellable = nil
    }

    /// Inspect the current audio route and update `isCarPlayConnected`.
    private func checkCurrentRoute() {
        let route = AVAudioSession.sharedInstance().currentRoute
        let hasCarPlay = route.outputs.contains {
            $0.portType == .carAudio
        }
        if isCarPlayConnected != hasCarPlay {
            isCarPlayConnected = hasCarPlay
        }
    }
}
