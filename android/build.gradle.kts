// AGP 9 ships built-in Kotlin support, so no org.jetbrains.kotlin.android plugin is needed.
// The Compose compiler plugin is still required because Glance is built on the Compose runtime.
plugins {
    id("com.android.application") version "9.4.0" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.4.20" apply false
}
