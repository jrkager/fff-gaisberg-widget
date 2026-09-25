package io.github.jrkager.gaisbergwidget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.ColorFilter
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.action.ActionParameters
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.appWidgetBackground
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.ContentScale
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.FontFamily
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import androidx.glance.color.ColorProvider as DayNightColor

const val FLUGWETTER_URL = "https://flyforfun.at/flugwetter/"

class GaisbergWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        // Network work happens here, before composition (Glance allows long-running setup).
        WidgetState.ensureFresh(context)
        provideContent {
            val model by WidgetState.model.collectAsState()
            model?.let { WidgetContent(it) }
        }
    }
}

class GaisbergWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = GaisbergWidget()

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        RefreshWorker.schedule(context)
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        RefreshWorker.schedule(context) // idempotent (KEEP); covers app updates/reinstalls
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        RefreshWorker.cancel(context)
    }
}

/** Tap on the "⟳ HH:MM" label. */
class RefreshAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        WidgetState.refresh(context)
    }
}

// ===================== COLORS =====================

/** Dark colors only, unless "follow system theme" is enabled (like "enable-light-mode"). */
private class Palette(followSystem: Boolean) {
    private val dyn = { light: Color, dark: Color ->
        if (followSystem) DayNightColor(day = light, night = dark) else DayNightColor(day = dark, night = dark)
    }
    val widgetBg = dyn(Color.White, Color(0xFF1C1C1E))
    val chartBg = dyn(Color(0xFFEDEDED), Color(0xFF212121))
    val text = dyn(Color.Black, Color.White)
    val maxText = dyn(Color(0xFF424242), Color(0xFFCFCFCF))
    val arrow = dyn(Color(0xFF3A3A3A), Color.White)
    val boxBg = DayNightColor(day = Color(0x26999999), night = Color(0x26999999))
    val ok = DayNightColor(day = Color(0xFF32CD32), night = Color(0xFF32CD32))
    val bad = DayNightColor(day = Color(0xFFD72621), night = Color(0xFFD72621))
    val delay = DayNightColor(day = Color(0xFFFF3B30), night = Color(0xFFFF3B30))
}

// ===================== LAYOUT =====================

@Composable
private fun WidgetContent(m: RenderModel) {
    val p = Palette(m.settings.followSystemTheme)
    val d = m.data
    val openFlugwetter = actionStartActivity(Intent(Intent.ACTION_VIEW, Uri.parse(FLUGWETTER_URL)))

    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .appWidgetBackground()
            .cornerRadius(20.dp)
            .background(if (m.chart != null) p.chartBg else p.widgetBg)
            .clickable(openFlugwetter),
    ) {
        // (4) Wind chart background (drawn first = bottom layer)
        m.chart?.let {
            Image(
                provider = ImageProvider(it),
                contentDescription = null,
                modifier = GlanceModifier.fillMaxSize(),
                contentScale = ContentScale.FillBounds,
            )
        }

        Column(modifier = GlanceModifier.fillMaxSize().padding(6.dp)) {
            // (1) Title + bus
            Row(
                modifier = GlanceModifier.fillMaxWidth().padding(start = 5.dp, top = 5.dp, end = 7.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Gaisberg", style = style(p.text, 17.sp, FontWeight.Bold))
                Spacer(GlanceModifier.defaultWeight())
                Text("🚌 ", style = style(p.text, 11.sp))
                Text(d.busTime.ifEmpty { "—" }, style = style(p.text, 11.sp, FontWeight.Medium))
                if (d.busDelay > 0) {
                    Text(" +${d.busDelay}", style = style(p.delay, 10.sp, FontWeight.Medium))
                }
            }

            Spacer(GlanceModifier.height(6.dp))

            // (2) Two wind boxes
            WindBox("Nord", d.nord, m.arrowNord, p)
            Spacer(GlanceModifier.height(3.dp))
            WindBox("Ost", d.ost, m.arrowOst, p)

            Spacer(GlanceModifier.defaultWeight())

            // (3) Footer: TRA + ECET, refresh time
            Row(
                modifier = GlanceModifier.fillMaxWidth().padding(start = 8.dp, bottom = 5.dp, end = 3.dp),
                verticalAlignment = Alignment.Bottom,
            ) {
                Column {
                    Text(
                        "TRA: ${d.traLabel}",
                        style = style(if (d.traState == TraState.CLOSED) p.bad else p.ok, 12.sp, FontWeight.Bold),
                    )
                    Text("ECET: ${d.ecet}", style = style(p.text, 12.sp, FontWeight.Medium))
                }
                Spacer(GlanceModifier.defaultWeight())
                Text(
                    text = "⟳ " + (if (d.fetchedAt > 0) formatEpoch(d.fetchedAt) else "--:--"),
                    modifier = GlanceModifier.clickable(actionRunCallback<RefreshAction>()),
                    style = TextStyle(color = p.text, fontSize = 8.sp, fontFamily = FontFamily.Monospace),
                )
            }
        }
    }
}

@Composable
private fun WindBox(name: String, s: StationWind, arrow: android.graphics.Bitmap, p: Palette) {
    Row(
        modifier = GlanceModifier
            .fillMaxWidth()
            .background(p.boxBg)
            .cornerRadius(12.dp)
            .padding(start = 8.dp, top = 5.dp, end = 8.dp, bottom = 5.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column {
            Text(name, style = style(p.text, 13.sp, FontWeight.Bold))
            Text("Max:", style = style(p.maxText, 11.sp, FontWeight.Medium))
        }
        Spacer(GlanceModifier.width(4.dp))
        Column {
            Text(fmtWind(s.avg), style = style(p.text, 13.sp, FontWeight.Bold))
            Text(fmtWind(s.max), style = style(p.maxText, 11.sp, FontWeight.Medium))
        }
        Spacer(GlanceModifier.defaultWeight())
        Image(
            provider = ImageProvider(arrow),
            contentDescription = "Windrichtung ${s.degrees.toInt()}°",
            modifier = GlanceModifier.size(ARROW_SIZE),
            colorFilter = ColorFilter.tint(p.arrow),
        )
    }
}

private val ARROW_SIZE: Dp = 28.dp

private fun style(color: ColorProvider, size: TextUnit, weight: FontWeight = FontWeight.Normal) =
    TextStyle(color = color, fontSize = size, fontWeight = weight)
