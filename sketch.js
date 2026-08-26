// ==========================================
// 1. GAME STATE & GLOBAL CONFIGURATION
// ==========================================
let currentScene = 1;
let gameStage = 1; 
let smokeEndTime = 0;
let isDrinkMode = false;
let lastBrewedColor = [40, 50, 70];
let targetRemedyColor = [0, 0, 0];
let targetRecipe = [];

const baseColors = [
  [255, 0, 0],   // Red
  [0, 255, 0],   // Green
  [0, 0, 255]    // Blue
];

let allRings = [[]];
let potIngredients = [];
let lastIngredientTime = 0;
let gameStartTime = 0;
let playerHealth = 100;
let showGrimoire = false;
let ps;

let btn1, btn2, btn3, btnClear, btnDrink, btnNextStage, btnRestart, btnCloseGrimoire;

// ==========================================
// 2. BUTTON CLASS
// ==========================================
class Button {
  constructor(config) {
    this.x = config.x || 0;
    this.y = config.y || 0;
    this.w = config.width || 110;
    this.h = config.height || 30;
    this.label = config.label || "Next";
    this.onClick = config.onClick || function() {};
  }

  isHovered() {
    return mouseX >= this.x && mouseX <= this.x + this.w &&
           mouseY >= this.y && mouseY <= this.y + this.h;
  }

  draw() {
    push();
    stroke(255, 215, 0);
    strokeWeight(1.5);
    fill(this.isHovered() ? color(0, 180, 210) : color(20, 80, 120));
    rect(this.x, this.y, this.w, this.h, 6);
    
    noStroke();
    fill(255);
    textSize(11);
    textAlign(CENTER, CENTER);
    text(this.label, this.x + this.w / 2, this.y + this.h / 2);
    pop();
  }

  handleMouseClick() {
    if (this.isHovered()) {
      this.onClick();
      return true;
    }
    return false;
  }
}

// ==========================================
// 3. PARTICLE SYSTEM
// ==========================================
class Particle {
  constructor(pos) {
    this.acc = createVector(0, -0.04);
    this.vel = createVector(random(-0.8, 0.8), random(-0.5, -1.2));
    this.pos = pos.copy();
    this.ttl = 255;
  }

  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.ttl -= 2.5;
  }
}

class Star extends Particle {
  constructor(pos) {
    super(pos);
    this.size = random(6, 16);
  }

  draw() {
    this.update();
    push();
    fill(255, 215, 0, map(this.ttl, 0, 255, 0, 255));
    noStroke();
    drawStarShape(this.pos.x, this.pos.y, this.size * 0.3, this.size * 0.6, 5);
    pop();
  }
}

function drawStarShape(x, y, radius1, radius2, npoints) {
  let angle = TWO_PI / npoints;
  let halfAngle = angle / 2.0;
  beginShape();
  for (let a = 0; a < TWO_PI; a += angle) {
    let sx = x + cos(a) * radius2;
    let sy = y + sin(a) * radius2;
    vertex(sx, sy);
    sx = x + cos(a + halfAngle) * radius1;
    sy = y + sin(a + halfAngle) * radius1;
    vertex(sx, sy);
  }
  endShape(CLOSE);
}

class Smoke extends Particle {
  constructor(pos, colorArr) {
    super(pos);
    this.size = random(14, 26);
    this.color = colorArr || [140, 140, 150];
  }

  draw() {
    this.update();
    push();
    noStroke();
    fill(this.color[0], this.color[1], this.color[2], map(this.ttl, 0, 255, 0, 150));
    ellipse(this.pos.x, this.pos.y, this.size, this.size);
    pop();
  }
}

class ParticleSystem {
  constructor(pos) {
    this.origin = pos.copy();
    this.particles = [];
    this.maxParticles = 80;
  }

  addStar() {
    if (this.particles.length < this.maxParticles) {
      this.particles.push(new Star(this.origin));
    }
  }

  addSmoke(colorArr) {
    if (this.particles.length < this.maxParticles) {
      let spawnPoint = createVector(this.origin.x + random(-25, 25), this.origin.y);
      this.particles.push(new Smoke(spawnPoint, colorArr));
    }
  }

  run() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].draw();
      if (this.particles[i].ttl <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }
}

// ==========================================
// 4. COLOR MATH & TARGET GENERATION
// ==========================================
function blendColors(arr) {
  if (!arr || arr.length === 0) return [40, 50, 70];
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < arr.length; i++) {
    r += arr[i][0];
    g += arr[i][1];
    b += arr[i][2];
  }
  return [round(r / arr.length), round(g / arr.length), round(b / arr.length)];
}

