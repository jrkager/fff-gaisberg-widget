// Scriptable iPhone Widget - FlyForFun Wind & TRA Info

const url = "https://flyforfun.at/wp-content/themes/astra-child/core/json/fff.json";
const data = await new Request(url).loadJSON();

// Extract windspeed & direction
const nord = data?.data?.measurements?.["Station_Nord"]?.Wind;
const windSpeed = Number(nord?.actual_windspeed?.velocity);
const windDirection = Number(nord?.actual_windspeed?.degrees);
const windDirectionText = nord?.actual_windspeed?.direction;

// Extract max windspeed
const maxWindSpeed = Number(nord?.max_windspeed?.velocity);

// Check TRA status
const traStatus = (data?.data?.tra_status?.["TRA GAISBERG"]?.status || "").toUpperCase();

// ECET timestamp (unix seconds)
const ecetTs = data?.data?.daytimes?.ECET?.time;
// Convert to hh:mm
let ecetTime = "N/A";
if (ecetTs) {
  const d = new Date(ecetTs * 1000);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  ecetTime = `${hh}:${mm}`;
}

// Create widget
let widget = new ListWidget();
widget.backgroundColor = new Color("#1c1c1e");

// Create title row with arrow
let titleStack = widget.addStack();
titleStack.layoutHorizontally();

// Title
let title = titleStack.addText("Gaisberg");
title.font = Font.boldSystemFont(16);
title.textColor = Color.white();
titleStack.addSpacer(20);

// Wind direction arrow and degrees
if (windDirection !== null) {
	const arrowSize = 25;
	let arrowImage = drawArrow(windDirection, arrowSize);
	let arrowImageView = titleStack.addImage(arrowImage);
	arrowImageView.imageSize = new Size(arrowSize, arrowSize);
}

widget.addSpacer(7);

// Windspeed
let windText = widget.addText(`Wind: ${windSpeed} km/h`);
windText.font = Font.systemFont(14);
windText.textColor = Color.white();

widget.addSpacer(3);

// Max windspeed
let maxWindText = widget.addText(`Max: ${maxWindSpeed} km/h`);
maxWindText.font = Font.systemFont(14);
maxWindText.textColor = Color.white();

// TRA Status
widget.addSpacer(10);
let traText = widget.addText(`TRA: ${traStatus}`);
traText.font = Font.boldSystemFont(14);
traText.textColor = traStatus === "CLOSED" ? new Color("#d72621") : new Color("#32CD32"); // Red for CLOSED, Green for ACTIVE

// ECET Time
widget.addSpacer(3);
let ecetText = widget.addText(`ECET: ${ecetTime}`);
ecetText.font = Font.systemFont(14);
ecetText.textColor = Color.white();

// Show widget
Script.setWidget(widget);
widget.presentSmall();
Script.complete();

function rotateAndShift(point, angle, shift) {
	const radians = angle * (Math.PI / 180);
	const cos = Math.cos(radians);
	const sin = Math.sin(radians);

	const x = point.x * cos - point.y * sin;
	const y = point.x * sin + point.y * cos;

	return new Point(x + shift[0], y + shift[1]);
}

function drawArrow(direction, arrowSize) {
	const context = new DrawContext();
	context.size = new Size(arrowSize, arrowSize);
	context.opaque = false;
	context.respectScreenScale = true;

	const p1 = new Point(0, -arrowSize / 2);
	const p2 = new Point(0, arrowSize / 2 - 1.5);
	const p3 = new Point(arrowSize / 4, arrowSize / 4);
	const p4 = new Point(0, arrowSize / 2);
	const p5 = new Point(-arrowSize / 4, arrowSize / 4);
	const shift = [arrowSize / 2, arrowSize / 2];

	const path = new Path();
	path.move(rotateAndShift(p1, direction, shift));
	path.addLine(rotateAndShift(p2, direction, shift));
	path.move(rotateAndShift(p4, direction, shift));
	path.addLine(rotateAndShift(p3, direction, shift));
	path.move(rotateAndShift(p4, direction, shift));
	path.addLine(rotateAndShift(p5, direction, shift));

	context.addPath(path);
	context.setStrokeColor(Color.white());
	context.setLineWidth(1.5);
	context.strokePath();

	return context.getImage();
}
