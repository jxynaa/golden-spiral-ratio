p5.disableFriendlyErrors = true; 

const PHI = (1 + Math.sqrt(5)) / 2;
const B = Math.log(PHI) / (Math.PI / 2);
const SPIRAL_CONST = Math.sqrt(1 + B * B) / B;

let essay = "Your essay content goes here... hehe hahaha hahaha raur raur raur bingbong.";

let images = [];
let processedImages = [];
let grid = [];
const cols = 3;
const rows = 3;
const totalImages = 9;

let charData = [];
let glyphCache = {}; // This will store pre-rendered images of letters
let scrollDist = 0;
let autoSpeed = 3; 
let targetManual = 0;
let lerpManual = 0;

// Gradient Settings
let sizeCompression = 0.6; 
let sizeMultiplier = 1.5;   
let globalScale = 0.5;      
let letterSpacing = 0.7; 
let wordSpacing = 0.7;  

function preload() {
  // Load images 0.jpg through 24.jpg from the assets folder
    for (let i = 0; i < totalImages; i++) {
    images[i] = loadImage(`images/${i}.jpeg`); 
  }
}

function setup() {
    cursor(HAND);
  pixelDensity(min(window.devicePixelRatio, 2)); 
  createCanvas(windowWidth, windowHeight);

  for (let i = 0; i < images.length; i++) {
    // Create a hidden canvas for each image
    let img = images[i];
    let pg = createGraphics(img.width, img.height);
    
    // Draw the image to the hidden canvas
    pg.image(img, 0, 0);

    // Apply the "Misty" Gradient to the hidden canvas
    let ctx = pg.drawingContext;
    let cx = img.width / 2;
    let cy = img.height / 2;
    let rInner = img.width * 0.2; // Solid center
    let rOuter = img.width * 0.7; // Faded edge
    
    let grad = ctx.createRadialGradient(cx, cy, rInner, cx, cy, rOuter);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0)');   // Center is clear
    grad.addColorStop(0.8, 'rgba(255, 255, 255, 0.5)'); // Soften
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.8)');   // Edge is whiter
    
    ctx.fillStyle = grad;
    pg.noStroke();
    pg.rect(0, 0, img.width, img.height);

    processedImages[i] = pg; // Save this glowy version
  }

  // 2. INITIALIZE GRID
  let cellW = width / cols;
  let cellH = height / rows;
  grid = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      grid.push({
        x: i * cellW + cellW / 2,
        y: j * cellH + cellH / 2,
        currentImgIndex: floor(random(totalImages)),
        nextImgIndex: floor(random(totalImages)),
        alpha: 0,
        fadeSpeed: 7,
        state: "idle"
      });
    }
  }
  
  // 1. PRE-RENDER THE GLYPHS (The Secret Sauce)
  // We draw every unique character in your essay to a hidden image once.
  let uniqueChars = [...new Set(essay.split(''))];
  textFont('Times New Roman');
  textSize(120); 
  
  for (let char of uniqueChars) {
    let w = ceil(textWidth(char));
    let h = 120; // Enough height for descenders
    let pg = createGraphics(w + 10, h);
    pg.pixelDensity(2);
    pg.textFont('Times New Roman');
    pg.textSize(120);
    pg.textAlign(CENTER, CENTER);
    pg.fill(255);
    pg.noStroke();
    pg.text(char, pg.width/2, pg.height/2);
    glyphCache[char] = pg; // Save the image to our cache
  }

  // 2. PRE-CALCULATE character widths
  for (let i = 0; i < essay.length; i++) {
    let char = essay.charAt(i);
    let extra = (char === ' ') ? wordSpacing : letterSpacing;
    let w = (textWidth(char) / 100) + extra;
    charData.push({ char: char, w: w });
  }
 
  
  imageMode(CENTER); // Important for the image-based text
}


