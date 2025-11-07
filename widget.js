// Scriptable iPhone Widget - FlyForFun Wind & TRA Info (small)
// Source data: https://flyforfun.at/wp-content/themes/astra-child/core/json/fff.json

// ===================== CONFIG =====================
const FFF_URL = "https://flyforfun.at/wp-content/themes/astra-child/core/json/fff.json"
const WIND_MULTI_URL = "https://flyforfun.at/wp-content/themes/astra-child/assets/json/wind_24h_multi.json";

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

// Low-pass filter parameter
const LP_ALPHA = 0.05; // smaller = stronger smoothing

// ===================== MAIN =====================
class FFFWidget {
  async init () {
    const data = await fetchFFF()
    const widget = await this.createWidget(data)
    try {
        const { seriesA, seriesB } = await loadNordHistory()
        const seriesA_lp = lowPassEMA(seriesA)
        const seriesB_lp = lowPassEMA(seriesB)
        const size = new Size(300, 300)

        const chart = new LineChart(
            size.width,
            size.height,
            seriesA_lp,
            seriesB_lp,
            new Color("#ffffff", 0.2),  // color A
            new Color("#ffffff", 0.15), // color B
            new Color("#000000", 0.15), // color bg
            undefined, 
            50 // max wind
        )
        widget.backgroundImage = chart.draw()
    } catch (e) {
        widget.backgroundColor = new Color("#1c1c1e")
    }

    // Present
    Script.setWidget(widget)
    if (!config.runsInWidget) await widget.presentSmall()
    Script.complete()
  }

