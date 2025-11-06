// Scriptable iPhone Widget - FlyForFun Wind & TRA Info (small)
// Source data: https://flyforfun.at/wp-content/themes/astra-child/core/json/fff.json

// ===================== CONFIG =====================
const FFF_URL = "https://flyforfun.at/wp-content/themes/astra-child/core/json/fff.json"

// Colors & style copied/similar to Corona widget "incidenceBox"
const BOX_BG_COLOR = new Color('999999', 0.10) // -> new Color('999999', 0.1)
const BOX_CORNER_RADIUS = 12
const BOX_PADDING = [6, 8, 6, 8]               // setPadding(6,8,6,8)

// Widget background
const WIDGET_BG = new Color("#1c1c1e")
// Footer colors
const COLOR_OK = new Color("#32CD32")
const COLOR_BAD = new Color("#d72621")
const COLOR_TEXT = Color.white()

// ===================== MAIN =====================
class FFFWidget {
  async init () {
    const data = await fetchFFF()
    const list = await this.createWidget(data)

    // Present
    Script.setWidget(list)
    if (!config.runsInWidget) await list.presentSmall()
    Script.complete()
  }

  async createWidget (data) {
    const w = new ListWidget()
    w.backgroundColor = WIDGET_BG
    w.setPadding(6, 6, 6, 6)

    // (1) Title + Bus info (right side)
    const head = w.addStack()
    head.layoutHorizontally()
    head.centerAlignContent()

    addLabel(head, "Gaisberg", Font.boldSystemFont(14), COLOR_TEXT)
    head.addSpacer()

    addBusInfo(head, data)

    w.addSpacer(6)

    // (2) Two wind boxes
    const column = w.addStack()
    column.layoutVertically()
    column.spacing = 6
    addWindBox(column, "Station_Nord", "Nord", data)
    addWindBox(column, "Station_Ost", "Ost", data)

    w.addSpacer(6)

    // (3) Footer: TRA + ECET
    addFooter(w, data)

    return w
  }
}

// ===================== BUILDERS (modular) =====================

// Small helper similar to Corona's addLabelTo(view, text, font, color)
function addLabel (view, text, font = null, color = null) {
  const t = view.addText(String(text))
  if (font) t.font = font
  if (color) t.textColor = color
  return t
}

// Add departure time of next bus
function addBusInfo(parent, data) {
  const { time, delay } = getNextBus(data)

  const s = parent.addStack()
  s.centerAlignContent()
  s.spacing = 4

  addLabel(s, "🚌", Font.systemFont(12), new Color('dddddd'))
  addLabel(s, fmtTimeFlexible(time) || "—", Font.mediumSystemFont(12), COLOR_TEXT)

  if (delay > 0) {
    addLabel(s, `+${delay}`, Font.mediumSystemFont(12), new Color("#ff3b30"))
  }
}

// Create a single “incidence-like” box for a station
function addWindBox (parent, stationKey, stationName, data) {
  const station = data?.data?.measurements?.[stationKey]?.Wind
  const avg = num(station?.actual_windspeed?.velocity)          // average wind (current)
  const max = num(station?.max_windspeed?.velocity)             // max wind
  const deg = Number(station?.actual_windspeed?.degrees)        // direction degrees
  const dirTxt = station?.actual_windspeed?.direction || ""     // e.g. "SSW"

  const box = parent.addStack()
  box.layoutHorizontally()
  box.centerAlignContent()
  box.backgroundColor = BOX_BG_COLOR
  box.cornerRadius = BOX_CORNER_RADIUS
  box.setPadding(...BOX_PADDING)

  // Left: labels
  const left = box.addStack()
  left.layoutVertically()
  left.spacing = 2

  // Row 1: Station + Avg value (side-by-side)
  const row1 = left.addStack()
  row1.layoutHorizontally()
  addLabel(row1, stationName, Font.boldSystemFont(13), COLOR_TEXT)
  row1.addSpacer(8)
  addLabel(row1, fmtWind(avg), Font.boldSystemFont(13), COLOR_TEXT)

  // Row 2: Max value
  const row2 = left.addStack()
  row2.layoutHorizontally()
  addLabel(row2, "Max:", Font.mediumSystemFont(11), new Color('cfcfcf'))
  row2.addSpacer(4)
  addLabel(row2, fmtWind(max), Font.mediumSystemFont(11), new Color('cfcfcf'))

  // Right: arrow (direction)
  box.addSpacer()
  const arrowSize = 26
  const arrowImg = drawArrow(deg, arrowSize)
  const imgView = box.addImage(arrowImg)
  imgView.imageSize = new Size(arrowSize, arrowSize)
  imgView.rightAlignImage()

  // Optional tiny direction text below arrow (kept subtle)
  // (comment out if you don't want it)
  // const dirStack = parent.addStack(); addLabel(dirStack, dirTxt, Font.mediumSystemFont(9), new Color('aaaaaa'))

  return box
}

