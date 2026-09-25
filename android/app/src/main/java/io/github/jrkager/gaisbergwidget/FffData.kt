package io.github.jrkager.gaisbergwidget

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

// Same endpoints as the Scriptable widget (../widget.js)
private const val FFF_URL = "https://flyforfun.at/wp-content/themes/astra-child/core/json/fff.json"
private const val WIND_MULTI_URL = "https://flyforfun.at/wp-content/themes/astra-child/assets/json/wind_24h_multi.json"

private const val LAST_H_WIND = 6

data class StationWind(val avg: Double?, val max: Double?, val degrees: Float)

enum class TraState { ACTIVE, CLOSED }

data class WidgetData(
    val nord: StationWind,
    val ost: StationWind,
    val busTime: String,
    val busDelay: Int,
    val traState: TraState,
    val traLabel: String,
    val ecet: String,
    val windAvg: List<Double>,
    val windGust: List<Double>,
    /** Time of the last successful download of fff.json (epoch ms), 0 if never. */
    val fetchedAt: Long,
)

object FffRepository {

    /** Downloads the data; falls back to the last cached response when offline. */
    suspend fun load(context: Context, withHistory: Boolean): WidgetData = withContext(Dispatchers.IO) {
        val fff = fetchCached(context, FFF_URL, "fff.json")
        val wind = if (withHistory) fetchCached(context, WIND_MULTI_URL, "wind_24h_multi.json") else null
        parse(fff?.json, wind?.json, fff?.fetchedAt ?: 0L)
    }

    private class Cached(val json: JSONObject, val fetchedAt: Long)

    private fun fetchCached(context: Context, url: String, fileName: String): Cached? {
        val file = File(context.cacheDir, fileName)
        try {
            val text = httpGet(url)
            val json = JSONObject(text) // validate before overwriting the cache
            file.writeText(text)
            return Cached(json, System.currentTimeMillis())
        } catch (e: Exception) {
            android.util.Log.w("GaisbergWidget", "Download failed: $url", e)
        }
        return try {
            if (file.exists()) Cached(JSONObject(file.readText()), file.lastModified()) else null
        } catch (e: Exception) {
            null
        }
    }

    private fun httpGet(url: String): String {
        val conn = URL(url).openConnection() as HttpURLConnection
        try {
            conn.connectTimeout = 10_000
            conn.readTimeout = 15_000
            conn.setRequestProperty("Accept", "application/json")
            conn.setRequestProperty("User-Agent", "GaisbergWidget-Android/1.0")
            if (conn.responseCode !in 200..299) error("HTTP ${conn.responseCode}")
            return conn.inputStream.bufferedReader().use { it.readText() }
        } finally {
            conn.disconnect()
        }
    }

    // ===================== PARSING =====================

    fun parse(fff: JSONObject?, windMulti: JSONObject?, fetchedAt: Long): WidgetData {
        val data = fff?.optJSONObject("data")
        val measurements = data?.optJSONObject("measurements")
        val (busTime, busDelay) = nextBus(data)
        val (traState, traLabel) = traStatus(data)
        val (avg, gust) = nordHistory(windMulti)
        return WidgetData(
            nord = station(measurements, "Station_Nord"),
            ost = station(measurements, "Station_Ost"),
            busTime = busTime,
            busDelay = busDelay,
            traState = traState,
            traLabel = traLabel,
            ecet = ecet(data),
            windAvg = avg,
            windGust = gust,
            fetchedAt = fetchedAt,
        )
    }

    private fun station(measurements: JSONObject?, key: String): StationWind {
        val wind = measurements?.optJSONObject(key)?.optJSONObject("Wind")
        val actual = wind?.optJSONObject("actual_windspeed")
        return StationWind(
            avg = actual?.opt("velocity").asDouble(),
            max = wind?.optJSONObject("max_windspeed")?.opt("velocity").asDouble(),
            degrees = (actual?.opt("degrees").asDouble() ?: 0.0).toFloat(),
        )
    }

    private fun traStatus(data: JSONObject?): Pair<TraState, String> {
        val st = data?.optJSONObject("tra_status")
        fun status(name: String) = st?.optJSONObject(name)?.optString("status")?.lowercase()
        return when {
            status("TRA SCHWARZENBERG A") == "active" || status("TRA SCHWARZENBERG B") == "active" ->
                TraState.ACTIVE to "SZB active"
            status("TRA GAISBERG") == "active" -> TraState.ACTIVE to "GSB active"
            else -> TraState.CLOSED to "CLOSED"
        }
    }

    private fun ecet(data: JSONObject?): String {
        val ts = data?.optJSONObject("daytimes")?.optJSONObject("ECET")?.opt("time").asDouble()
            ?: return "N/A"
        return formatEpoch(ts.toLong() * 1000)
    }

    private fun nextBus(data: JSONObject?): Pair<String, Int> {
        val bus = data?.optJSONArray("bus_timetable")?.optJSONObject(0)?.optJSONObject("bus_1")
        val time = fmtTimeFlexible(bus?.opt("time"))
        // "-" or missing -> 0
        val delay = bus?.opt("delay").asDouble()?.toInt() ?: 0
        return time to delay
    }

    private fun nordHistory(res: JSONObject?): Pair<List<Double>, List<Double>> {
        val arr: JSONArray = res?.optJSONObject("data")?.optJSONObject("stations")
            ?.optJSONObject("nord")?.optJSONArray("wind") ?: return emptyList<Double>() to emptyList()
        val cutoff = System.currentTimeMillis() / 1000.0 - LAST_H_WIND * 3600
        val points = (0 until arr.length())
            .mapNotNull { arr.optJSONObject(it) }
            .mapNotNull { p -> p.opt("timestamp").asDouble()?.let { it to p } }
            .filter { it.first >= cutoff }
            .sortedBy { it.first }
            .map { it.second }
        return points.mapNotNull { it.opt("wind_velocity").asDouble() } to
            points.mapNotNull { it.opt("wind_gust").asDouble() }
    }

    private fun fmtTimeFlexible(v: Any?): String {
        if (v == null || v == JSONObject.NULL) return ""
        if (v is String && Regex("""^\d{1,2}:\d{2}$""").matches(v)) return v
        val n = v.asDouble() ?: return v.toString()
        return formatEpoch(if (n < 2e10) (n * 1000).toLong() else n.toLong()) // seconds or ms
    }
}

private val HH_MM: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm")

fun formatEpoch(epochMs: Long): String =
    HH_MM.format(Instant.ofEpochMilli(epochMs).atZone(ZoneId.systemDefault()))

/** JSON values arrive as numbers or numeric strings; anything else (incl. "-") becomes null. */
private fun Any?.asDouble(): Double? = when (this) {
    is Number -> toDouble()
    is String -> trim().toDoubleOrNull()
    else -> null
}?.takeIf { it.isFinite() }

/** One decimal, but "12 km/h" instead of "12.0 km/h" (like the JS version). */
fun fmtWind(v: Double?): String {
    if (v == null) return "—"
    val r = Math.round(v * 10) / 10.0
    val s = if (r % 1.0 == 0.0) r.toLong().toString() else r.toString()
    return "$s km/h"
}
