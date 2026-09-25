package io.github.jrkager.gaisbergwidget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.TypedValue
import android.view.View
import android.view.WindowInsets
import android.widget.Button
import android.widget.CompoundButton
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Switch
import android.widget.TextView
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * Minimal settings screen (plain Views, no Compose UI / AppCompat to keep dependencies small).
 * Replaces the Scriptable widget parameters.
 */
class MainActivity : Activity() {

    private val scope = MainScope()
    private lateinit var status: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val settings = WidgetSettings.load(this)
        val pad = dp(20)

        val column = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad, pad, pad)
        }

        column.addView(TextView(this).apply {
            text = getString(R.string.app_name)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 24f)
        })
        column.addView(TextView(this).apply {
            text = "Widget hinzufügen: Homescreen lange drücken → Widgets → „Gaisberg Widget“. " +
                "Tippen auf das Widget öffnet das Flugwetter, Tippen auf „⟳ Zeit“ aktualisiert sofort. " +
                "Automatische Aktualisierung alle ~15 Minuten."
            setPadding(0, dp(8), 0, dp(16))
        })

        val chartSwitch = Switch(this).apply {
            text = "Windverlauf (6 h) im Hintergrund anzeigen"
            isChecked = settings.showChart
        }
        val themeSwitch = Switch(this).apply {
            text = "Hell-/Dunkelmodus des Systems folgen"
            isChecked = settings.followSystemTheme
        }
        val onChange = CompoundButton.OnCheckedChangeListener { _, _ ->
            WidgetSettings.save(this, WidgetSettings(chartSwitch.isChecked, themeSwitch.isChecked))
            refresh()
        }
        chartSwitch.setOnCheckedChangeListener(onChange)
        themeSwitch.setOnCheckedChangeListener(onChange)
        column.addView(chartSwitch)
        column.addView(themeSwitch)

        column.addView(Button(this).apply {
            text = "Jetzt aktualisieren"
            setOnClickListener { refresh() }
        })
        column.addView(Button(this).apply {
            text = "Widget zum Homescreen hinzufügen"
            setOnClickListener { requestPin() }
        })
        column.addView(Button(this).apply {
            text = "Flugwetter öffnen"
            setOnClickListener { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(FLUGWETTER_URL))) }
        })

        status = TextView(this).apply { setPadding(0, dp(16), 0, 0) }
        column.addView(status)

        val root = ScrollView(this).apply { addView(column) }
        applySystemBarInsets(root)
        setContentView(root)

        RefreshWorker.schedule(this)
        refresh()
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    private fun refresh() {
        status.text = "Lade…"
        scope.launch {
            WidgetState.refresh(applicationContext)
            val d = WidgetState.model.value?.data
            status.text = if (d == null || d.fetchedAt == 0L) {
                "Keine Daten (offline?)"
            } else {
                "Stand ${formatEpoch(d.fetchedAt)} · Nord ${fmtWind(d.nord.avg)} · Ost ${fmtWind(d.ost.avg)} · " +
                    "TRA ${d.traLabel} · ECET ${d.ecet} · Bus ${d.busTime}"
            }
        }
    }

    private fun requestPin() {
        val mgr = getSystemService(AppWidgetManager::class.java)
        if (mgr.isRequestPinAppWidgetSupported) {
            mgr.requestPinAppWidget(ComponentName(this, GaisbergWidgetReceiver::class.java), null, null)
        } else {
            status.text = "Dieser Launcher unterstützt das nicht – bitte manuell über das Widget-Menü hinzufügen."
        }
    }

    /** targetSdk 35+ forces edge-to-edge, so keep content clear of status/navigation bar. */
    private fun applySystemBarInsets(view: View) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return
        view.setOnApplyWindowInsetsListener { v, insets ->
            val bars = insets.getInsets(WindowInsets.Type.systemBars())
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            insets
        }
    }

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()
}
