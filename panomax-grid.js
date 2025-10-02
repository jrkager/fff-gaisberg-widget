let imageURL = "";
if (config.runsInWidget) {
    // Running as a widget on the home screen
    imageURL = "https://live-image.panomax.com/cams/2227/recent_reduced.jpg";
} else {
    // Running inside the Scriptable app
    imageURL = "https://live-image.panomax.com/cams/2227/recent_full.jpg";
}

async function createWidget() {
  let widget = new ListWidget();
  widget.setPadding(10, 10, 10, 10);

  let imgReq = new Request(imageURL);
  let img = await imgReq.loadImage();

  let fullWidth = img.size.width;
  let fullHeight = img.size.height;

  // Main horizontal stack: ost | right side
  let mainStack = widget.addStack();
  mainStack.layoutHorizontally();
  mainStack.spacing = 5;

  // --- Left column (ost), vertically centered ---
  let ostStack = mainStack.addStack();
  ostStack.layoutVertically();
  ostStack.addSpacer(); // push down
  {
    let crop = ost;
    let croppedImg = cropImage(img, crop, fullWidth, fullHeight);
    let imgElement = ostStack.addImage(croppedImg);
    imgElement.applyFittingContentMode();
    imgElement.cornerRadius = 5;
    imgElement.containerRelativeShape = true;
    imgElement.size = new Size(60, 60); // adjust as needed for width balance
  }
  ostStack.addSpacer(); // push up for vertical centering

  // --- Right column: vertical stack ---
  let rightCol = mainStack.addStack();
  rightCol.layoutVertically();
  rightCol.spacing = 5;

  // Top row: nord + LP
  let topRow = rightCol.addStack();
  topRow.layoutHorizontally();
  topRow.spacing = 5;

  {
    let crop = nord;
    let croppedImg = cropImage(img, crop, fullWidth, fullHeight);
    let imgElement = topRow.addImage(croppedImg);
    imgElement.applyFittingContentMode();
    imgElement.cornerRadius = 5;
    imgElement.containerRelativeShape = true;
  }
  {
    let crop = LP;
    let croppedImg = cropImage(img, crop, fullWidth, fullHeight);
    let imgElement = topRow.addImage(croppedImg);
    imgElement.applyFittingContentMode();
    imgElement.cornerRadius = 5;
    imgElement.containerRelativeShape = true;
  }

  // Bottom row: west (fills the whole 2/3 space)
  let bottomRow = rightCol.addStack();
  bottomRow.layoutHorizontally();

  {
    let crop = west;
    let croppedImg = cropImage(img, crop, fullWidth, fullHeight);
    let imgElement = bottomRow.addImage(croppedImg);
    imgElement.applyFillingContentMode();  // will stretch into available width
    imgElement.cornerRadius = 5;
    imgElement.containerRelativeShape = true;
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