function getPossibleColorsForTier(tier) {
  if (tier === 0) return baseColors;
  
  if (allRings[tier] && allRings[tier].length > 0) {
    return allRings[tier].map(item => item.color);
  }
  
  let lowerPool = getPossibleColorsForTier(tier - 1);
  let candidates = [];
  for (let c = 0; c < 3; c++) {
    let num = floor(random(2, 4));
    let combo = [];
    for (let i = 0; i < num; i++) {
      combo.push(lowerPool[floor(random(0, lowerPool.length))]);
    }
    candidates.push(blendColors(combo));
  }
  return candidates;
}

function setupStageTarget(stage) {
  let sourceTier = stage - 1;
  let pool = getPossibleColorsForTier(sourceTier);
  
  let numItems = floor(random(2, 4));
  targetRecipe = [];
  for (let i = 0; i < numItems; i++) {
    targetRecipe.push(pool[floor(random(0, pool.length))]);
  }

  targetRemedyColor = blendColors(targetRecipe);
}

function updateIngredientsAndHealth() {
  // Regenerate 1 random base RGB color every 10 seconds
  if (millis() - lastIngredientTime >= 10000) {
    let randomIndex = floor(random(0, baseColors.length));
    if (allRings[0] && allRings[0][randomIndex]) {
      allRings[0][randomIndex].count++;
    }
    lastIngredientTime = millis();
  }
  
  let elapsedSeconds = (millis() - gameStartTime) / 1000;
  playerHealth = max(0, 100 - (elapsedSeconds * 0.5));
  if (playerHealth <= 0) {
    currentScene = 4;
  }
}

function getSymmetricalAngle(index, total) {
  if (total === 1) return -HALF_PI;
  let margin = 0.25;
  return map(index, 0, total - 1, -PI + margin, -margin);
}

// ==========================================
// 5. HUD & RENDERING HELPERS
// ==========================================
function drawHealthBar() {
  push();
  stroke(0);
  strokeWeight(1.5);
  fill(40);
  rect(95, 12, 185, 18, 5);
  
  noStroke();
  fill(map(playerHealth, 0, 100, 255, 0), map(playerHealth, 0, 100, 0, 220), 50);
  rect(96, 13, map(playerHealth, 0, 100, 0, 183), 16, 4);
  
  fill(255);
  textSize(11);
  textAlign(CENTER, CENTER);
  text("Poison: " + ceil(playerHealth) + "%", 187, 21);
  pop();
}

function drawTargetCure() {
  push();
  fill(0, 0, 0, 180);
  stroke(255, 215, 0);
  strokeWeight(1.5);
  rect(288, 8, 104, 75, 5);
  
  fill(255, 215, 0);
  textSize(10);
  textAlign(CENTER, CENTER);
  text("Stage " + gameStage + " / 4 Target", 340, 18);
  
  fill(targetRemedyColor[0], targetRemedyColor[1], targetRemedyColor[2]);
  stroke(255);
  strokeWeight(1);
  ellipse(340, 36, 18, 18);
  
  // EMERGENCY HINT LOGIC: Locked until Poison Health <= 30%
  if (playerHealth <= 30) {
    fill(255, 90, 90);
    textSize(8);
    textAlign(CENTER, CENTER);
    text("Emergency Hint:", 340, 51);

    if (targetRecipe && targetRecipe.length > 0) {
      let startX = 340 - ((targetRecipe.length - 1) * 12) / 2;
      for (let k = 0; k < targetRecipe.length; k++) {
        fill(targetRecipe[k][0], targetRecipe[k][1], targetRecipe[k][2]);
        stroke(255);
        strokeWeight(1);
        ellipse(startX + k * 12, 64, 9, 9);
      }
    }
  } else {
    fill(140);
    textSize(8);
    textAlign(CENTER, CENTER);
    text("Hint locked", 340, 51);
    text("Unlocks at <30% HP", 340, 63);
  }
  pop();
}

function drawCauldron() {
  let liqR = 40, liqG = 50, liqB = 70;
  if (potIngredients.length > 0) {
    let blended = blendColors(potIngredients.map(item => item.color));
    liqR = blended[0];
    liqG = blended[1];
    liqB = blended[2];
  }
  
  push();
  fill(36, 36, 36); 
  stroke(0);
  strokeWeight(1.5);
  bezier(150, 285, 50, 430, 350, 430, 250, 285);
  
  fill(liqR, liqG, liqB);
  ellipse(200, 285, 96, 22);
  pop();
}

