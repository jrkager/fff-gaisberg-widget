# Gaisberg Widget – Android

Android version of the Scriptable widget in [`../widget.js`](../widget.js). It shows the same information:

- Next bus Guggenthal → Gaisberg (with delay)
- Wind at the Nord and Ost stations: current average and max, plus a direction arrow
- Wind history of the last 6 h (Nord station) as a chart in the background. Vertical axis goes up to 50 km/h.
- TRA status Gaisberg/Schwarzenberg and ECET

Tapping the widget opens [flyforfun.at/flugwetter](https://flyforfun.at/flugwetter/). Tapping the small `⟳ HH:MM` label refreshes it right away. The time shown there is when the data was last downloaded successfully. If the phone is offline, the widget keeps showing the last cached data.

How to build and test it locally (IDE, accounts, emulator on a Mac): **[TESTING.md](TESTING.md)**.

## Why a native app and not a "Scriptable for Android"?

There is no Android app that matches Scriptable (JavaScript + native widget API + App Store distribution). These options were compared:

| Option | How it works | Verdict for this widget |
|---|---|---|
| **Native app with Jetpack Glance** (chosen) | Kotlin, Compose-style declarative widget API (`Row`, `Column`, `Text`, `Image`), which is close to Scriptable's `ListWidget`/`addStack`. You can draw bitmaps with `Canvas`, so the chart and arrows work. WorkManager handles the periodic refresh. | Full feature parity. Refresh every ~15 min, and light/dark colors follow the system correctly: the arrow is tinted by the system, so it no longer has to stay gray. Needs Android Studio and a sideloaded APK (or the Play Store). |
| **KWGT (Kustom Widget Maker)** + Kustom formulas | GUI widget editor. Can fetch JSON with `$wg(url, json, .path)$`. | Wind values, TRA and bus would work. The 6 h chart, EMA smoothing and computed arrows are awkward or impossible. KWGT Pro is paid, and every user has to import a `.kwgt` preset by hand. Good as a no-code fallback, but not a real port. |
| **Tasker + "Widget v2"** (or Tasker + KWGT) | Tasker fetches the data (HTTP Request + JavaScriptlet), and a JSON layout describes the widget. | Can run JS, but has limited layouts and no free drawing. Everyone needs a paid Tasker plus a lot of manual setup. |
| **ScriptableDroid** and similar hobby projects | Scriptable-like JS runtime for Android. | Early-stage, only a small subset of the API (no `DrawContext`/`ListWidget` parity), not on Play. Not reliable enough. |
| **Termux:Widget** | Runs shell scripts from the home screen. | These are only launch buttons, and nothing is displayed. Doesn't fit. |
| React Native / Flutter | Cross-platform app frameworks. | Home-screen widgets still have to be written natively (`home_widget` plugin → Glance/RemoteViews), so they add nothing for a widget-only app. |

Glance is Google's recommended widget toolkit (stable 1.2.0, Aug 2026). The widget logic maps almost 1:1 from `widget.js` (see the table below).

## Mapping Scriptable → Android

| Scriptable (`widget.js`) | Android (`app/src/main/java/.../gaisbergwidget/`) |
|---|---|
| `fetchFFF`, `loadNordHistory`, `getTRAStatus`, `getECET`, `getNextBus` | `FffData.kt` (`FffRepository`), which also caches the last response for offline use |
| `drawArrow`, `LineChart`, `lowPassEMA` | `Drawing.kt` (Android `Canvas` → `Bitmap`) |
| `createWidget`, `addWindBox`, `addTRAContent`, … | `GaisbergWidget.kt` (Glance composables) |
| Widget parameters `disable-chart`, `enable-light-mode` | Switches in the app (`MainActivity.kt`, `WidgetSettings.kt`) |
| iOS widget refresh (system-controlled) | `RefreshWorker.kt` (WorkManager, every 15 min when a network is available) |
| *When Interacting → Open URL* | Built in: tapping the widget opens the Flugwetter page |

## Project layout

```
android/
├── README.md, TESTING.md
├── settings.gradle.kts, build.gradle.kts, gradle.properties
├── gradlew, gradlew.bat, gradle/wrapper/      # Gradle 9.6 wrapper
└── app/
    ├── build.gradle.kts                        # AGP 9.4, Glance 1.2.0, WorkManager
    └── src/main/
        ├── AndroidManifest.xml
        ├── java/io/github/jrkager/gaisbergwidget/
        │   ├── GaisbergWidget.kt   # widget UI + receiver + refresh action
        │   ├── WidgetState.kt      # holds the latest data/bitmaps, pushes updates
        │   ├── FffData.kt          # download, cache, JSON parsing
        │   ├── Drawing.kt          # arrow + chart bitmaps
        │   ├── RefreshWorker.kt    # periodic refresh
        │   ├── WidgetSettings.kt
        │   └── MainActivity.kt     # settings screen
        └── res/xml/gaisberg_widget_info.xml   # widget size (2×2), resizable
```

## Installation for users (short)

1. Install the APK on the phone. For friends, you can share the `app-release.apk`: open it on the phone and allow "Install unknown apps" for the browser/Files app. See TESTING.md for details and the 2026 developer-verification rules.
2. Open the **Gaisberg Widget** app once. This starts the background refresh.
3. Long-press the home screen → *Widgets* → *Gaisberg Widget* → drag the 2×2 widget onto the home screen. The app also has a "Widget zum Homescreen hinzufügen" button.

## Known limitations / design decisions

- **Refresh interval:** 15 min is the minimum for WorkManager. In Doze/battery-saver mode, Android may delay it further, just like iOS does. Samsung/Xiaomi and similar phones can kill background work more aggressively. If that happens, turn off battery optimisation for the app. Tapping `⟳` always refreshes immediately.
- **Rounded corners** of the wind boxes need Android 12+. On Android 8–11 the boxes are square.
- The settings apply to **all** widget instances. Scriptable had per-widget parameters. A per-widget configuration activity would be possible if needed.
- The **Panomax grid widget** (`../panomax-grid.js`) has not been ported yet. It would be a second `GlanceAppWidget` that crops the Panomax image.
