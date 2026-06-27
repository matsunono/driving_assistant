# WSL2 + Capacitor Android Setup Notes

## Goal
Run a Capacitor Android app from WSL2 with Linux Android Studio and a physical Android device.

## Final working state
1. `CAPACITOR_ANDROID_STUDIO_PATH` points to Linux Android Studio.
2. SDK path is Linux-side (`/home/matsuno/Android/Sdk`).
3. Java is project-scoped via SDKMAN.
4. Device is attached to WSL using `usbipd`.
5. `adb` sees the device, and `npx cap run android` succeeds.

## 1) Install and use Linux Android Studio in WSL
Install Android Studio under home directory:

```bash
cd ~
wget -O android-studio-linux.tar.gz https://dl.google.com/dl/android/studio/ide-zips/2025.1.1.13/android-studio-2025.1.1.13-linux.tar.gz
rm -rf ~/android-studio
tar -xzf android-studio-linux.tar.gz
rm -f android-studio-linux.tar.gz
```

Set persistent path:

```bash
# ~/.bashrc
export CAPACITOR_ANDROID_STUDIO_PATH="$HOME/android-studio/bin/studio.sh"
```

Reload:

```bash
source ~/.bashrc
```

## 2) Project-local Java management (avoid version conflicts)
Install SDKMAN and Java 21:

```bash
curl -s https://get.sdkman.io | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
sdk install java 21.0.11-tem
```

Enable auto env switching:

```bash
sed -i 's/^sdkman_auto_env=.*/sdkman_auto_env=true/' "$HOME/.sdkman/etc/config"
```

Create project file:

```text
frontend/.sdkmanrc
java=21.0.11-tem
```

Apply in project:

```bash
cd /home/matsuno/driving_assistant/frontend
sdk env install
java -version
```

## 3) Android SDK location alignment (Linux path)
Use Linux SDK path everywhere:

```bash
# ~/.bashrc
export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$HOME/Android/Sdk"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
```

Reload:

```bash
source ~/.bashrc
```

`frontend/android/local.properties` must point to Linux SDK:

```properties
sdk.dir=/home/matsuno/Android/Sdk
```

## 4) Install required SDK packages from Android Studio
In Android Studio -> Settings -> Android SDK:

1. SDK Platforms:
- Android API 36 (or project target API)

2. SDK Tools:
- Android SDK Platform-Tools
- Android SDK Build-Tools (matching target)
- Android Emulator
- Android SDK Command-line Tools (latest)

## 5) AGP compatibility fix
If Android Studio says AGP 8.13.0 is unsupported, align versions to supported pair.
Working change used:

- `frontend/android/build.gradle`
  - `com.android.tools.build:gradle:8.11.0`
- `frontend/android/gradle/wrapper/gradle-wrapper.properties`
  - `distributionUrl=https://services.gradle.org/distributions/gradle-8.13-all.zip`

## 6) Physical device debug in WSL2 (recommended over emulator)
Enable on phone:

1. Settings -> About phone -> tap Build number 7 times
2. Settings -> Developer options -> enable USB debugging

## 7) Attach phone USB into WSL (Windows PowerShell as Administrator)
Check bus id:

```powershell
usbipd list
```

Bind and attach (example bus id `2-11`):

```powershell
usbipd bind --busid 2-11
usbipd attach --wsl Ubuntu-24.04 --busid 2-11 --auto-attach
```

## 8) Verify from WSL

```bash
lsusb | grep -Ei "18d1|google|pixel"
adb kill-server
adb start-server
adb devices -l
```

If device appears as `unauthorized`, unlock phone and accept USB debugging prompt.

## 9) If adb shows permission denied
Symptom:

```text
adb: insufficient permissions for device
```

Temporary fix for current USB node:

```bash
sudo chgrp plugdev /dev/bus/usb/001/003
sudo chmod 660 /dev/bus/usb/001/003
adb kill-server
adb start-server
adb devices -l
```

Then accept USB auth dialog on device.

## 10) Run Capacitor Android

```bash
cd /home/matsuno/driving_assistant/frontend
npx cap sync android
npx cap run android
```

## Known caveats
1. WSL2 emulator is often unstable due to virtualization constraints. Physical device debugging is usually more reliable.
2. If USB reconnect resets permissions, re-run section 9.
3. Always run `usbipd` on Windows PowerShell, not inside WSL.