function drawIngredientRings() {
  let centerX = 200, centerY = 260;
  push();
  for (let r = 0; r < allRings.length; r++) {
    let radius = 50 + r * 28;
    let ringItems = allRings[r];
    for (let i = 0; i < ringItems.length; i++) {
      if (ringItems[i].count > 0) {
        let angle = getSymmetricalAngle(i, ringItems.length);
        let x = centerX + radius * cos(angle);
        let y = centerY + radius * sin(angle);
        
        fill(ringItems[i].color[0], ringItems[i].color[1], ringItems[i].color[2]);
        stroke(r > 0 ? 255 : 0);
        strokeWeight(1.5);
        ellipse(x, y, 20, 20);
        
        fill(0);
        textSize(9);
        textAlign(CENTER, CENTER);
        text(ringItems[i].count, x, y);
      }
    }
  }
  pop();
}

function drawPotContents() {
  push();
  for (let i = 0; i < potIngredients.length; i++) {
    let item = potIngredients[i];
    fill(item.color[0], item.color[1], item.color[2]);
    stroke(255);
    strokeWeight(1);
    ellipse(170 + i * 30, 335, 16, 16);
  }
  pop();
}

function drawGrimoireOverlay() {
  if (!showGrimoire) return;
  
  push();
  fill(10, 10, 25, 245);
  stroke(isDrinkMode ? color(255, 60, 60) : color(255, 215, 0));
  strokeWeight(2);
  rect(15, 10, 370, 380, 10);
  
  btnCloseGrimoire.draw();
  
  fill(255, 215, 0);
  textSize(15);
  textAlign(CENTER, CENTER);
  text("Alchemy Tree", 200, 24);
  
  if (isDrinkMode) {
    fill(255, 120, 120);
    textSize(11);
    text("Click a Level " + gameStage + " potion to test Stage " + gameStage + "!", 200, 42);
  }
  
  let levelY = [68, 120, 172, 224, 276, 330];
  for (let l = 0; l <= 5; l++) {
    if (l === gameStage) {
      fill(255, 215, 0, 50);
      noStroke();
      rect(20, levelY[l] - 12, 360, 24, 4);
    }

    fill(l === gameStage ? color(255, 215, 0) : color(200));
    textSize(10);
    textAlign(LEFT, CENTER);
    text("Lvl " + l + (l === gameStage ? " (Target):" : ":"), 25, levelY[l]);
    
    if (l < 5) {
      stroke(255, 215, 0, 60);
      strokeWeight(1);
      line(200, levelY[l] + 10, 200, levelY[l + 1] - 10);
    }
    
    if (l === 0) {
      for (let b = 0; b < baseColors.length; b++) {
        let bx = map(b, 0, baseColors.length - 1, 140, 260);
        fill(baseColors[b][0], baseColors[b][1], baseColors[b][2]);
        stroke(255);
        strokeWeight(1);
        ellipse(bx, levelY[l], 14, 14);
      }
    } else if (l === 5) {
      fill(targetRemedyColor[0], targetRemedyColor[1], targetRemedyColor[2]);
      stroke(255, 215, 0);
      strokeWeight(2);
      ellipse(200, levelY[l], 22, 22);
      
      fill(255, 215, 0);
      textSize(9);
      textAlign(CENTER, TOP);
      text("Target Remedy", 200, levelY[l] + 12);
    } else {
      let ringItems = (l < allRings.length) ? allRings[l] : [];
      let maxSlots = max(3, ringItems.length);
      for (let n = 0; n < maxSlots; n++) {
        let nx = map(n, 0, max(1, maxSlots - 1), 120, 320);
        if (n < ringItems.length) {
          let c = ringItems[n].color;
          fill(c[0], c[1], c[2]);
          stroke(255);
          strokeWeight(1);
          ellipse(nx, levelY[l], 16, 16);
        } else {
          fill(20);
          stroke(70);
          strokeWeight(1);
          ellipse(nx, levelY[l], 16, 16);
          fill(120);
          textSize(8);
          textAlign(CENTER, CENTER);
          text("?", nx, levelY[l]);
        }
      }
    }
  }
  pop();
}

// ==========================================
// 6. INTERACTION & GAMEPLAY LOGIC
// ==========================================
function drinkPotion(c) {
  if (Math.abs(c[0] - targetRemedyColor[0]) <= 3 && 
      Math.abs(c[1] - targetRemedyColor[1]) <= 3 && 
      Math.abs(c[2] - targetRemedyColor[2]) <= 3) {
      
    currentScene = (gameStage < 4) ? 6 : 5;
  } else {
    gameStartTime -= 20000;
    isDrinkMode = false;
    showGrimoire = false;
  }
}