  async createWidget (data) {
    const w = new ListWidget()
//     w.backgroundColor = WIDGET_BG
    w.setPadding(6, 6, 6, 6)

    // (1) Title + Bus info (right side)
    const head = w.addStack()
    head.layoutHorizontally()
    head.centerAlignContent()
    head.setPadding(5,5,0,0)
    
    const title = addLabel(head, "Gaisberg", Font.boldSystemFont(17), COLOR_TEXT)
    head.addSpacer()
    
    const busWrap = head.addStack()
    busWrap.layoutHorizontally()
    busWrap.centerAlignContent()
    busWrap.setPadding(4, 0, 0, 7) // top, left, bottom, right
    addBusInfo(busWrap, data)

    w.addSpacer(6)

    // (2) Two wind boxes
    const column = w.addStack()
    column.layoutVertically()
    column.spacing = 3
    addWindBox(column, "Station_Nord", "Nord", data)
    addWindBox(column, "Station_Ost", "Ost", data)

    w.addSpacer(2)

    // (3) Footer: TRA + ECET
    const foot = w.addStack()
    foot.layoutVertically()
    foot.setPadding(0, 8, 5, 0)
    addFooterContent(foot, data)

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

  addLabel(s, "🚌", Font.systemFont(11), new Color('dddddd'))
  addLabel(s, fmtTimeFlexible(time) || "—", Font.mediumSystemFont(11), COLOR_TEXT)

  if (delay > 0) {
    addLabel(s, `+${delay}`, Font.mediumSystemFont(10), new Color("#ff3b30"))
  }
}

// Create a single “incidence-like” box for a station
function addWindBox (parent, stationKey, stationName, data) {
  const station = data?.data?.measurements?.[stationKey]?.Wind
  const avg = num(station?.actual_windspeed?.velocity)
  const max = num(station?.max_windspeed?.velocity)
  const deg = Number(station?.actual_windspeed?.degrees) || 0

  const box = parent.addStack()
  box.layoutHorizontally()
  box.centerAlignContent()
  box.backgroundColor = BOX_BG_COLOR
  box.cornerRadius = BOX_CORNER_RADIUS
  box.setPadding(...BOX_PADDING)

  // two-column text area
  const txt = box.addStack()
  txt.layoutHorizontally()
  txt.centerAlignContent()
  txt.spacing = 4

  const colL = txt.addStack()
  colL.layoutVertically()
  colL.spacing = 2
  addLabel(colL, stationName, Font.boldSystemFont(13), COLOR_TEXT)            // bold station
  addLabel(colL, "Max:", Font.mediumSystemFont(11), new Color('cfcfcf'))

  const colR = txt.addStack()
  colR.layoutVertically()
  colR.spacing = 2
  addLabel(colR, fmtWind(avg), Font.boldSystemFont(13), COLOR_TEXT)           // avg value
  addLabel(colR, fmtWind(max), Font.mediumSystemFont(11), new Color('cfcfcf'))// max value aligned

  // arrow
  box.addSpacer()
  const arrowSize = 24
  const arrowImg = drawArrow(deg, arrowSize)
  const imgView = box.addImage(arrowImg)
  imgView.imageSize = new Size(arrowSize, arrowSize)
  imgView.rightAlignImage()

  return box
}

function addFooterContent (foot, data) {
  // TRA
  const tra = getTRAStatus(data)
  const traColor = (tra.status === "CLOSED") ? COLOR_BAD : COLOR_OK
  const traRow = foot.addStack()
  traRow.layoutHorizontally()
  addLabel(traRow, `TRA: ${tra.label}`, Font.boldSystemFont(12), traColor)

  // ECET
  const ecet = getECET(data)
  const ecetRow = foot.addStack()
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

async function loadNordHistory() {
  const res = await new Request(WIND_MULTI_URL).loadJSON();
  const arr = (res?.data?.stations?.nord?.wind ?? [])
    .filter(x => x && Number.isFinite(Number(x.timestamp)))
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

  const seriesA = arr.map(x => Number(x.wind_velocity)).filter(Number.isFinite);
  const seriesB = arr.map(x => Number(x.wind_gust)).filter(Number.isFinite);
  return { seriesA, seriesB };
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

/*
		p4
	/	p2	\
p5		|	  p3
		|
		p1

*/
  const p1 = new Point(0, -arrowSize / 2)
  const p2 = new Point(0, arrowSize / 2 - 0.5)
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

class LineChart {
  constructor(width, height, valuesA, valuesB, colorA, colorB, backColor, manual_min = undefined, manual_max = undefined) {
    this.width = width; this.height = height;
    this.valuesA = valuesA; this.valuesB = valuesB;
    this.colorA = colorA; this.colorB = colorB;
    this.backColor = backColor;
    this.manual_min = manual_min; this.manual_max = manual_max;
  }
  _getMinMax(values) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const diff = max - min;
    return [min - diff * 0.05, max + diff * 0.05];
  }
  _convert(value, min, max) {
    return ((value - min) / (max - min)) * this.height;
  }
  draw() {
    const context = new DrawContext();
    context.size = new Size(this.width, this.height);
    context.opaque = false;
    context.respectScreenScale = true;

    // Background
    context.setFillColor(this.backColor);
    context.fillRect(new Rect(0, 0, this.width, this.height));

    // Axes scaling
    const allVals = [...this.valuesA, ...this.valuesB];
    let [min, max] = this._getMinMax(allVals);
    if (this.manual_min !== undefined) min = this.manual_min;
    if (this.manual_max !== undefined) max = this.manual_max;
    const n = Math.max(this.valuesA.length, this.valuesB.length);

    function pathFor(values) {
      const path = new Path();
      for (let i = 0; i < values.length; i++) {
        const x = (i / (n - 1)) * (context.size.width);
        const y = context.size.height - this._convert(values[i], min, max);
        if (i === 0) path.move(new Point(x, y));
        else path.addLine(new Point(x, y));
      }
      return path;
    }

    // Series A
    context.addPath(pathFor.call(this, this.valuesA));
    context.setStrokeColor(this.colorA);
    context.setLineWidth(2);
    context.strokePath();

    // Series B
    context.addPath(pathFor.call(this, this.valuesB));
    context.setStrokeColor(this.colorB);
    context.setLineWidth(1.5);
    context.strokePath();

    return context.getImage();
  }
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

function lowPassEMA(arr, alpha = LP_ALPHA) {
  if (!arr?.length) return [];
  let y = Number(arr[0]) || 0;
  const out = [y];
  for (let i = 1; i < arr.length; i++) {
    const x = Number(arr[i]) || 0;
    y = alpha * x + (1 - alpha) * y;
    out.push(y);
  }
  return out;
}

// ===================== EXECUTE =====================
await new FFFWidget().init()