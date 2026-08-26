/**
 * Alchemist's Remedy - Complete & Refactored Game Script
 * Engine: Processing.js / HTML5 Canvas
 */

// ==========================================
// 1. GAME STATE & SYSTEM CONSTANTS
// ==========================================
let health = 100;
let maxHealth = 100;
let healthDecayRate = 1.2; // Health lost per second

// Basic RGB Ingredients Inventory
let inventory = {
    red: 3,
    green: 3,
    blue: 3
};

// Cauldron Brew State
let currentBrew = { r: 0, g: 0, b: 0 };
let targetRemedy = { r: 150, g: 60, b: 210 }; // Goal color to cure poison

// Dynamic Color Generator Timer
let lastColorGenTime = 0;
const NORMAL_INTERVAL_MS = 10000;   // 10 seconds
const CRITICAL_INTERVAL_MS = 5000;   // 5 seconds (Health <= 30%)

// Visual Particle Array
let particles = [];

// ==========================================
// 2. ENGINE HOOKS (SETUP & DRAW)
// ==========================================
function setup() {
    createCanvas(800, 600);
    lastColorGenTime = millis();
}

function draw() {
    background(20, 18, 28);
    let now = millis();
    let dt = deltaTime / 1000.0; // Delta time in seconds

    // Mechanics Updates
    updateHealth(dt);
    updateColorGenerator(now);
    updateParticles();

    // Visual Rendering
    drawCauldron();
    drawParticles();
    drawUI(now);
    drawGrimoireHint();
}

// ==========================================
// 3. CORE GAME MECHANICS
// ==========================================

/**
 * Poison decay over time
 */
function updateHealth(dt) {
    if (health > 0) {
        health -= healthDecayRate * dt;
        if (health < 0) health = 0;
    }
}

/**
 * Dynamic Color Generator Logic:
 * Checks every frame whether 10s (normal) or 5s (health <= 30%) has elapsed.
 * Adds +1 to Red, Green, and Blue when the threshold is hit.
 */
function updateColorGenerator(now) {
    // Dynamic interval determination
    let isCritical = (health <= maxHealth * 0.30);
    let targetInterval = isCritical ? CRITICAL_INTERVAL_MS : NORMAL_INTERVAL_MS;

    if (now - lastColorGenTime >= targetInterval) {
        // Increment all 3 basic colors by 1
        inventory.red += 1;
        inventory.green += 1;
        inventory.blue += 1;

        // Reset timer baseline
        lastColorGenTime = now;

        // Visual feedback trigger
        spawnBurstParticles(width / 2, 480, 200, 200, 250);
    }
}

/**
 * Add an ingredient from inventory to the current brew
 */
function addIngredient(type) {
    if (inventory[type] > 0) {
        inventory[type]--;
        if (type === 'red') currentBrew.r = min(currentBrew.r + 40, 255);
        if (type === 'green') currentBrew.g = min(currentBrew.g + 40, 255);
        if (type === 'blue') currentBrew.b = min(currentBrew.b + 40, 255);

        let pColor = type === 'red' ? [230, 50, 50] : type === 'green' ? [50, 230, 50] : [50, 50, 230];
        spawnBurstParticles(400, 330, pColor[0], pColor[1], pColor[2]);
    }
}

/**
 * Drink the potion to test cure quality and restore health
 */
function drinkPotion() {
    if (currentBrew.r === 0 && currentBrew.g === 0 && currentBrew.b === 0) return;

    // Calculate match precision relative to target remedy
    let diffR = abs(currentBrew.r - targetRemedy.r);
    let diffG = abs(currentBrew.g - targetRemedy.g);
    let diffB = abs(currentBrew.b - targetRemedy.b);
    let totalError = diffR + diffG + diffB;

    if (totalError < 80) {
        health = min(maxHealth, health + 45); // Successful remedy
    } else {
        health = min(maxHealth, health + 10); // Partial cure
    }

    // Reset brew
    currentBrew = { r: 0, g: 0, b: 0 };
}

// ==========================================
// 4. VISUALS & PARTICLES
// ==========================================

function spawnBurstParticles(x, y, r, g, b) {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: x,
            y: y,
            vx: random(-2, 2),
            vy: random(-3, -1),
            size: random(4, 10),
            alpha: 255,
            r: r, g: g, b: b
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 4;
        if (p.alpha <= 0) particles.splice(i, 1);
    }
}

function drawParticles() {
    noStroke();
    for (let p of particles) {
        fill(p.r, p.g, p.b, p.alpha);
        ellipse(p.x, p.y, p.size);
    }
}

function drawCauldron() {
    // Cauldron Outer Rim
    fill(40, 40, 50);
    ellipse(400, 350, 220, 180);

    // Liquid Surface (Colored by current brew)
    fill(currentBrew.r, currentBrew.g, currentBrew.b);
    ellipse(400, 330, 180, 100);
}

// ==========================================
// 5. USER INTERFACE & INPUTS
// ==========================================

function drawUI(now) {
    // Health Bar
    fill(50);
    rect(30, 30, 200, 20, 5);
    let healthWidth = map(health, 0, maxHealth, 0, 200);
    
    // Turn bar orange/red when in critical state (<= 30%)
    if (health <= 30) fill(230, 60, 60);
    else fill(60, 200, 100);
    rect(30, 30, healthWidth, 20, 5);

    fill(255);
    textSize(12);
    textAlign(LEFT, CENTER);
    text(`Health: ${floor(health)}%`, 35, 40);

    // Color Generator Progress Timer
    let isCritical = (health <= maxHealth * 0.30);
    let interval = isCritical ? CRITICAL_INTERVAL_MS : NORMAL_INTERVAL_MS;
    let elapsed = now - lastColorGenTime;
    let progress = min(elapsed / interval, 1.0);

    fill(50);
    rect(30, 65, 200, 10, 3);
    fill(100, 180, 255);
    rect(30, 65, progress * 200, 10, 3);
    
    fill(200);
    textSize(11);
    text(`Next Supply: ${isCritical ? '5s (CRITICAL BOOST)' : '10s'}`, 35, 88);

    // Ingredients Controls
    drawButton(30, 500, 70, 35, `Red (${inventory.red})`, color(180, 50, 50));
    drawButton(110, 500, 70, 35, `Green (${inventory.green})`, color(50, 180, 50));
    drawButton(190, 500, 70, 35, `Blue (${inventory.blue})`, color(50, 50, 180));

    // Brew Action Controls
    drawButton(320, 500, 160, 40, "Drink Potion", color(140, 60, 180));
}

function drawButton(x, y, w, h, label, btnColor) {
    fill(btnColor);
    rect(x, y, w, h, 6);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(12);
    text(label, x + w / 2, y + h / 2);
}

function drawGrimoireHint() {
    // Show emergency recipe hints when health is low
    if (health <= 30) {
        fill(255, 200, 100);
        textAlign(RIGHT, TOP);
        textSize(12);
        text("⚠️ CRITICAL HEALTH: Emergency ingredient supply doubled!", width - 30, 30);
        text(`Target Hint: R~${targetRemedy.r}, G~${targetRemedy.g}, B~${targetRemedy.b}`, width - 30, 50);
    }
}

function mousePressed() {
    // Ingredient Buttons
    if (isMouseOver(30, 500, 70, 35)) addIngredient('red');
    if (isMouseOver(110, 500, 70, 35)) addIngredient('green');
    if (isMouseOver(190, 500, 70, 35)) addIngredient('blue');

    // Drink Potion Button
    if (isMouseOver(320, 500, 160, 40)) drinkPotion();
}

function isMouseOver(x, y, w, h) {
    return mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;
}
