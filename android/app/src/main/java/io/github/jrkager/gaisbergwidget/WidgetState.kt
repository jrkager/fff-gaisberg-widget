package io.github.jrkager.gaisbergwidget

import android.content.Context
import android.graphics.Bitmap
import androidx.glance.appwidget.updateAll
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/** Everything the widget needs to render, including the pre-drawn bitmaps. */
class RenderModel(
    val data: WidgetData,
    val settings: WidgetSettings,
    val arrowNord: Bitmap,
    val arrowOst: Bitmap,
    val chart: Bitmap?,
    val builtAt: Long,
)

/**
 * Process-wide holder of the latest [RenderModel].
 *
 * Gotcha: a running Glance session does NOT call provideGlance() again on update(), it only
 * recomposes. Data loaded before provideContent{} would therefore go stale while the session
 * lives. The widget composable collects this flow instead, so every refresh reaches it.
 */
object WidgetState {
    private val _model = MutableStateFlow<RenderModel?>(null)
    val model: StateFlow<RenderModel?> = _model
    private val mutex = Mutex()

    private const val MAX_AGE_MS = 10 * 60 * 1000L

    suspend fun ensureFresh(context: Context) {
        val m = _model.value
        if (m == null || System.currentTimeMillis() - m.builtAt > MAX_AGE_MS) reload(context)
    }

    /** Fetch data, render bitmaps and push the result to all widget instances. */
    suspend fun refresh(context: Context) {
        reload(context)
        GaisbergWidget().updateAll(context)
    }

    private suspend fun reload(context: Context) = mutex.withLock {
        val settings = WidgetSettings.load(context)
        val data = FffRepository.load(context, withHistory = settings.showChart)
        _model.value = RenderModel(
            data = data,
            settings = settings,
            arrowNord = Drawing.arrow(data.nord.degrees),
            arrowOst = Drawing.arrow(data.ost.degrees),
            chart = if (settings.showChart) Drawing.windChart(data.windAvg, data.windGust) else null,
            builtAt = System.currentTimeMillis(),
        )
    }
}