function addFooter (w, data) {
  // TRA
  const tra = getTRAStatus(data)
  const traColor = (tra.status === "CLOSED") ? COLOR_BAD : COLOR_OK
  const traRow = w.addStack()
  traRow.layoutHorizontally()
  addLabel(traRow, `TRA: ${tra.label}`, Font.boldSystemFont(12), traColor)

  // ECET
  const ecet = getECET(data)
  const ecetRow = w.addStack()
  ecetRow.layoutHorizontally()
  addLabel(ecetRow, `ECET: ${ecet}`, Font.mediumSystemFont(12), COLOR_TEXT)
}

// ===================== DATA =====================

async function fetchFFF () {
  try {
    return await new Request(FFF_URL).loadJSON()
  } catch (e) {
    console.error(e)
    return {}
  }
}

function getTRAStatus (data) {
  const st = data?.data?.tra_status || {}
  const gsb = st["TRA GAISBERG"]?.status?.toLowerCase?.()
  const szbA = st["TRA SCHWARZENBERG A"]?.status?.toLowerCase?.()
  const szbB = st["TRA SCHWARZENBERG B"]?.status?.toLowerCase?.()

  if (szbA === "active" || szbB === "active") return { status: "ACTIVE", label: "SZB active" }
  if (gsb === "active") return { status: "ACTIVE", label: "GSB active" }
  return { status: "CLOSED", label: "CLOSED" }
}

function getECET (data) {
  const ts = data?.data?.daytimes?.ECET?.time
  if (!ts) return "N/A"
  const d = new Date(ts * 1000)
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}

function getNextBus(data) {
  const arr = data?.data?.bus_timetable
  const bus = Array.isArray(arr) && arr.length > 0 ? arr[0]?.bus_1 : null
  const time = bus?.time ?? ""
  let delay = bus?.delay ?? "0"

  // normalize delay: "-" → 0, otherwise numeric
  if (delay === "-") delay = 0
  else delay = Number(delay) || 0

  return { time, delay }
}

// ===================== DRAWING =====================

function rotateAndShift (point, angle, shift) {
  const radians = angle * (Math.PI / 180)
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const x = point.x * cos - point.y * sin
  const y = point.x * sin + point.y * cos
  return new Point(x + shift[0], y + shift[1])
}

function drawArrow (direction = 0, arrowSize = 24) {
  const ctx = new DrawContext()
  ctx.size = new Size(arrowSize, arrowSize)
  ctx.opaque = false
  ctx.respectScreenScale = true

  const p1 = new Point(0, -arrowSize / 2)
  const p2 = new Point(0, arrowSize / 2 - 1.5)
  const p3 = new Point(arrowSize / 4, arrowSize / 4)
  const p4 = new Point(0, arrowSize / 2)
  const p5 = new Point(-arrowSize / 4, arrowSize / 4)
  const shift = [arrowSize / 2, arrowSize / 2]

  const path = new Path()
  path.move(rotateAndShift(p1, direction, shift))
  path.addLine(rotateAndShift(p2, direction, shift))
  path.move(rotateAndShift(p4, direction, shift))
  path.addLine(rotateAndShift(p3, direction, shift))
  path.move(rotateAndShift(p4, direction, shift))
  path.addLine(rotateAndShift(p5, direction, shift))

  ctx.addPath(path)
  ctx.setStrokeColor(Color.white())
  ctx.setLineWidth(1.5)
  ctx.strokePath()

  return ctx.getImage()
}

// ===================== UTILS =====================

function num (x) {
  const n = Number(x)
  return Number.isFinite(n) ? n : NaN
}

function fmtWind (v) {
  if (!Number.isFinite(v)) return "—"
  // one decimal is usually nice for Holfuy/selfbuild values
  const s = Math.round(v * 10) / 10
  return `${s} km/h`
}

function fmtTimeFlexible(v) {
  if (v == null) return ""
  // if it's already “HH:MM”
  if (typeof v === "string" && /^\d{1,2}:\d{2}$/.test(v)) return v
  const n = Number(v)
  if (Number.isFinite(n)) {
    const d = new Date(n * (n < 2e10 ? 1000 : 1)) // accept seconds or ms
    const hh = String(d.getHours()).padStart(2,"0")
    const mm = String(d.getMinutes()).padStart(2,"0")
    return `${hh}:${mm}`
  }
  return String(v)
}

// ===================== RUN =====================
await new FFFWidget().init()