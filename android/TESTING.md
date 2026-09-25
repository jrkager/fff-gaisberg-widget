# Testing the Android widget locally (macOS)

## TL;DR

1. Install **Android Studio** (free): `brew install --cask android-studio`, or download it from <https://developer.android.com/studio>.
2. Android Studio → **Open** → select the **`android/`** folder (not the repo root) → wait for the Gradle sync.
3. **Device Manager** → create a *Pixel* emulator with **API 36, arm64-v8a** (Apple Silicon).
4. Press **Run ▶** (configuration `app`). The app starts on the emulator.
5. On the emulator's home screen: long-press → **Widgets** → **Gaisberg Widget** → drag it onto the home screen.

You don't need any account for this.

---

## 1. What you need

| Thing | Needed? | Notes |
|---|---|---|
| Mac (Apple Silicon or Intel) | yes | Apple Silicon runs arm64 emulator images natively and fast. Plan for about 15 GB of disk (Studio, SDK, one system image). |
| **Android Studio**, latest stable | yes | Includes the Android SDK, emulator, `adb` and a JDK (JetBrains Runtime), so you don't install a separate JDK. The project uses **AGP 9.4 / Gradle 9.6**, which needs a Studio release from autumn 2026 or newer. An older Studio will ask you to update. |
| Xcode | no | Only needed for the iOS/Scriptable side. |
| Google account | **no** | Not needed to build, run on the emulator or install on your own phone. You *can* sign in on a "Google Play" emulator image, but the widget doesn't need it. |
| Google Play Console account | only for the Play Store | One-time USD 25, identity verification, and new personal accounts must run a closed test (12 testers, 14 days) first. Not needed for local testing. |
| Android Developer Console "limited distribution" account | optional | Free, no ID needed, for students and hobbyists. Lets you share with up to 20 devices under the new developer-verification rules (see §7). |
| Physical Android phone | optional but recommended | Doze, battery saver and launcher differences are only realistic on a real device. |

Other editors: IntelliJ IDEA (with the Android plugin) also works, but Android Studio is the standard and the only one with the emulator and the widget/layout tooling built in. VS Code has no proper Android/Gradle integration.

## 2. Open the project

1. Android Studio → *Open* → select `fff-gaisberg-widget/android`.
2. Click *Trust project*. The first **Gradle sync** downloads Gradle 9.6, AGP 9.4, Kotlin 2.4 and Glance 1.2 (a few hundred MB).
3. Studio writes `android/local.properties` with your SDK path. This file is git-ignored.

If the sync fails:

- *"The project is using an incompatible version of the Android Gradle plugin"*: update Android Studio (*Android Studio → Check for Updates*). The other option is to lower `com.android.application` in `android/build.gradle.kts` to the version Studio suggests.
- *Kotlin / Compose compiler version mismatch*: set the version of `org.jetbrains.kotlin.plugin.compose` in `android/build.gradle.kts` to the Kotlin version the error message names.
- *"SDK Platform 36 not installed"*: click the link in the error, or install it via *Settings → Languages & Frameworks → Android SDK*.

## 3. Create an emulator (Android Virtual Device)

*Tools → Device Manager → + (Create Virtual Device)*:

| Purpose | Device | System image |
|---|---|---|
| Main test device | Pixel 9 (or any phone) | **API 36**, *Google APIs* or *Google Play*, **arm64-v8a** (Intel Mac: x86_64) |
| Old-Android check (optional) | Pixel 4 | API 28 (Android 9). Here the wind boxes have no rounded corners (expected) |