function handleTreeClick() {
  if (!showGrimoire || !isDrinkMode) return false;
  let levelY = [68, 120, 172, 224, 276, 330];
  
  for (let b = 0; b < baseColors.length; b++) {
    let bx = map(b, 0, baseColors.length - 1, 140, 260);
    if (dist(mouseX, mouseY, bx, levelY[0]) <= 12) {
      drinkPotion(baseColors[b]);
      return true;
    }
  }
  
  for (let l = 1; l <= 4; l++) {
    let ringItems = (l < allRings.length) ? allRings[l] : [];
    let maxSlots = max(3, ringItems.length);
    for (let n = 0; n < ringItems.length; n++) {
      let nx = map(n, 0, max(1, maxSlots - 1), 120, 320);
      if (dist(mouseX, mouseY, nx, levelY[l]) <= 14) {
        drinkPotion(ringItems[n].color);
        return true;
      }
    }
  }
  return false;
}

function handleIngredientClick() {
  if (showGrimoire || potIngredients.length >= 3) return;
  let centerX = 200, centerY = 260;
  for (let r = 0; r < allRings.length; r++) {
    let radius = 50 + r * 28;
    let ringItems = allRings[r];
    for (let i = 0; i < ringItems.length; i++) {
      if (ringItems[i].count > 0) {
        let angle = getSymmetricalAngle(i, ringItems.length);
        let x = centerX + radius * cos(angle);
        let y = centerY + radius * sin(angle);
        if (dist(mouseX, mouseY, x, y) <= 14) {
          ringItems[i].count--;
          potIngredients.push({ color: ringItems[i].color, tier: r });
          return;
        }
      }
    }
  }
}

// ==========================================
// 7. SETUP & MAIN LOOP
// ==========================================
function setup() {
  createCanvas(400, 400);
  ps = new ParticleSystem(createVector(200, 285));
  initGame();
}

function initGame() {
  allRings = [[]];
  for (let k = 0; k < baseColors.length; k++) {
    allRings[0].push({ color: baseColors[k], count: 5 });
  }
  potIngredients = [];
  playerHealth = 100;
  showGrimoire = false;
  isDrinkMode = false;
  gameStage = 1;
  lastBrewedColor = [40, 50, 70];
  setupStageTarget(1);
  gameStartTime = millis();
  lastIngredientTime = millis();

  btnCloseGrimoire = new Button({
    x: 352, y: 16, width: 24, height: 24, label: "X",
    onClick: function() { showGrimoire = false; isDrinkMode = false; }
  });

  btn1 = new Button({ x: 275, y: 350, label: "Next!", onClick: function() { currentScene = 2; } });
  
  btn2 = new Button({ 
    x: 275, y: 350, label: "Start Game!", 
    onClick: function() { 
      currentScene = 3; 
      gameStage = 1;
      setupStageTarget(1);
      lastIngredientTime = millis();
      gameStartTime = millis();
    } 
  });
  
  btn3 = new Button({ 
    x: 290, y: 350, width: 95, label: "Boil!", 
    onClick: function() { 
      if (showGrimoire) return;
      smokeEndTime = millis() + 4000; 
      
      if (potIngredients.length > 0) {
        let maxTier = 0;
        for (let i = 0; i < potIngredients.length; i++) {
          if (potIngredients[i].tier > maxTier) { maxTier = potIngredients[i].tier; }
        }
        
        let targetTier = maxTier + 1;
        let mixedColor = blendColors(potIngredients.map(item => item.color));
        lastBrewedColor = mixedColor;
        
        while (allRings.length <= targetTier) { allRings.push([]); }
        
        let targetRing = allRings[targetTier];
        let found = false;
        for (let j = 0; j < targetRing.length; j++) {
          if (targetRing[j].color[0] === mixedColor[0] && 
              targetRing[j].color[1] === mixedColor[1] && 
              targetRing[j].color[2] === mixedColor[2]) {
            targetRing[j].count++;
            found = true;
            break;
          }
        }
        if (!found) { targetRing.push({ color: mixedColor, count: 1 }); }
        potIngredients = [];
      } else {
        lastBrewedColor = [40, 50, 70];
      }
    } 
  });

  // POT INVENTORY RETURN (CLEAR POT) BUTTON
  btnClear = new Button({
    x: 185, y: 350, width: 95, label: "Clear Pot",
    onClick: function() {
      if (showGrimoire) return;
      for (let item of potIngredients) {
        if (allRings[item.tier]) {
          let ringItem = allRings[item.tier].find(r => 
            r.color[0] === item.color[0] && 
            r.color[1] === item.color[1] && 
            r.color[2] === item.color[2]
          );
          if (ringItem) {
            ringItem.count++;
          } else {
            allRings[item.tier].push({ color: item.color, count: 1 });
          }
        }
      }
      potIngredients = [];
    }
  });

  btnDrink = new Button({
    x: 8, y: 10, width: 80, height: 25, label: "Drink Potion",
    onClick: function() { showGrimoire = true; isDrinkMode = true; }
  });

  btnNextStage = new Button({
    x: 145, y: 250, width: 110, label: "Next Stage",
    onClick: function() {
      gameStage++;
      setupStageTarget(gameStage);
      playerHealth = min(100, playerHealth + 30);
      gameStartTime = millis() - (100 - playerHealth) * 2000;
      isDrinkMode = false;
      showGrimoire = false;
      currentScene = 3;
    }
  });

  btnRestart = new Button({
    x: 145, y: 250, width: 110, label: "Try Again",
    onClick: function() {
      initGame();
      currentScene = 3;
    }
  });
}

