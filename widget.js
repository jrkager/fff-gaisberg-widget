// Scriptable iPhone Widget - FlyForFun Wind & TRA Info

const url = "https://flyforfun.at/";
const req = new Request(url);
const html = await req.loadString();

// Extract windspeed & direction
const windspeedMatch = html.match(/id="actual_windspeed".*?>([\d.]+).*?(\d{1,3}(\.\d)?)º.*?<span class=['"]topline_small['"]>(.*?)<\/span>/);
const windspeed = windspeedMatch ? windspeedMatch[1] + " km/h" : "N/A";
const windDirection = windspeedMatch ? parseFloat(windspeedMatch[2]) : null;
const windDirectionText = windspeedMatch ? windspeedMatch[3] : "N/A";

// Extract max windspeed
const maxWindspeedMatch = html.match(/id="max_windspeed".*?>.*?([\d]+\.?[\d]*).*? km\/h/);
const maxWindspeed = maxWindspeedMatch ? maxWindspeedMatch[1] + " km/h" : "N/A";

// Check TRA status
const traMatch = html.match(/id="topbar_tra".*?background-color:\s?#([a-fA-F0-9]{6})/);
const traColor = traMatch ? traMatch[1] : "";
const traStatus = traColor === "d72621" ? "CLOSED" : "ACTIVE";

// Try to extract ECET time
let ecetMatch = html.match(/ECET.*?(\d{2}:\d{2})/);

// If ECET not found, try BCMT instead
if (!ecetMatch) {
  ecetMatch = html.match(/BCMT.*?(\d{2}:\d{2})/);
}

const ecetTime = ecetMatch ? ecetMatch[1] : "N/A";

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
let windText = widget.addText(`Wind: ${windspeed}`);
windText.font = Font.systemFont(14);
windText.textColor = Color.white();

widget.addSpacer(3);

// Max windspeed
let maxWindText = widget.addText(`Max: ${maxWindspeed}`);
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