Notes:
- On Apple Silicon, **always use arm64-v8a images**. x86_64 images don't run there.
- The Pixel Launcher in the emulator supports widgets the same way a phone does. The "Widget zum Homescreen hinzufügen" button in the app also works there (it uses `requestPinAppWidget`).
- Alternatives: [Genymotion Desktop](https://www.genymotion.com/) (free for personal use, arm64 images on Apple Silicon). There's no benefit over the built-in emulator for this project.

## 4. Run and add the widget

1. Choose the device in the toolbar, run configuration **app**, then press **Run ▶** (⌃R).
2. The settings app opens and loads the data once. The status line at the bottom should show the wind values.
3. Press Home → long-press on an empty spot → **Widgets** → scroll to **Gaisberg Widget** → drag it to the home screen.
4. Tap the widget: the browser opens flyforfun.at/flugwetter. Tap `⟳ HH:MM`: the data is re-downloaded and the time updates.

Faster iteration: when you change code, run again. The widget on the home screen is updated when the app process restarts. If a widget looks stuck, remove it and add it again.

## 5. Things worth testing

| Scenario | How |
|---|---|
| Light/dark | Enable *"Hell-/Dunkelmodus des Systems folgen"* in the app, then toggle dark mode in Quick Settings or run `adb shell cmd uimode night yes` / `no`. |
| Without the chart | Switch *"Windverlauf anzeigen"* off. The widget redraws immediately. |
| Offline / cache | Emulator ⋯ (Extended controls) → *Cellular* → Data status *Denied*, and turn Wi-Fi off. Or use airplane mode. Then tap `⟳`. You should still see the last data, and the `⟳` time must **not** change. |
| Resize | Long-press the widget → drag the handles (e.g. 3×2). |
| Time zone | The ECET and refresh time use the device time zone. Set the emulator to *Europe/Vienna* (Settings → System → Date & time). |
| Periodic refresh | *View → Tool Windows → App Inspection → Background Task Inspector* shows `RefreshWorker` with its next run (every 15 min). |
| Doze (real phone) | `adb shell dumpsys deviceidle force-idle` and wait. Refreshes get delayed, which is expected Android behavior. `adb shell dumpsys deviceidle unforce` resets it. |
| Logs | Logcat window, filter `tag:GaisbergWidget` (download errors) or `package:mine`. |

## 6. Command-line build (optional)

Uses Studio's bundled JDK and SDK:

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

cd android
./gradlew assembleDebug          # → app/build/outputs/apk/debug/app-debug.apk
emulator -list-avds              # start an AVD headless-ish: emulator -avd <name> &
./gradlew installDebug           # installs on the running emulator / connected phone
adb shell am start -n io.github.jrkager.gaisbergwidget/.MainActivity
```

## 7. Test on your own phone / share with friends

**Your own phone via USB or Wi-Fi (no account needed):**
1. Phone: *Settings → About phone →* tap **Build number** 7× → Developer options are now enabled.
2. *Developer options → USB debugging* on. Or use **Wireless debugging**: in Studio, *Device Manager → Pair devices using Wi-Fi* → scan the QR code.
3. Select the phone in Studio's device dropdown → Run ▶.

**APK for friends:**
- `./gradlew assembleRelease` → `app/build/outputs/apk/release/app-release.apk`. For simplicity it is signed with your **debug key**.
- Gotcha: the debug key is different on each Mac (`~/.android/debug.keystore`). Updates only install over an existing app if they are signed with the same key. If you build on another machine, users have to uninstall first. For real distribution, create your own keystore (*Build → Generate Signed App Bundle/APK*) and keep it safe.
- **Developer verification (2026):** since 30 Sep 2026, certified devices in Brazil, Indonesia, Singapore and Thailand only install apps from verified developers. Google plans to roll this out worldwide in 2027. Installing via `adb` / Android Studio stays exempt. To share APKs after the rollout, register a free *limited distribution* account (up to 20 devices) in the Android Developer Console, or use the Play Store.

## 8. Troubleshooting

- **Widget shows "Loading…" forever / "Can't load widget":** check Logcat for a crash in `GaisbergWidget`. Removing the widget and adding it again reinitialises it.
- **Widget is not in the picker:** the app must be installed. Some launchers need a restart (`adb shell am force-stop com.google.android.apps.nexuslauncher`).
- **Values show "—":** the download failed and there is no cache yet. Check that the emulator has internet (open a website in Chrome) and check Logcat.
- **Emulator is slow / won't start:** use an arm64 image and give it ≥ 2 GB RAM. Cold-boot it via *Device Manager → ⋮ → Cold Boot Now*.