const scenes = {
  1: function() {
    background(72, 7, 105); 
    drawCauldron();
    ps.addStar();
    ps.run(); 
    fill(0, 251, 255); textSize(24); textAlign(CENTER, CENTER);
    text("Alche-MESS Boiling Point", 200, 100);
    btn1.draw();
  },
  2: function() {
    background(173, 239, 255); 
    fill(7, 14, 145); textSize(13); textAlign(CENTER, CENTER);
    let rules = [
      "Rules of the Alchemist:", 
      "You are poisoned! Drink 4 remedies to survive.", 
      "Stage 1: Mix 2-3 Base potions (Level 0).", 
      "Stage 2: Mix 2-3 Level 1 potions.", 
      "Stage 3: Mix 2-3 Level 2 potions.", 
      "Stage 4: Mix 2-3 Level 3 potions to win!",
      "", "Emergency Hints unlock when Poison is < 30%!"
    ];
    for (let i = 0; i < rules.length; i++) {
      text(rules[i], 200, 50 + i * 38);
    }
    btn2.draw();
  },
  3: function() {
    background(173, 239, 255); 
    updateIngredientsAndHealth();
    
    if (millis() < smokeEndTime) { ps.addSmoke(lastBrewedColor); }
    
    drawIngredientRings();
    drawCauldron();
    drawPotContents();
    ps.run();
    
    drawHealthBar();
    drawTargetCure();
    
    btn3.draw();
    btnClear.draw();
    btnDrink.draw();
    drawGrimoireOverlay();
  },
  4: function() {
    background(50, 10, 10);
    fill(255, 50, 50); textSize(28); textAlign(CENTER, CENTER);
    text("GAME OVER", 200, 140);
    fill(220); textSize(15);
    text("Failed at Stage " + gameStage + "!", 200, 180);
    btnRestart.draw();
  },
  5: function() {
    background(10, 50, 30);
    fill(255, 215, 0); textSize(28); textAlign(CENTER, CENTER);
    text("VICTORY!", 200, 140);
    fill(220); textSize(15);
    text("You conquered all 4 stages and survived!", 200, 180);
    btnRestart.draw();
  },
  6: function() {
    background(15, 30, 60);
    fill(0, 234, 255); textSize(24); textAlign(CENTER, CENTER);
    text("Stage " + gameStage + " Completed!", 200, 120);
    
    fill(220); textSize(13); textAlign(CENTER, CENTER);
    text("Great job! Advance to Stage " + (gameStage + 1) + "\nand mix higher tier potions to match the target.", 200, 170);
    
    btnNextStage.draw();
  }
};

function draw() {
  if (scenes[currentScene]) { scenes[currentScene](); }
}

function mouseClicked() {
  if (currentScene === 3) {
    if (showGrimoire) {
      if (btnCloseGrimoire.handleMouseClick()) return;
      if (isDrinkMode && handleTreeClick()) return;
      return;
    }
    if (btnDrink.handleMouseClick()) return;
    if (btn3.handleMouseClick()) return;
    if (btnClear.handleMouseClick()) return;
    handleIngredientClick();
    return;
  }
  
  if (currentScene === 1) btn1.handleMouseClick();
  else if (currentScene === 2) btn2.handleMouseClick();
  else if (currentScene === 4 || currentScene === 5) btnRestart.handleMouseClick();
  else if (currentScene === 6) btnNextStage.handleMouseClick();
}
