package io.github.jrkager.gaisbergwidget

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path

// Low-pass filter parameter, smaller = stronger smoothing
private const val LP_ALPHA = 0.05
// Fixed upper bound of the chart's vertical axis (km/h)
private const val MAX_WIND = 50.0

object Drawing {

    /**
     * Wind arrow in white; the widget tints it via ColorFilter so it can follow light/dark mode
     * (unlike Scriptable, where the arrow had to stay gray).
     * Unrotated the arrow points down (wind from north), rotated clockwise by [degrees].
     */
    fun arrow(degrees: Float, sizePx: Int = 96): Bitmap {
        val bmp = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        val s = sizePx.toFloat()
        val stroke = s / 15f
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.WHITE
            style = Paint.Style.STROKE
            strokeWidth = stroke
            strokeCap = Paint.Cap.ROUND
            strokeJoin = Paint.Join.ROUND
        }
        val c = s / 2
        val r = s / 2 - stroke // keep the stroke inside the bitmap at every angle
        val path = Path().apply {
            moveTo(c, c - r)
            lineTo(c, c + r)
            moveTo(c - r / 2, c + r / 2)
            lineTo(c, c + r)
            lineTo(c + r / 2, c + r / 2)
        }
        canvas.rotate(degrees, c, c)
        canvas.drawPath(path, paint)
        return bmp
    }

    /** Transparent line chart (avg + gust) used as widget background; null if too few points. */
    fun windChart(avg: List<Double>, gust: List<Double>, widthPx: Int = 600, heightPx: Int = 600): Bitmap? {
        if (avg.size < 2 || gust.size < 2) return null
        val a = lowPassEMA(avg)
        val b = lowPassEMA(gust)

        // Same scaling as the JS LineChart: min from data (-5 %), max fixed
        val all = a + b
        val lo = all.min()
        val hi = all.max()
        val min = lo - (hi - lo) * 0.05
        val max = MAX_WIND
        val n = maxOf(a.size, b.size)

        val bmp = Bitmap.createBitmap(widthPx, heightPx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        fun pathFor(values: List<Double>) = Path().apply {
            values.forEachIndexed { i, v ->
                val x = i.toFloat() / (n - 1) * widthPx
                val y = (heightPx - (v - min) / (max - min) * heightPx).toFloat()
                if (i == 0) moveTo(x, y) else lineTo(x, y)
            }
        }
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeJoin = Paint.Join.ROUND
        }
        paint.color = Color.argb(0.6f, 0.54f, 0.54f, 0.54f) // avg
        paint.strokeWidth = 3f
        canvas.drawPath(pathFor(a), paint)
        paint.color = Color.argb(0.4f, 0.54f, 0.54f, 0.54f) // gust
        paint.strokeWidth = 2f
        canvas.drawPath(pathFor(b), paint)
        return bmp
    }

    private fun lowPassEMA(arr: List<Double>, alpha: Double = LP_ALPHA): List<Double> {
        if (arr.isEmpty()) return emptyList()
        var y = arr[0]
        return arr.map { x -> y = alpha * x + (1 - alpha) * y; y }
    }
}
