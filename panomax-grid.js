var imageURL = "";
if (config.runsInWidget) {
    // Running as a widget on the home screen
    imageURL = "https://live-image.panomax.com/cams/2227/recent_reduced.jpg";
} else {
    // Running inside the Scriptable app
    imageURL = "https://live-image.panomax.com/cams/2227/recent_full.jpg";
}

// Crop coordinates
const ost  = { x1: 0.10, y1: 0.65, x2: 0.18, y2: 0.95 }; // Ost
const nord = { x1: 0.54, y1: 0.60, x2: 0.65, y2: 0.90 }; // Nord
const west = { x1: 0.50, y1: 0.50, x2: 0.58, y2: 0.60 }; // West
const LP   = { x1: 0.93, y1: 0.70, x2: 0.99, y2: 0.80 }; // LP

async function createWidget() {
    let widget = new ListWidget();
    widget.setPadding(10, 10, 10, 10);
    
	let imgReq = new Request(imageURL);
    let img = await imgReq.loadImage();
    
    let fullWidth = img.size.width;
    let fullHeight = img.size.height;
    
    let stack = widget.addStack();
    stack.layoutHorizontally();
    stack.spacing = 5;
    
    { // ost
		let crop = ost;
		let croppedImg = cropImage(img, crop, fullWidth, fullHeight);
		let imgElement = stack.addImage(croppedImg);
		imgElement.applyFittingContentMode();
		imgElement.cornerRadius = 5;
	}
    { // nord
		let crop = nord;
		let croppedImg = cropImage(img, crop, fullWidth, fullHeight);
		let imgElement = stack.addImage(croppedImg);
		imgElement.applyFittingContentMode();
		imgElement.cornerRadius = 5;
	}
   
    let substack = stack.addStack();
    substack.layoutVertically();
    substack.spacing = 5;
    
    { // west
		let crop = west;
		let croppedImg = cropImage(img, crop, fullWidth, fullHeight);
		let imgElement = substack.addImage(croppedImg);
		imgElement.applyFittingContentMode();
		imgElement.cornerRadius = 5;
	}
    { // LP
		let crop = LP;
		let croppedImg = cropImage(img, crop, fullWidth, fullHeight);
		let imgElement = substack.addImage(croppedImg);
		imgElement.applyFittingContentMode();
		imgElement.cornerRadius = 5;
	}
    
    return widget;
}

// helper to crop from normalized coords
function cropImage(img, crop, fullWidth, fullHeight) {
  let cropWidth = Math.round((crop.x2 - crop.x1) * fullWidth);
  let cropHeight = Math.round((crop.y2 - crop.y1) * fullHeight);
  let cropX = Math.round(crop.x1 * fullWidth);
  let cropY = Math.round(crop.y1 * fullHeight);

  let ctx = new DrawContext();
  ctx.size = new Size(cropWidth, cropHeight);
  ctx.drawImageAtPoint(img, new Point(-cropX, -cropY));
  return ctx.getImage();
}

let widget = await createWidget();
Script.setWidget(widget);
widget.presentMedium();
Script.complete();