function draw() {
    background(255);
    drawBackgroundGrid();
  // Wait for the browser to "settle"
  if (frameCount < 10) {;
    return;
  }
  noTint();

    let referenceR = width * 0.3; 
    let speedFactor = map(referenceR, 0, width/2, 0.2, 1.0, true)

    scrollDist += autoSpeed * (deltaTime / 16.66);

    push();
    translate(width / 2, height / 2);

    lerpManual = lerp(lerpManual, targetManual, 0.1);

  let spiralEntryDist = 800; 
  let d = spiralEntryDist + scrollDist + lerpManual;
  let charIndex = 0;

  // We draw fewer characters but more accurately
  for (let i = 0; i < 400; i++) {
    let data = charData[charIndex % charData.length];
    let r = (d / SPIRAL_CONST) * globalScale;
    
    // Performance: Skip if off-screen
    if (r > width * 0.8) {
        let tSizeEst = Math.pow(r, sizeCompression) * sizeMultiplier;
        d -= data.w * tSizeEst;
        charIndex++;
        continue;
    }

    let tSize = Math.pow(r, sizeCompression) * sizeMultiplier;
    let charW = data.w * tSize;
    
    d -= charW / 2;
    r = (d / SPIRAL_CONST) * globalScale; 

    let alpha = 255;
    if (tSize < 8) alpha = map(tSize, 2, 8, 0, 255);
    let screenCorner = (width + height) * 0.45;
    if (r > screenCorner) alpha = min(alpha, map(r, screenCorner, screenCorner * 1.3, 255, 0));

    if (alpha > 10) {
      let theta = Math.log(r / globalScale) / B;
      let x = r * cos(-theta + PI);
      let y = r * sin(-theta + PI);
      
      push();
      translate(x, y);
      rotate(-theta + PI + PI/2);
      
      // 3. DRAW IMAGE INSTEAD OF TEXT
      // This is lightning fast compared to text()
      tint(255, alpha); // Handle the transparency
      let img = glyphCache[data.char];
      // Scale the pre-rendered image to the current tSize
      let displayW = (img.width / 100) * tSize;
      let displayH = (img.height / 100) * tSize;
      image(img, 0, 0, displayW, displayH);
      
      pop();
    }

    d -= charW / 2;
    charIndex++;
    if (d < 5 || charIndex > 1500) break;
  }
    
}

function drawBackgroundGrid() {
  let cellW = width / cols;
  let cellH = height / rows;

  for (let cell of grid) {
    // --- TRANSITION LOGIC ---
    if (cell.state === "transitioning") {
      cell.alpha += cell.fadeSpeed;
      
      if (cell.alpha >= 255) {
        cell.alpha = 255;
        cell.currentImgIndex = cell.nextImgIndex;
        cell.nextImgIndex = floor(random(totalImages)); 
        cell.state = "idle"; // Go back to waiting
      }
    }

    // --- DRAW IMAGES ---
    push();
    imageMode(CENTER);
    
    let oldAlpha = (cell.state === "transitioning") ? (255 - cell.alpha) : 255;
    tint(255, oldAlpha);
    let currentImg = processedImages[cell.currentImgIndex];
    if (currentImg) {
      image(currentImg, cell.x, cell.y, cellW + 2, cellH + 2);
    }

    // 2. Draw the NEW image (Next)
    if (cell.state === "transitioning") {
      tint(255, cell.alpha);
      let nextImg = processedImages[cell.nextImgIndex];
      if (nextImg) {
        image(nextImg, cell.x, cell.y, cellW + 2, cellH + 2);
      }
    }

      // 3. --- SOFT EDGE GLOW EFFECT ---
      // Instead of a box, we draw multiple fading circles to create a soft pulse
      if (cell.state === "transitioning") {
      noFill();
      for (let i = 0; i < 15; i++) {
        // As alpha goes up (image appears), the glow expands and fades out
        let glowSize = map(cell.alpha, 0, 255, 10, cellW * 0.20);
        let glowAlpha = map(cell.alpha, 0, 255, 150, 0);
        
        // Soft white glow
        stroke(180, glowAlpha / (i + 1)); 
        strokeWeight(i + 1);
        ellipse(cell.x, cell.y, glowSize + i * 0.5);
      }
    }
    pop();
  }
}


function mouseWheel(event) {
  scrollDist += event.delta * 0.5;
  return false;
}

function mousePressed() {
  let cellW = width / cols;
  let cellH = height / rows;

  // Find which cell was clicked
  let col = floor(mouseX / cellW);
  let row = floor(mouseY / cellH);

  // Convert 2D grid position to our 1D array index
  let index = col * rows + row;

  // Only trigger if we clicked a valid cell that isn't already changing
  if (grid[index] && grid[index].state === "idle") {
    grid[index].state = "transitioning";
    grid[index].alpha = 0;
    // Pick a different image than the current one
    let newImg = floor(random(totalImages));
    while(newImg === grid[index].currentImgIndex) {
        newImg = floor(random(totalImages));
    }
    grid[index].nextImgIndex = newImg;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}