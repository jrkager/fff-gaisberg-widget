package io.github.jrkager.gaisbergwidget

import android.content.Context

/**
 * Replaces the Scriptable widget parameters ("disable-chart", "enable-light-mode").
 * Global for all widget instances, edited in [MainActivity].
 */
data class WidgetSettings(val showChart: Boolean, val followSystemTheme: Boolean) {
    companion object {
        private const val PREFS = "settings"
        private const val KEY_SHOW_CHART = "show_chart"
        private const val KEY_FOLLOW_THEME = "follow_system_theme"

        fun load(context: Context): WidgetSettings {
            val p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            return WidgetSettings(
                showChart = p.getBoolean(KEY_SHOW_CHART, true),
                followSystemTheme = p.getBoolean(KEY_FOLLOW_THEME, false),
            )
        }

        fun save(context: Context, s: WidgetSettings) {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putBoolean(KEY_SHOW_CHART, s.showChart)
                .putBoolean(KEY_FOLLOW_THEME, s.followSystemTheme)
                .apply()
        }
    }
}
