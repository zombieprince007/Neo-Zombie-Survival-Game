/* ==========================================================================
   ZOMBIE ARENA  —  UNIFIED PRODUCTION SOURCE  v9
   1. GLOBALS & CONFIG
   2. P5.JS CORE RUNTIME
   3. CLASSES & ENTITIES
   4. CORE GAME MECHANICS
   5. UI & DASHBOARD VISUALS
   6. STATE & SHOP LOGIC
   7. INPUT HANDLING
========================================================================== */

/* ==========================================================================
   1. GLOBALS & CONFIG
========================================================================== */
let player;
let walls   = [];
let particles = [];
let bullets = [];
let survivors = [];
let killer = null;
let objectives = [];
let exitGate = null;
let escapedSurvivors = 0;
let playerRole = "survivor";
let matchPhase = "HUNT";
let matchResult = "";
let selectedRole = "survivor";

let buttons = [];
let keys    = {};

// --- AUDIO ---
let bgMusic; // Run music
let menuMusic;
let shopMusic;
let bgMusicVolume = 0.45;
let sfxVolume     = 0.60;
let menuVolume    = 0.50;
let musicStarted  = false;
let wasBgMusicPlayingBeforeShop = false;
let musicSlider, sfxSlider, menuSlider;
let settingsMusicTab = "ALL";
let settingsMusicScroll = 0;
let settingsMusicSelectedId = "menu";
let settingsPreviewTrackId = null;
const SETTINGS_MUSIC_VISIBLE_ROWS = 3;
let loadingScreens = [];
let loadingTransition = null;
let transitionBuildTarget = null;
let nextLoadingScreenIndex = 0;
const musicLibrary = [
  { id:"menu", title:"HELLZONE", artist:"MAIN MENU THEME", scope:"MENU", file:"HellZone.mp3", sound:null, loading:false },
  { id:"run", title:"FINAL DECISION", artist:"RUN THEME", scope:"RUN", file:"Final_Decision.mp3", sound:null, loading:false },
  { id:"shop", title:"SHOP THEME", artist:"OPERATIVE SHOP", scope:"SHOP", file:"shop.mp3", sound:null, loading:false },
];
const deathTrack = {
  id:"death",
  title:"ANGEL CALL",
  artist:"DEATH SCREEN THEME",
  scope:"DEATH",
  file:"angel_call.mp3",
  sound:null,
  loading:false,
};
const preloadTracks = [...musicLibrary, deathTrack];
const musicTabs = [
  { id:"ALL", label:"ALL TRACKS" },
  { id:"MENU", label:"MENU" },
  { id:"RUN",  label:"RUN" },
  { id:"SHOP", label:"SHOP" },
];

// --- KEY REBINDING ---
let rebindingKey = null;
let keyBindings  = { moveUp:87, moveDown:83, moveLeft:65, moveRight:68, dash:32, ability:69, pause:80 };

function keyCodeToName(c) {
  const m = {32:"SPACE",13:"ENTER",8:"BKSP",16:"SHIFT",17:"CTRL",18:"ALT",37:"←",38:"↑",39:"→",40:"↓",9:"TAB"};
  if (m[c]) return m[c];
  if (c >= 65 && c <= 90) return String.fromCharCode(c);
  if (c >= 48 && c <= 57) return String.fromCharCode(c);
  return "KEY" + c;
}

function playUIClick() {
  let osc = new p5.Oscillator('square');
  osc.freq(950); osc.amp(menuVolume * 0.15); osc.start();
  osc.amp(0, 0.04); setTimeout(() => osc.stop(), 40);
}

// --- GAME STATE ---
let gameState  = "MENU";
let paused     = false;
let cameraShake = 0;
let screenShakeEnabled = true;
let lastDamageTime = -999999;
let gameOverState  = false;
const SURVIVOR_NAMES = ["SPECTRE", "NYX//RUNNER", "GHOST//MODE", "SABLEUNIT"];
const SURVIVOR_COLORS = [
  [0,255,255],
  [110,220,255],
  [190,100,255],
  [255,110,190],
];

// --- RUN VARIABLES ---
let crystalis      = 1500;
let wave           = 1;
let score          = 0;
let showWaveComplete = false;

// --- COOLDOWNS ---
let lastShot = 0, lastMelee = 0, lastPulse = 0, dashCooldownEnd = 0;

// --- UPGRADES ---
let upgradeLevels = { speed: 0, health: 0, damage: 0, fireRate: 0 };
let upgrades      = { speed: 1.0, damage: 1.0, fireRate: 1.0, maxHealth: 100 };

function recomputeUpgrades() {
  upgrades.speed     = 1.0 + upgradeLevels.speed    * 0.06;
  upgrades.damage    = 1.0 + upgradeLevels.damage   * 0.10;
  upgrades.fireRate  = 1.0 + upgradeLevels.fireRate  * 0.08;
  upgrades.maxHealth = 100  + upgradeLevels.health   * 20;
  computeActiveSynergyProfiles();
  if (player) player.maxHealth = upgrades.maxHealth;
}

// --- MAP ---
const MAP_W = 3200, MAP_H = 3200;
const baseSpeed       = 5.0;
const COOLDOWN_FANGS  = 130;
const COOLDOWN_BLADE  = 680;
const COOLDOWN_PULSE  = 8500;
const COOLDOWN_DASH   = 1200;
const ENEMY_CONTACT_COOLDOWN_MS = 330;
const ENEMY_WAVE_DAMAGE_SCALE = 0.12;
let mapTime = 0;
let hiddenZones = [];
let dynamicBarriers = [];
let mapBeacons = [];

// --- LOADOUT ---
let previewRotation  = 0;
let hoveredItemStats = null;
let activeSynergyText = "NONE ACTIVE";
let currentSkinId    = "skin_default";
let currentSkinColor = [0, 255, 255];
let currentWeaponId  = "weap_fangs";
let currentAbilityId = "abil_pulse";
let shopScrollY      = 0;

// --- HERO SELECTION ---
let selectedHeroId = "spectre";
const heroSlots = [
  { id:"spectre", name:"SPECTRE",  sub:"PHANTOM OPERATIVE", locked:false, col:[0,255,255]  },
  { id:"wraith",  name:"WRAITH",   sub:"PHASE ASSASSIN",    locked:true,  col:[180,80,255] },
  { id:"phantom", name:"PHANTOM",  sub:"VOID STALKER",      locked:true,  col:[255,80,80]  },
  { id:"titan",   name:"TITAN",    sub:"HEAVY VANGUARD",    locked:true,  col:[255,180,0]  },
];

// --- SHOP ITEMS ---
let shopItems = [
  // CHASSIS
  { id:"skin_default", name:"DEFAULT FRAME",  desc:"Standard cyan cybernetic plating. Optimized composite hull.",             type:"CHASSIS",  cost:0,    bought:true,  color:[0,255,255]  },
  { id:"skin_crimson", name:"CRIMSON FRAME",  desc:"Heavy blood-red reinforced plate. Unlocks rapid-fire synergy.",           type:"CHASSIS",  cost:400,  bought:false, color:[255,50,50]  },
  { id:"skin_gold",    name:"AURELIAN COAT",  desc:"Mirror-polished gold plating. Boosts tactical force multipliers.",        type:"CHASSIS",  cost:600,  bought:false, color:[255,215,0]  },
  { id:"skin_void",    name:"VOID SHROUD",    desc:"Pitch-black stealth composite. Reduces enemy targeting radius.",          type:"CHASSIS",  cost:900,  bought:false, color:[80,0,200]   },
  { id:"skin_plasma",  name:"PLASMA WEAVE",   desc:"Living plasma armor that reacts violently to incoming damage.",           type:"CHASSIS",  cost:1100, bought:false, color:[0,255,180]  },

  // WEAPON
  { id:"weap_fangs",  name:"GHOST FANGS",  desc:"Standard dual-barrel energy blaster. Fast, low-yield kinetic bolts.",       type:"WEAPON", cost:0,    bought:true,  dmg:4,  rof:5 },
  { id:"weap_burst",  name:"PLASMA CORE",  desc:"Supercharged plasma burst rings. Devastating at close range.",              type:"WEAPON", cost:1200, bought:false, dmg:8,  rof:8 },
  { id:"weap_lance",  name:"VOID LANCE",   desc:"Long-range precision energy beam. Punches through multiple targets.",       type:"WEAPON", cost:1800, bought:false, dmg:18, rof:2 },
  { id:"weap_chain",  name:"ARC CHAIN",    desc:"Chains arcing lightning between nearby enemies on every hit.",              type:"WEAPON", cost:2200, bought:false, dmg:6,  rof:7 },

  // ABILITY
  { id:"abil_pulse",     name:"STATIC PULSE",      desc:"High-voltage blast paralyzes all nearby hostiles for 2 seconds.",     type:"ABILITY", cost:0,    bought:true,  ctl:4 },
  { id:"abil_nova",      name:"VOID SINGULARITY",   desc:"Gravitational anomaly tears down heavy targets in a wide radius.",    type:"ABILITY", cost:2000, bought:false, ctl:9 },
  { id:"abil_nano",      name:"NANO REGEN",         desc:"Instantly routes backup power to repair 40% of shield integrity.",    type:"ABILITY", cost:800,  bought:false, ctl:5 },
  { id:"abil_overdrive", name:"OVERDRIVE",          desc:"Spikes system output: +50% damage and fire rate for 4 seconds.",      type:"ABILITY", cost:1500, bought:false, ctl:8 },
  { id:"abil_blink",     name:"PHASE BLINK",        desc:"Teleports 260 units in the aimed direction, ignoring collisions.",    type:"ABILITY", cost:2500, bought:false, ctl:7 },

  // UPGRADES (stackable, auto-apply on buy)
  { id:"upg_speed",   name:"SPEED CORE",    desc:"Enhances thruster output by +6% per tier. Stackable up to 5 times.",    type:"UPGRADE", cost:300,  bought:false, upgradeKey:"speed",    upgradeVal:1 },
  { id:"upg_health",  name:"ARMOR MATRIX",  desc:"Reinforces hull integrity by +20 shield per tier. Stackable to 5.",     type:"UPGRADE", cost:350,  bought:false, upgradeKey:"health",   upgradeVal:1 },
  { id:"upg_damage",  name:"DAMAGE AMP",    desc:"Amplifies all weapon damage by +10% per tier. Stackable to 5.",        type:"UPGRADE", cost:400,  bought:false, upgradeKey:"damage",   upgradeVal:1 },
  { id:"upg_rof",     name:"RATE BOOSTER",  desc:"Increases fire rate by +8% per tier. Stackable to 5.",                 type:"UPGRADE", cost:350,  bought:false, upgradeKey:"fireRate", upgradeVal:1 },
];

// Sandbox
let trainingDummy;
let sandboxBackup = {};

/* ==========================================================================
   2. P5.JS CORE RUNTIME
========================================================================== */
function preload() {
  // Audio is loaded after setup so a slow or browser-blocked audio decode
  // can never hold the game on a blank loading frame.
  loadingScreens = [
    loadImage("loading-rooftop.png"),
    loadImage("loading-zone.png"),
    loadImage("loading-horde.png"),
    loadImage("loading-overlook.png"),
  ];
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  generateWalls();
  createMainMenu();
  for (const track of preloadTracks) {
    loadMusicTrack(track, () => {
      if (track.id === "menu") menuMusic = track.sound;
      if (track.id === "run") bgMusic = track.sound;
    });
  }
  document.documentElement.classList.add("neo-game-ready");
}

function generateWalls() {
  // The Null Zone is a readable district map: four perimeter sectors, a
  // central transit spine, and deliberate loops around every generator.
  walls = [
    { x: 280,  y: 300,  w: 560, h: 92,  name: "NORTH ARCADE" },
    { x: 1160, y: 260,  w: 380, h: 120, name: "NORTH ARCADE" },
    { x: 1980, y: 300,  w: 640, h: 92,  name: "NORTH ARCADE" },
    { x: 300,  y: 840,  w: 120, h: 500, name: "WEST TOWER" },
    { x: 760,  y: 960,  w: 410, h: 110, name: "WEST TOWER" },
    { x: 2020, y: 910,  w: 410, h: 110, name: "EAST TOWER" },
    { x: 2780, y: 820,  w: 120, h: 540, name: "EAST TOWER" },
    { x: 320,  y: 1840, w: 470, h: 110, name: "SOUTH RAIL" },
    { x: 980,  y: 2060, w: 120, h: 430, name: "SOUTH RAIL" },
    { x: 2100, y: 2040, w: 120, h: 440, name: "SOUTH RAIL" },
    { x: 2410, y: 1840, w: 470, h: 110, name: "SOUTH RAIL" },
    { x: 1220, y: 700,  w: 150, h: 240, name: "TRANSIT SPINE" },
    { x: 1830, y: 700,  w: 150, h: 240, name: "TRANSIT SPINE" },
    { x: 1220, y: 2240, w: 150, h: 240, name: "TRANSIT SPINE" },
    { x: 1830, y: 2240, w: 150, h: 240, name: "TRANSIT SPINE" },
  ];
  hiddenZones = [
    { x: 120, y: 1140, w: 430, h: 430, label: "UNDERCITY" },
    { x: 2640, y: 1180, w: 430, h: 430, label: "RAIN MARKET" },
    { x: 1280, y: 1160, w: 640, h: 390, label: "BLACKOUT CORE" },
  ];
  dynamicBarriers = [
    { x: 1450, y: 560, w: 300, h: 22, axis: "x", range: 160, phase: 0.2, label: "NORTH SHUTTER" },
    { x: 1450, y: 2590, w: 300, h: 22, axis: "x", range: 160, phase: 2.4, label: "SOUTH SHUTTER" },
    { x: 540, y: 1450, w: 22, h: 300, axis: "y", range: 160, phase: 1.2, label: "WEST SHUTTER" },
    { x: 2638, y: 1450, w: 22, h: 300, axis: "y", range: 160, phase: 3.1, label: "EAST SHUTTER" },
  ];
  mapBeacons = [
    { x: 480, y: 470, color: [0, 235, 255], label: "NORTH GATE" },
    { x: 2680, y: 520, color: [255, 50, 180], label: "SKYBRIDGE" },
    { x: 480, y: 2680, color: [255, 185, 0], label: "LOWER YARD" },
    { x: 2660, y: 2680, color: [0, 255, 180], label: "EXIT RELAY" },
  ];
}

function getDynamicBarrierRect(barrier) {
  const offset = sin(mapTime * 0.0014 + barrier.phase) * barrier.range;
  return barrier.axis === "x"
    ? { x: barrier.x + offset, y: barrier.y, w: barrier.w, h: barrier.h }
    : { x: barrier.x, y: barrier.y + offset, w: barrier.w, h: barrier.h };
}

function isMapBlocked(x, y, radius = 18) {
  if (x - radius < 60 || x + radius > MAP_W - 60 || y - radius < 60 || y + radius > MAP_H - 60) return true;
  const solids = [...walls, ...dynamicBarriers.map(getDynamicBarrierRect)];
  return solids.some((wall) =>
    x + radius > wall.x &&
    x - radius < wall.x + wall.w &&
    y + radius > wall.y &&
    y - radius < wall.y + wall.h
  );
}

function moveActorWithCollision(actor, delta) {
  const nextX = actor.pos.x + delta.x;
  const nextY = actor.pos.y + delta.y;
  if (!isMapBlocked(nextX, actor.pos.y, actor.radius)) actor.pos.x = nextX;
  if (!isMapBlocked(actor.pos.x, nextY, actor.radius)) actor.pos.y = nextY;
}

function getHiddenZoneAt(x, y) {
  return hiddenZones.find((zone) =>
    x > zone.x && x < zone.x + zone.w &&
    y > zone.y && y < zone.y + zone.h
  );
}

function draw() {
  if (gameState === "LOADING") {
    drawLoadingScreen();
    return;
  }

  if (gameState === "PLAYING" || gameState === "TEST_RANGE") {
    drawPlayingEnvironment();
  } else if (gameState === "MENU" || gameState === "SETTINGS") {
    drawMenuBackdrop();
  } else if (gameState === "DEATH") {
    drawDeathBackdrop();
  } else {
    // SHOP, INVENTORY, HERO_SELECT — solid dark background
    background(5, 4, 15);
  }

  if      (gameState === "MENU")        drawMainMenu();
  else if (gameState === "PLAYING") {
    if (!paused) updateGame();
    drawWorld();
    drawPlayingUI();
    drawAbilityUI();
  }
  else if (gameState === "SETTINGS")    drawSettingsScreen();
  else if (gameState === "SHOP")        drawShopScreen();
  else if (gameState === "INVENTORY")   drawInventoryScreen();
  else if (gameState === "HERO_SELECT") drawHeroSelectScreen();
  else if (gameState === "TEST_RANGE")  { updateTestRange(); drawTestRange(); }
  else if (gameState === "DEATH")       drawDeathScreen();

  for (let btn of buttons) { btn.update(); btn.draw(); }

  if (paused) {
    fill(0, 0, 0, 220); noStroke(); rect(0, 0, width, height);
    for (let btn of buttons) { btn.update(); btn.draw(); }
  }

}

function drawMenuBackdrop() {
  background(4, 2, 17);
  noStroke();
  for (let y = 0; y < height; y += 6) {
    const ratio = y / max(height, 1);
    fill(5 + floor(ratio * 6), 2, 20 + floor(ratio * 15));
    rect(0, y, width, 6);
  }

  // Static neon geometry replaces the old menu video and stays crisp in the
  // preview, on mobile, and when browser autoplay is unavailable.
  fill(0, 215, 255, 22);
  ellipse(width * 0.82, height * 0.18, min(width, height) * 0.74);
  fill(255, 35, 170, 18);
  ellipse(width * 0.12, height * 0.88, min(width, height) * 0.62);

  stroke(0, 190, 220, 26);
  strokeWeight(1);
  const gridSize = max(46, min(86, width * 0.06));
  for (let x = -height; x < width + height; x += gridSize) {
    line(x, height, x + height, 0);
  }
  for (let y = height; y > 0; y -= gridSize * 0.78) {
    line(0, y, width, y);
  }
  stroke(255, 55, 180, 42);
  line(width * 0.56, 0, width * 0.56, height);
  line(0, height * 0.78, width, height * 0.78);
  noStroke();
}

function beginAreaTransition(target, onComplete, showSpawnPrompt = false) {
  if (loadingTransition) return;
  const screenCount = Math.max(loadingScreens.length, 1);
  const imageIndex = nextLoadingScreenIndex % screenCount;
  nextLoadingScreenIndex = (nextLoadingScreenIndex + 1) % screenCount;
  stopMenuMusic();
  stopRunMusic();
  stopShopMusic();
  stopDeathMusic();
  stopSettingsPreview();
  buttons = [];
  gameState = "LOADING";
  loadingTransition = {
    target,
    imageIndex: imageIndex % loadingScreens.length,
    onComplete,
    showSpawnPrompt,
    startedAt: millis(),
    duration: showSpawnPrompt ? Infinity : 1550,
  };
}

function finishAreaTransition() {
  if (!loadingTransition) return;
  const transition = loadingTransition;
  loadingTransition = null;
  transitionBuildTarget = transition.target;
  transition.onComplete();
}

function drawLoadingScreen() {
  const transition = loadingTransition;
  if (!transition) {
    background(3, 1, 14);
    return;
  }

  const elapsed = millis() - transition.startedAt;
  const loadingImage = loadingScreens[transition.imageIndex];
  background(3, 1, 14);

  if (loadingImage && loadingImage.width > 0 && loadingImage.height > 0) {
    const scale = max(width / loadingImage.width, height / loadingImage.height);
    const imageWidth = loadingImage.width * scale;
    const imageHeight = loadingImage.height * scale;
    const imageX = (width - imageWidth) / 2;
    const imageY = (height - imageHeight) / 2;
    const fadeIn = constrain(elapsed / 620, 0, 1);
    const fadeOut = transition.showSpawnPrompt
      ? 1
      : elapsed > 900 ? constrain(1 - (elapsed - 900) / 650, 0, 1) : 1;
    tint(255, 255 * min(fadeIn, fadeOut));
    imageMode(CORNER);
    image(loadingImage, imageX, imageY, imageWidth, imageHeight);
    noTint();
  }

  noStroke();
  fill(0, 0, 10, transition.showSpawnPrompt ? 125 : 95);
  rect(0, 0, width, height);
  fill(0, 0, 0, 90);
  rect(0, height - 116, width, 116);
  stroke(0, 255, 220, 65);
  strokeWeight(1);
  line(32, height - 116, width - 32, height - 116);
  noStroke();

  textAlign(LEFT, TOP);
  fill(150, 210, 225);
  textSize(10);
  text("NEO ZOMBIE PROTOCOL  //  TRANSIT CHANNEL", 32, height - 92);
  fill(0, 255, 180);
  textSize(11);
  text(
    transition.showSpawnPrompt ? "DROP ZONE READY" : "LOADING DESTINATION",
    32,
    height - 68,
  );

  if (transition.showSpawnPrompt) {
    const pulse = 175 + 80 * sin(frameCount * 0.08);
    fill(255, 70, 210, pulse);
    textAlign(CENTER, CENTER);
    textSize(min(20, max(13, width * 0.018)));
    text("CLICK ON SCREEN TO SPAWN", width / 2, height - 54);
    fill(175, 205, 220);
    textSize(10);
    text("ALL SYSTEMS CHECKED  //  AWAITING OPERATIVE INPUT", width / 2, height - 28);
  } else if (elapsed >= transition.duration) {
    finishAreaTransition();
  }
}

function drawDeathBackdrop() {
  background(5, 0, 12);
  const deathImage = loadingScreens[2];
  if (deathImage && deathImage.width > 0 && deathImage.height > 0) {
    const scale = max(width / deathImage.width, height / deathImage.height);
    const imageWidth = deathImage.width * scale;
    const imageHeight = deathImage.height * scale;
    tint(255, 125);
    imageMode(CORNER);
    image(deathImage, (width - imageWidth) / 2, (height - imageHeight) / 2, imageWidth, imageHeight);
    noTint();
  }
  noStroke();
  fill(18, 0, 12, 190);
  rect(0, 0, width, height);
  fill(120, 0, 28, 32);
  for (let y = 0; y < height; y += 6) rect(0, y, width, 2);
}

function drawDeathScreen() {
  const panelWidth = min(640, width - 40);
  const panelHeight = min(390, height - 40);
  const panelX = (width - panelWidth) / 2;
  const panelY = (height - panelHeight) / 2;

  fill(8, 3, 20, 235);
  stroke(255, 45, 100, 150);
  strokeWeight(2);
  rect(panelX, panelY, panelWidth, panelHeight, 10);
  noStroke();

  textAlign(CENTER, CENTER);
  fill(255, 50, 105);
  textSize(min(42, max(26, width * 0.045)));
  text("OPERATIVE DOWN", width / 2, panelY + 74);
  fill(255, 160, 190);
  textSize(12);
  text("SIGNAL LOST  //  RUN TERMINATED", width / 2, panelY + 116);

  stroke(255, 45, 100, 80);
  strokeWeight(1);
  line(panelX + 42, panelY + 145, panelX + panelWidth - 42, panelY + 145);
  noStroke();
  fill(170, 185, 210);
  textSize(11);
  text("THE NEON DEAD HAVE CLAIMED THIS SECTOR.", width / 2, panelY + 179);
  text("RECALIBRATE AND DEPLOY AGAIN.", width / 2, panelY + 199);
  fill(255, 80, 145);
  textSize(10);
  text(`WAVE ${wave}  //  SCORE ${score}`, width / 2, panelY + 232);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if      (gameState === "MENU")        createMainMenu();
  else if (gameState === "SETTINGS")    showSettings();
  else if (gameState === "SHOP")        showShop();
  else if (gameState === "INVENTORY")   showInventory();
  else if (gameState === "HERO_SELECT") showHeroSelect();
  else if (gameState === "TEST_RANGE")  setupSandboxEnvironment();
}

/* ==========================================================================
   3. CLASSES & ENTITIES
========================================================================== */
class Button {
  constructor(x, y, w, h, text, action, colorMain = color(0, 255, 180)) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.text = text; this.action = action; this.colorMain = colorMain;
    this.hovered = false;
    this.isAbilityNode = false; this.baseX = x;
    this.clipX = null; this.clipW = null;
  }
  update() {
    let inClip = true;
    if (this.clipX !== null) inClip = (mouseX >= this.clipX && mouseX <= this.clipX + this.clipW);
    this.hovered = inClip && mouseX >= this.x && mouseX <= this.x + this.w && mouseY >= this.y && mouseY <= this.y + this.h;
  }
  draw() {
    push();
    if (this.clipX !== null) { rect(this.clipX, this.y-10, this.clipW, this.h+20); drawingContext.clip(); }

    if (this.rebindAction && this.rebindAction === rebindingKey) {
      let pulse = 128 + 127 * sin(frameCount * 0.18);
      stroke(0,255,255); strokeWeight(2);
      fill(0, 60, 70, pulse * 0.6); rect(this.x, this.y, this.w, this.h, 4);
      fill(0,255,255); noStroke(); textAlign(CENTER,CENTER); textSize(10);
      text("PRESS KEY", this.x + this.w/2, this.y + this.h/2 + 1);
    } else {
      stroke(this.hovered ? 255 : this.colorMain);
      strokeWeight(this.hovered ? 6 : 3);
      fill(8, 8, 24, 245); rect(this.x, this.y, this.w, this.h, 6);
      fill(this.hovered && this.action ? 255 : this.colorMain);
      noStroke(); textAlign(CENTER,CENTER);
      textSize(this.hovered && this.action ? 17 : 15);
      text(this.text, this.x + this.w/2, this.y + this.h/2 + 2);
    }
    pop();
  }
  clicked() { if (this.hovered && this.action) { playUIClick(); this.action(); } }
}

class Slider {
  constructor(x, y, w, minVal, maxVal, currentVal, label, channel) {
    this.x = x; this.y = y; this.w = w; this.h = 12;
    this.min = minVal; this.max = maxVal; this.val = currentVal;
    this.label = label; this.channel = channel;
    this.dragging = false; this.hovered = false;
  }
  update() {
    this.hovered = mouseX >= this.x && mouseX <= this.x + this.w && mouseY >= this.y-10 && mouseY <= this.y + this.h + 10;
    if (this.dragging) {
      this.val = constrain(map(mouseX, this.x, this.x + this.w, this.min, this.max), this.min, this.max);
      if (this.channel === "MUSIC") {
        bgMusicVolume = this.val;
        for (let track of musicLibrary) {
          if (track.sound && track.sound.isPlaying()) track.sound.setVolume(this.val, 0.05);
        }
      }
      else if (this.channel === "SFX")  sfxVolume  = this.val;
      else if (this.channel === "MENU") menuVolume = this.val;
    }
  }
  draw() {
    push(); textAlign(LEFT,BOTTOM); fill(0,255,220); textSize(12);
    text(`${this.label} [${floor(this.val*100)}%]`, this.x, this.y-6);
    stroke(0,255,255,30); strokeWeight(3); line(this.x, this.y, this.x+this.w, this.y);
    let fw = map(this.val, this.min, this.max, 0, this.w);
    let nc = this.channel==="MUSIC" ? color(255,80,255) : (this.channel==="SFX" ? color(0,255,150) : color(0,200,255));
    stroke(nc); strokeWeight(5);
    if (this.dragging || this.hovered) { drawingContext.shadowBlur=10; drawingContext.shadowColor=nc; }
    line(this.x, this.y, this.x+fw, this.y); drawingContext.shadowBlur=0;
    fill(this.dragging?255:200); noStroke(); rectMode(CENTER); rect(this.x+fw, this.y, 6, 14, 1);
    pop();
  }
}

class Spectre {
  constructor(x, y) {
    this.pos = createVector(x, y); this.vel = createVector(0,0);
    this.angle = 0; this.radius = 19;
    this.maxHealth = upgrades.maxHealth;
    this.health    = this.maxHealth;
    this.role = playerRole;
    this.downed = false;
    this.isDashing = false; this.dashTime = 0;
    this.invincibleUntil = 0;
  }
  takeDamage(amount) {
    if (gameState !== "PLAYING") return;
    this.health -= amount;
    lastDamageTime = millis();
    this.invincibleUntil = millis() + 140;
    if (screenShakeEnabled) cameraShake = max(cameraShake, 9);
    createImpactParticles(this.pos.x, this.pos.y, color(255,60,60), 14);
    if (this.health <= 0) {
      this.health = 0;
      this.downed = true;
      if (playerRole === "survivor") {
        matchResult = "KILLER DOWNED YOU";
        gameOver();
      } else {
        matchResult = "THE SURVIVORS ESCAPED";
        gameOver();
      }
    }
  }
  update() {
    if (paused) return;
    let input = createVector(0,0);
    if (keyIsDown(keyBindings.moveLeft)  || keyIsDown(LEFT_ARROW))  input.x -= 1;
    if (keyIsDown(keyBindings.moveRight) || keyIsDown(RIGHT_ARROW)) input.x += 1;
    if (keyIsDown(keyBindings.moveUp)    || keyIsDown(UP_ARROW))    input.y -= 1;
    if (keyIsDown(keyBindings.moveDown)  || keyIsDown(DOWN_ARROW))  input.y += 1;

    let spd = baseSpeed * upgrades.speed * (this.isDashing ? 3.6 : 1);
    if (input.mag() > 0) {
      input.normalize();
      this.vel = p5.Vector.lerp(this.vel, input.mult(spd), 0.24);
    } else {
      this.vel = p5.Vector.lerp(this.vel, createVector(0,0), 0.20);
    }

    moveActorWithCollision(this, this.vel);
    let limW = (gameState==="TEST_RANGE") ? width  : MAP_W;
    let limH = (gameState==="TEST_RANGE") ? height : MAP_H;
    this.pos.x = constrain(this.pos.x, 50, limW-50);
    this.pos.y = constrain(this.pos.y, 50, limH-50);
    this.angle = atan2(mouseY - (gameState==="TEST_RANGE" ? this.pos.y : height/2),
                       mouseX - (gameState==="TEST_RANGE" ? this.pos.x : width/2));

    if (this.isDashing && millis() - this.dashTime > 220) this.isDashing = false;

    if (mouseIsPressed && mouseButton === LEFT && millis()-lastShot > COOLDOWN_FANGS/upgrades.fireRate) {
      this.shootGhostFangs(); lastShot = millis();
    }

    // Passive regen after 5 seconds without damage
    if (gameState==="PLAYING" && millis()-lastDamageTime > 5000 && this.health < this.maxHealth) {
      this.health = min(this.maxHealth, this.health + this.maxHealth * 0.0018);
    }
  }
  shootGhostFangs() {
    let weapItem = shopItems.find(i => i.id === currentWeaponId) || {dmg:4};
    bullets.push(new GhostFang(
      this.pos.x,
      this.pos.y,
      p5.Vector.fromAngle(this.angle),
      weapItem.dmg,
      playerRole,
    ));
    if (screenShakeEnabled) cameraShake = 3;
  }
  spectreBlade() {
    if (millis()-lastMelee < COOLDOWN_BLADE) return;
    lastMelee = millis();
    if (screenShakeEnabled) cameraShake = 12;
    let dmg = 58 * upgrades.damage;
    if (gameState==="TEST_RANGE") {
      if (dist(this.pos.x,this.pos.y,trainingDummy.pos.x,trainingDummy.pos.y) < 85) trainingDummy.registerHit(dmg);
    } else if (playerRole === "survivor") {
      if (killer && dist(this.pos.x,this.pos.y,killer.pos.x,killer.pos.y) < 95) {
        killer.takeDamage(dmg);
      }
    } else {
      for (let ally of survivors) {
        if (dist(this.pos.x,this.pos.y,ally.pos.x,ally.pos.y) < 95) {
          ally.takeDamage(dmg, "killer");
        }
      }
    }
    createImpactParticles(this.pos.x, this.pos.y, color(255,100,255), 40);
  }
  useEquippedAbility() {
    if (millis()-lastPulse < COOLDOWN_PULSE) return;
    if (currentAbilityId==="abil_pulse") {
      lastPulse=millis(); if (screenShakeEnabled) cameraShake=10;
      for (let i=0;i<60;i++) { let p=new Particle(this.pos.x,this.pos.y,random(5,11)); p.color=color(100,220,255); particles.push(p); }
      if (gameState==="TEST_RANGE") { if (dist(this.pos.x,this.pos.y,trainingDummy.pos.x,trainingDummy.pos.y)<250) trainingDummy.registerHit(30); }
      else if (playerRole === "survivor") {
        if (killer && dist(this.pos.x,this.pos.y,killer.pos.x,killer.pos.y)<235) killer.stunnedUntil=millis()+1900;
      } else {
        for (let ally of survivors) if (dist(this.pos.x,this.pos.y,ally.pos.x,ally.pos.y)<235) ally.stunnedUntil=millis()+1900;
      }
    }
    else if (currentAbilityId==="abil_nova") {
      lastPulse=millis(); if (screenShakeEnabled) cameraShake=18;
      createImpactParticles(this.pos.x,this.pos.y,color(150,0,255),80);
      if (gameState==="TEST_RANGE") { if (dist(this.pos.x,this.pos.y,trainingDummy.pos.x,trainingDummy.pos.y)<300) trainingDummy.registerHit(120*upgrades.damage); }
      else if (playerRole === "survivor") {
        if (killer && dist(this.pos.x,this.pos.y,killer.pos.x,killer.pos.y)<280) {
          killer.takeDamage(120*upgrades.damage);
          killer.vel.mult(0.1);
        }
      } else {
        for (let ally of survivors) if (dist(this.pos.x,this.pos.y,ally.pos.x,ally.pos.y)<280) {
          ally.takeDamage(120*upgrades.damage, "killer");
          ally.vel.mult(0.1);
        }
      }
    }
    else if (currentAbilityId==="abil_nano") {
      if (this.health>=this.maxHealth) return;
      lastPulse=millis(); this.health=min(this.maxHealth,this.health+this.maxHealth*0.40);
      createImpactParticles(this.pos.x,this.pos.y,color(100,255,100),30);
    }
    else if (currentAbilityId==="abil_overdrive") {
      lastPulse=millis(); createImpactParticles(this.pos.x,this.pos.y,color(255,50,50),45);
      let od=upgrades.damage, or_=upgrades.fireRate;
      upgrades.damage*=1.5; upgrades.fireRate*=1.5;
      setTimeout(()=>{ upgrades.damage=od; upgrades.fireRate=or_; },4000);
    }
    else if (currentAbilityId==="abil_blink") {
      lastPulse=millis();
      let bdir = p5.Vector.fromAngle(this.angle).mult(260);
      this.pos.add(bdir);
      this.pos.x=constrain(this.pos.x,50,MAP_W-50); this.pos.y=constrain(this.pos.y,50,MAP_H-50);
      createImpactParticles(this.pos.x,this.pos.y,color(180,100,255),35);
      if (screenShakeEnabled) cameraShake=7;
    }
  }
  dash() {
    if (millis()-dashCooldownEnd < COOLDOWN_DASH) return;
    this.isDashing=true; this.dashTime=millis(); dashCooldownEnd=millis();
  }
  draw() {
    push(); translate(this.pos.x, this.pos.y); rotate(this.angle);
    let alpha = this.isDashing ? 120 : 255;
    let flashRed = (millis() < this.invincibleUntil && floor(millis()/80)%2===0);
    let sc = flashRed ? [255,60,60] : (this.role === "killer" ? [255,55,105] : currentSkinColor);
    fill(sc[0],sc[1],sc[2],alpha);
    stroke(sc[0],sc[1],sc[2],alpha); strokeWeight(4); circle(0,0,this.radius*2);
    stroke(255); line(10,-10,24,0); line(10,10,24,0);
    stroke(255,50,255); strokeWeight(5); line(-14,-15,-30,-24); line(-14,15,-30,24);
    pop();
  }
}

class SurvivorBot {
  constructor(index, x, y) {
    this.index = index;
    this.name = SURVIVOR_NAMES[index + 1] || `SURVIVOR-${index + 1}`;
    this.color = SURVIVOR_COLORS[index + 1] || [120, 220, 255];
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.radius = 17;
    this.health = 100;
    this.status = "healthy";
    this.objectiveIndex = index % 5;
    this.stunnedUntil = 0;
    this.nextRepairAt = 0;
    this.nextEscapeAt = 0;
    this.downedAt = 0;
  }
  takeDamage(amount) {
    if (this.status === "dead" || this.status === "hooked") return;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.status = "hooked";
      this.downedAt = millis();
      createImpactParticles(this.pos.x, this.pos.y, color(255, 55, 110), 22);
      score += 250;
      return;
    }
    this.status = this.health < 45 ? "critical" : "injured";
  }
  update() {
    if (this.status === "hooked") {
      if (millis() - this.downedAt > 12000) this.status = "dead";
      return;
    }
    if (millis() < this.stunnedUntil) return;

    const threat = playerRole === "killer" ? player : killer;
    const threatDistance = threat ? dist(this.pos.x, this.pos.y, threat.pos.x, threat.pos.y) : 9999;
    let target = null;
    if (matchPhase === "ESCAPE" && exitGate) {
      target = exitGate.pos;
    } else if (threatDistance < 360) {
      target = createVector(this.pos.x - (threat.pos.x - this.pos.x), this.pos.y - (threat.pos.y - this.pos.y));
    } else {
      const objective = objectives[this.objectiveIndex];
      target = objective?.pos || createVector(MAP_W / 2, MAP_H / 2);
    }

    const direction = p5.Vector.sub(target, this.pos);
    if (direction.mag() > 55) {
      direction.setMag(threatDistance < 360 ? 2.7 : 1.5);
      this.vel = p5.Vector.lerp(this.vel, direction, 0.16);
      moveActorWithCollision(this, this.vel);
    } else {
      this.vel.mult(0.8);
    }
    this.pos.x = constrain(this.pos.x, 50, MAP_W - 50);
    this.pos.y = constrain(this.pos.y, 50, MAP_H - 50);

    const objective = objectives[this.objectiveIndex];
    if (matchPhase === "HUNT" && objective && !objective.completed && dist(this.pos.x, this.pos.y, objective.pos.x, objective.pos.y) < 72) {
      if (millis() >= this.nextRepairAt) {
        objective.progress = min(100, objective.progress + 0.09);
        this.nextRepairAt = millis() + 120;
      }
    }
    if (matchPhase === "ESCAPE" && exitGate && dist(this.pos.x, this.pos.y, exitGate.pos.x, exitGate.pos.y) < 88) {
      if (millis() >= this.nextEscapeAt) {
        this.status = "escaped";
        escapedSurvivors++;
        this.nextEscapeAt = millis() + 500;
      }
    }
  }
  draw() {
    if (this.status === "dead" || this.status === "escaped") return;
    push();
    translate(this.pos.x, this.pos.y);
    const alpha = this.status === "hooked" ? 120 : 255;
    fill(this.color[0], this.color[1], this.color[2], alpha);
    stroke(255, alpha);
    strokeWeight(3);
    circle(0, 0, this.radius * 2);
    stroke(255, 70, 190, alpha);
    strokeWeight(4);
    line(-10, -12, -20, -20);
    line(10, -12, 20, -20);
    fill(220, 240, 250, alpha);
    noStroke();
    textAlign(CENTER, BOTTOM);
    textSize(9);
    text(this.name, 0, -24);
    if (this.status === "hooked") {
      fill(255, 55, 110, 180);
      text("DOWN", 0, 35);
    }
    pop();
  }
}

class KillerHunter {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.radius = 29;
    this.health = 360;
    this.maxHealth = 360;
    this.stunnedUntil = 0;
    this.nextAttackAt = 0;
    this.angle = 0;
  }
  takeDamage(amount) {
    this.health = max(0, this.health - amount);
    this.stunnedUntil = millis() + 1400;
    createImpactParticles(this.pos.x, this.pos.y, color(0, 240, 255), 26);
    if (this.health <= 0) {
      this.health = this.maxHealth;
      this.stunnedUntil = millis() + 4200;
      matchPhase = "ESCAPE";
      matchResult = "KILLER STUNNED — COMPLETE THE OBJECTIVES";
    }
  }
  update() {
    if (millis() < this.stunnedUntil) return;
    const targets = [player, ...survivors].filter((target) => target && !target.downed && target.status !== "hooked" && target.status !== "escaped");
    if (!targets.length) return;
    let target = targets[0];
    let nearest = dist(this.pos.x, this.pos.y, target.pos.x, target.pos.y);
    for (const candidate of targets.slice(1)) {
      const candidateDistance = dist(this.pos.x, this.pos.y, candidate.pos.x, candidate.pos.y);
      if (candidateDistance < nearest) {
        target = candidate;
        nearest = candidateDistance;
      }
    }
    const direction = p5.Vector.sub(target.pos, this.pos);
    this.angle = direction.heading();
    if (nearest > 58) {
      direction.setMag(2.25);
      this.vel = p5.Vector.lerp(this.vel, direction, 0.14);
      moveActorWithCollision(this, this.vel);
    } else if (millis() >= this.nextAttackAt) {
      this.nextAttackAt = millis() + 1300;
      target.takeDamage?.(18);
      if (target instanceof SurvivorBot) target.takeDamage(34);
      createImpactParticles(target.pos.x, target.pos.y, color(255, 50, 100), 12);
    }
    moveActorWithCollision(this, createVector(0, 0));
  }
  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);
    fill(255, 45, 100, 230);
    stroke(255, 120, 190);
    strokeWeight(4);
    circle(0, 0, this.radius * 2);
    stroke(255);
    strokeWeight(3);
    line(8, -12, 28, 0);
    line(8, 12, 28, 0);
    stroke(80, 0, 40);
    strokeWeight(6);
    line(-12, -16, -25, -28);
    line(-12, 16, -25, 28);
    fill(255, 210, 220);
    noStroke();
    textAlign(CENTER, BOTTOM);
    textSize(10);
    text("KILLER // VANTA", 0, -39);
    pop();
  }
}

class TrainingDummy {
  constructor(x,y) { this.pos=createVector(x,y); this.radius=30; this.lastHitTime=0; this.displayDamage=0; this.flashAlpha=0; }
  registerHit(amount) { this.displayDamage=floor(amount); this.lastHitTime=millis(); this.flashAlpha=255; createImpactParticles(this.pos.x,this.pos.y,color(255,120,0),15); }
  draw() {
    if (this.flashAlpha>0) this.flashAlpha-=8;
    push();
    stroke(255,120,0,100); strokeWeight(2); noFill(); circle(this.pos.x,this.pos.y,this.radius*2.8);
    fill(lerpColor(color(20,20,35),color(255,100,0),this.flashAlpha/255)); stroke(255,110,0); strokeWeight(4); rectMode(CENTER); rect(this.pos.x,this.pos.y,this.radius*2,this.radius*2,8);
    stroke(255); strokeWeight(2); line(this.pos.x-12,this.pos.y,this.pos.x+12,this.pos.y); line(this.pos.x,this.pos.y-12,this.pos.x,this.pos.y+12);
    if (millis()-this.lastHitTime<800) { textAlign(CENTER); fill(255,220,0,map(millis()-this.lastHitTime,0,800,255,0)); textSize(24); text(`-${this.displayDamage}`,this.pos.x,this.pos.y-55); }
    pop();
  }
}

// Standard zombie — medium, green
class Zombie {
  constructor(x, y) {
    this.pos=createVector(x,y); this.vel=createVector();
    this.health=48; this.maxHealth=48; this.radius=22;
    this.poisonUntil=0; this.stunnedUntil=0;
    this.nextContactDamageAt=0;
    this.type="standard"; this.dmgPerTouch=5;
  }
  update() {
    if (millis()<this.stunnedUntil) return;
    let dir=p5.Vector.sub(player.pos,this.pos).normalize();
    let slow=1;
    for (let w of walls) if (this.pos.x>w.x&&this.pos.x<w.x+w.w&&this.pos.y>w.y&&this.pos.y<w.y+w.h) slow=0.32;
    let spd=(millis()<this.poisonUntil)?1.15:1.85;
    this.vel=dir.mult(spd*slow); this.pos.add(this.vel);
    if (millis()<this.poisonUntil) this.health-=0.4;
  }
  draw() {
    let poisoned=(millis()<this.poisonUntil);
    fill(poisoned?color(180,255,100):color(50,220,80)); stroke(0,180,60); strokeWeight(4); circle(this.pos.x,this.pos.y,this.radius*2);
    // health pip
    let hpFrac=this.health/this.maxHealth;
    fill(255,50,50,180); noStroke(); rect(this.pos.x-this.radius, this.pos.y-this.radius-8, this.radius*2,5,2);
    fill(80,255,80); rect(this.pos.x-this.radius, this.pos.y-this.radius-8, this.radius*2*hpFrac,5,2);
  }
}

// Fast zombie — quick, small, red
class ZombieFast {
  constructor(x, y) {
    this.pos=createVector(x,y); this.vel=createVector();
    this.health=20; this.maxHealth=20; this.radius=14;
    this.poisonUntil=0; this.stunnedUntil=0;
    this.nextContactDamageAt=0;
    this.type="fast"; this.dmgPerTouch=4;
  }
  update() {
    if (millis()<this.stunnedUntil) return;
    let dir=p5.Vector.sub(player.pos,this.pos).normalize();
    let slow=1;
    for (let w of walls) if (this.pos.x>w.x&&this.pos.x<w.x+w.w&&this.pos.y>w.y&&this.pos.y<w.y+w.h) slow=0.4;
    let spd=3.4*slow;
    this.vel=dir.mult(spd); this.pos.add(this.vel);
    if (millis()<this.poisonUntil) this.health-=0.25;
  }
  draw() {
    let hpFrac=this.health/this.maxHealth;
    fill(255,60,60); stroke(200,0,0); strokeWeight(3); circle(this.pos.x,this.pos.y,this.radius*2);
    // speed trail
    fill(255,60,60,60); noStroke();
    let back=p5.Vector.sub(this.pos, this.vel.copy().normalize().mult(16));
    circle(back.x,back.y,this.radius*1.4);
    // hp bar
    fill(255,50,50,180); noStroke(); rect(this.pos.x-this.radius,this.pos.y-this.radius-7,this.radius*2,4,2);
    fill(255,120,0); rect(this.pos.x-this.radius,this.pos.y-this.radius-7,this.radius*2*hpFrac,4,2);
  }
}

// Tank zombie — slow, huge, orange
class ZombieTank {
  constructor(x, y) {
    this.pos=createVector(x,y); this.vel=createVector();
    this.health=180; this.maxHealth=180; this.radius=38;
    this.poisonUntil=0; this.stunnedUntil=0;
    this.nextContactDamageAt=0;
    this.type="tank"; this.dmgPerTouch=12;
  }
  update() {
    if (millis()<this.stunnedUntil) return;
    let dir=p5.Vector.sub(player.pos,this.pos).normalize();
    let slow=1;
    for (let w of walls) if (this.pos.x>w.x&&this.pos.x<w.x+w.w&&this.pos.y>w.y&&this.pos.y<w.y+w.h) slow=0.25;
    let spd=0.95*slow;
    this.vel=dir.mult(spd); this.pos.add(this.vel);
    if (millis()<this.poisonUntil) this.health-=0.6;
  }
  draw() {
    let hpFrac=this.health/this.maxHealth;
    // outer ring
    noFill(); stroke(255,140,0,80); strokeWeight(6); circle(this.pos.x,this.pos.y,this.radius*2.6);
    fill(200,100,0); stroke(255,140,0); strokeWeight(5); circle(this.pos.x,this.pos.y,this.radius*2);
    // cross mark
    stroke(255,180,0); strokeWeight(3);
    line(this.pos.x-14,this.pos.y,this.pos.x+14,this.pos.y);
    line(this.pos.x,this.pos.y-14,this.pos.x,this.pos.y+14);
    // hp bar
    fill(255,50,50,200); noStroke(); rect(this.pos.x-this.radius,this.pos.y-this.radius-10,this.radius*2,6,3);
    fill(255,180,0); rect(this.pos.x-this.radius,this.pos.y-this.radius-10,this.radius*2*hpFrac,6,3);
  }
}

class GhostFang {
  constructor(x,y,dir,dmg=4,ownerRole="survivor") {
    this.pos=createVector(x,y);
    this.vel=dir.mult(14.5);
    this.life=80;
    this.dmg=dmg;
    this.ownerRole=ownerRole;
  }
  update() { this.pos.add(this.vel); this.life--; }
  draw() {
    let wt=currentWeaponId==="weap_lance"?3:1;
    const boltColor = this.ownerRole === "killer" ? color(255, 55, 120) : color(0, 255, 220);
    fill(boltColor); stroke(255); strokeWeight(wt); circle(this.pos.x,this.pos.y, currentWeaponId==="weap_lance"?5:7);
  }
}

class Particle {
  constructor(x,y,speed=6) { this.pos=createVector(x,y); this.vel=p5.Vector.random2D().mult(speed); this.life=40; this.color=color(0,255,255); }
  update() { this.pos.add(this.vel); this.vel.mult(0.94); this.life--; }
  draw() { let a=map(this.life,0,40,0,255); fill(red(this.color),green(this.color),blue(this.color),a); noStroke(); circle(this.pos.x,this.pos.y,9); }
}

/* ==========================================================================
   4. CORE GAME MECHANICS
========================================================================== */
function updateGame() {
  mapTime = millis();
  player.update();

  if (playerRole === "survivor") {
    killer?.update();
  }
  for (const ally of survivors) ally.update();

  // The same old ranged control now resolves against the opposing role.
  for (let i=bullets.length-1;i>=0;i--) {
    let b=bullets[i]; b.update();
    let hit=false;
    if (b.ownerRole === "survivor" && killer && dist(b.pos.x,b.pos.y,killer.pos.x,killer.pos.y)<killer.radius+5) {
      let dmg=(12 + b.dmg * 2.5) * upgrades.damage;
      killer.takeDamage(dmg);
      createImpactParticles(b.pos.x,b.pos.y,color(0,255,220));
      b.life=0;
      hit=true;
    } else if (b.ownerRole === "killer") {
      for (let j=survivors.length-1;j>=0;j--) {
        let ally=survivors[j];
        if (dist(b.pos.x,b.pos.y,ally.pos.x,ally.pos.y)<ally.radius+5) {
          ally.takeDamage((12 + b.dmg * 2.5) * upgrades.damage);
          createImpactParticles(b.pos.x,b.pos.y,color(255,55,120));
          b.life=0;
          hit=true;
          break;
        }
      }
    }
    if (b.life<=0) bullets.splice(i,1);
  }

  updateObjectiveInteraction();
  updateParticles();
  checkMatchState();
  if (screenShakeEnabled) cameraShake*=0.87; else cameraShake=0;
}

function updateObjectiveInteraction() {
  if (!player || player.downed) return;

  if (playerRole === "survivor" && matchPhase === "HUNT") {
    const activeObjective = objectives.find((objective) =>
      !objective.completed &&
      dist(player.pos.x, player.pos.y, objective.pos.x, objective.pos.y) < 92
    );
    if (activeObjective && keyIsDown(82)) {
      activeObjective.progress = min(100, activeObjective.progress + 0.22);
      score += 1;
      if (activeObjective.progress >= 100) {
        activeObjective.completed = true;
        crystalis += 150;
        score += 500;
        createImpactParticles(activeObjective.pos.x, activeObjective.pos.y, color(0,255,180), 32);
      }
    }
    if (objectives.length && objectives.every((objective) => objective.completed)) {
      matchPhase = "ESCAPE";
      exitGate.active = true;
      matchResult = "GATES POWERED — REACH THE EXTRACTION ZONE";
    }
  }

  if (playerRole === "survivor" && matchPhase === "ESCAPE" && exitGate?.active &&
      dist(player.pos.x, player.pos.y, exitGate.pos.x, exitGate.pos.y) < 125 && keyIsDown(82)) {
    matchPhase = "SURVIVOR_ESCAPED";
    matchResult = "YOU ESCAPED THE NULL ZONE";
    score += 2500;
    gameOver();
  }
}

function checkMatchState() {
  const livingSurvivors = survivors.filter((ally) => ally.status !== "dead" && ally.status !== "escaped");
  if (playerRole === "killer" && livingSurvivors.length === 0) {
    matchResult = "ALL SURVIVORS ELIMINATED";
    gameOver();
    return;
  }
  if (playerRole === "survivor" && survivors.filter((ally) => ally.status === "escaped").length >= 3) {
    matchResult = "THE TEAM ESCAPED";
    gameOver();
  }
}

function drawObjective(objective) {
  push();
  translate(objective.pos.x, objective.pos.y);
  const active = !objective.completed;
  const pulse = 1 + sin(frameCount * 0.08 + objective.id) * 0.08;
  noFill();
  stroke(active ? color(255, 185, 0, 210) : color(0, 255, 180, 180));
  strokeWeight(3);
  circle(0, 0, 74 * pulse);
  fill(active ? color(255, 145, 0, 230) : color(0, 220, 180, 230));
  noStroke();
  rectMode(CENTER);
  rect(0, 0, 42, 32, 4);
  stroke(255, 210, 110, 190);
  strokeWeight(3);
  line(-15, -16, -15, -27);
  line(15, -16, 15, -27);
  noStroke();
  fill(220, 235, 245);
  textAlign(CENTER, BOTTOM);
  textSize(10);
  text(`GENERATOR ${objective.id}`, 0, -50);
  fill(20, 10, 20, 230);
  rectMode(CORNER);
  rect(-42, 44, 84, 7, 3);
  fill(active ? color(255, 175, 0) : color(0, 255, 180));
  rect(-42, 44, 84 * (objective.progress / 100), 7, 3);
  pop();
}

function drawExitGate() {
  if (!exitGate) return;
  push();
  translate(exitGate.pos.x, exitGate.pos.y);
  const glow = 105 + sin(frameCount * 0.12) * 25;
  noFill();
  stroke(exitGate.active ? color(0, 255, 180, glow) : color(80, 90, 110, 90));
  strokeWeight(5);
  rectMode(CENTER);
  rect(0, 0, 132, 170, 8);
  strokeWeight(2);
  line(-48, 76, -48, -76);
  line(48, 76, 48, -76);
  fill(exitGate.active ? color(0, 255, 180) : color(95, 105, 120));
  noStroke();
  textAlign(CENTER, BOTTOM);
  textSize(11);
  text(exitGate.active ? "EXTRACTION // HOLD R" : "GATE LOCKED", 0, -98);
  pop();
}

function drawMatchWorldActors() {
  for (let objective of objectives) drawObjective(objective);
  drawExitGate();
  for (let b of bullets) b.draw();
  for (let ally of survivors) ally.draw();
  if (killer && playerRole === "survivor") killer.draw();
  player.draw();
  for (let p of particles) p.draw();
}

function resetMatchMap() {
  const centerX = MAP_W / 2;
  const centerY = MAP_H / 2;
  objectives = [
    { id: 1, pos: createVector(900, 600), progress: 0, completed: false },
    { id: 2, pos: createVector(2300, 600), progress: 0, completed: false },
    { id: 3, pos: createVector(700, 2450), progress: 0, completed: false },
    { id: 4, pos: createVector(2500, 2450), progress: 0, completed: false },
    { id: 5, pos: createVector(centerX, 1740), progress: 0, completed: false },
  ];
  exitGate = { pos: createVector(centerX, 150), active: false };
  escapedSurvivors = 0;
}

function setupMatchRoles() {
  resetMatchMap();
  const centerX = MAP_W / 2;
  const centerY = MAP_H / 2;
  if (playerRole === "killer") {
    player = new Spectre(centerX, centerY);
    player.role = "killer";
    survivors = [
      new SurvivorBot(0, centerX - 360, centerY - 200),
      new SurvivorBot(1, centerX + 390, centerY - 190),
      new SurvivorBot(2, centerX - 400, centerY + 250),
      new SurvivorBot(3, centerX + 380, centerY + 260),
    ];
    killer = null;
  } else {
    player = new Spectre(centerX, centerY);
    player.role = "survivor";
    survivors = [
      new SurvivorBot(0, centerX - 360, centerY - 200),
      new SurvivorBot(1, centerX + 390, centerY - 190),
      new SurvivorBot(2, centerX - 400, centerY + 250),
    ];
    killer = new KillerHunter(centerX + 80, centerY + 80);
  }
}

function updateTestRange() {
  player.update();
  for (let i=bullets.length-1;i>=0;i--) {
    let b=bullets[i]; b.update();
    if (dist(b.pos.x,b.pos.y,trainingDummy.pos.x,trainingDummy.pos.y)<trainingDummy.radius+6) {
      trainingDummy.registerHit((12+b.dmg*2.5)*upgrades.damage); b.life=0;
    }
    if (b.life<=0) bullets.splice(i,1);
  }
  updateParticles();
}

function drawPlayingEnvironment() {
  background(4, 2, 12);
}

function drawMapStructures() {
  // Sector bands make the district legible while the walls create loops and
  // sightline breaks for the hunter chase.
  noStroke();
  fill(0, 120, 180, 10);
  rect(80, 80, 920, 900);
  fill(190, 0, 120, 9);
  rect(2200, 80, 920, 900);
  fill(0, 230, 180, 8);
  rect(80, 2150, 920, 900);
  fill(255, 170, 0, 7);
  rect(2200, 2150, 920, 900);

  for (const wall of walls) {
    fill(12, 8, 28, 245);
    stroke(92, 20, 190, 210);
    strokeWeight(4);
    rect(wall.x, wall.y, wall.w, wall.h, 6);
    stroke(0, 220, 235, 80);
    strokeWeight(2);
    line(wall.x + 10, wall.y + 10, wall.x + wall.w - 10, wall.y + 10);
    line(wall.x + 10, wall.y + wall.h - 10, wall.x + wall.w - 10, wall.y + wall.h - 10);
    noStroke();
    fill(110, 135, 165, 120);
    textAlign(LEFT, TOP);
    textSize(8);
    text(wall.name || "NULL ZONE STRUCTURE", wall.x + 12, wall.y + 17);
  }

  for (const barrier of dynamicBarriers) {
    const rectData = getDynamicBarrierRect(barrier);
    const active = sin(mapTime * 0.0014 + barrier.phase) > 0.35;
    fill(active ? color(255, 55, 150, 180) : color(0, 210, 230, 170));
    stroke(active ? color(255, 120, 190, 240) : color(0, 255, 220, 230));
    strokeWeight(3);
    rect(rectData.x, rectData.y, rectData.w, rectData.h, 4);
    stroke(255, 210, 240, 120);
    strokeWeight(1);
    if (barrier.axis === "x") {
      for (let x = rectData.x + 12; x < rectData.x + rectData.w; x += 20) line(x, rectData.y + 3, x, rectData.y + rectData.h - 3);
    } else {
      for (let y = rectData.y + 12; y < rectData.y + rectData.h; y += 20) line(rectData.x + 3, y, rectData.x + rectData.w - 3, y);
    }
  }

  for (const beacon of mapBeacons) {
    const pulse = 1 + sin(mapTime * 0.003 + beacon.x) * 0.18;
    noFill();
    stroke(beacon.color[0], beacon.color[1], beacon.color[2], 70);
    strokeWeight(2);
    circle(beacon.x, beacon.y, 60 * pulse);
    fill(beacon.color[0], beacon.color[1], beacon.color[2], 200);
    noStroke();
    circle(beacon.x, beacon.y, 10);
    fill(160, 185, 205, 160);
    textAlign(CENTER, TOP);
    textSize(9);
    text(beacon.label, beacon.x, beacon.y + 38);
  }
}

function drawHiddenZones() {
  for (const zone of hiddenZones) {
    const zonePulse = 120 + sin(mapTime * 0.001 + zone.x) * 20;
    fill(1, 2, 14, zonePulse);
    stroke(90, 40, 150, 100);
    strokeWeight(2);
    rect(zone.x, zone.y, zone.w, zone.h, 16);
    noStroke();
    fill(145, 120, 190, 125);
    textAlign(LEFT, TOP);
    textSize(10);
    text(`// ${zone.label} // VISIBILITY NULL`, zone.x + 18, zone.y + 18);
    stroke(140, 70, 220, 35);
    strokeWeight(1);
    for (let y = zone.y + 54; y < zone.y + zone.h; y += 24) line(zone.x + 12, y, zone.x + zone.w - 12, y);
  }
}

function drawHiddenZoneVeil() {
  const playerZone = getHiddenZoneAt(player.pos.x, player.pos.y);
  for (const zone of hiddenZones) {
    const isPlayerZone = zone === playerZone;
    fill(1, 2, 14, isPlayerZone ? 58 : 112);
    noStroke();
    rect(zone.x, zone.y, zone.w, zone.h, 16);
    if (isPlayerZone) {
      noFill();
      stroke(0, 255, 200, 80);
      strokeWeight(2);
      rect(zone.x, zone.y, zone.w, zone.h, 16);
    }
  }
}

function drawMapRadar() {
  const compact = width < 760;
  const radarW = compact ? 136 : 190;
  const radarH = compact ? 108 : 146;
  const radarX = width - radarW - 18;
  const radarY = compact ? 94 : 92;
  fill(4, 3, 18, 225);
  stroke(0, 220, 235, 110);
  strokeWeight(1);
  rect(radarX, radarY, radarW, radarH, 8);
  fill(0, 255, 220);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(9);
  text("NULL ZONE // RADAR", radarX + 10, radarY + 9);
  const mapX = radarX + 10;
  const mapY = radarY + 28;
  const mapW = radarW - 20;
  const mapH = radarH - 38;
  fill(10, 8, 27);
  rect(mapX, mapY, mapW, mapH, 4);
  stroke(80, 50, 150, 90);
  for (const wall of walls) {
    rect(mapX + (wall.x / MAP_W) * mapW, mapY + (wall.y / MAP_H) * mapH, max(2, (wall.w / MAP_W) * mapW), max(2, (wall.h / MAP_H) * mapH));
  }
  noStroke();
  for (const objective of objectives) {
    fill(objective.completed ? color(0,255,180) : color(255,185,0));
    circle(mapX + (objective.pos.x / MAP_W) * mapW, mapY + (objective.pos.y / MAP_H) * mapH, 5);
  }
  if (exitGate) {
    fill(exitGate.active ? color(0,255,180) : color(120,120,140));
    circle(mapX + (exitGate.pos.x / MAP_W) * mapW, mapY + (exitGate.pos.y / MAP_H) * mapH, 5);
  }
  for (const ally of survivors) {
    if (ally.status === "dead" || ally.status === "escaped") continue;
    fill(ally.color[0], ally.color[1], ally.color[2]);
    circle(mapX + (ally.pos.x / MAP_W) * mapW, mapY + (ally.pos.y / MAP_H) * mapH, 4);
  }
  if (killer && playerRole === "survivor") {
    fill(255, 55, 110);
    circle(mapX + (killer.pos.x / MAP_W) * mapW, mapY + (killer.pos.y / MAP_H) * mapH, 6);
  }
  fill(playerRole === "killer" ? color(255,55,110) : color(0,255,220));
  circle(mapX + (player.pos.x / MAP_W) * mapW, mapY + (player.pos.y / MAP_H) * mapH, 6);
}

function drawWorld() {
  push();
  let sx=screenShakeEnabled?random(-cameraShake,cameraShake):0;
  let sy=screenShakeEnabled?random(-cameraShake,cameraShake):0;
  translate(width/2-player.pos.x+sx, height/2-player.pos.y+sy);

  // Floor tiles
  let tileSize=90;
  let camX=player.pos.x, camY=player.pos.y;
  let startX=floor((camX-width/2-100)/tileSize)*tileSize;
  let startY=floor((camY-height/2-100)/tileSize)*tileSize;
  for (let tx=startX;tx<camX+width/2+tileSize;tx+=tileSize) {
    for (let ty=startY;ty<camY+height/2+tileSize;ty+=tileSize) {
      let dark=((floor(tx/tileSize)+floor(ty/tileSize))%2===0);
      fill(dark?color(6,3,14):color(10,5,20)); noStroke();
      rect(tx,ty,tileSize,tileSize);
    }
  }

  // Neon grid
  stroke(60,0,120,50); strokeWeight(1);
  for (let x=0;x<MAP_W;x+=90) line(x,0,x,MAP_H);
  for (let y=0;y<MAP_H;y+=90) line(0,y,MAP_W,y);

  // Map border glow
  stroke(0,200,255,90); strokeWeight(8); noFill(); rect(0,0,MAP_W,MAP_H);

  drawMapStructures();
  drawHiddenZones();

  // Ambient floor circles
  noStroke();
  for (let i=0;i<6;i++) {
    let ax=((i*571+frameCount*0.3)%(MAP_W-400))+200;
    let ay=((i*379+frameCount*0.2)%(MAP_H-400))+200;
    let r=60+30*sin(frameCount*0.02+i);
    fill(0,60,120,8+4*sin(frameCount*0.04+i)); circle(ax,ay,r*2);
  }

  drawMatchWorldActors();
  drawHiddenZoneVeil();
  pop();
  drawMapRadar();
}

function createImpactParticles(x,y,col=color(0,255,220),count=20) {
  for (let i=0;i<count;i++) { let p=new Particle(x,y,random(3,9)); p.color=col; particles.push(p); }
}
function updateParticles() {
  for (let i=particles.length-1;i>=0;i--) { particles[i].update(); if (particles[i].life<=0) particles.splice(i,1); }
}

function gameOver() {
  if (gameState === "DEATH") return;
  paused = false;
  gameOverState = false;
  stopMenuMusic();
  stopRunMusic();
  stopShopMusic();
  stopSettingsPreview();
  gameState = "DEATH";
  startDeathMusic();
  buttons = [];
  const buttonWidth = min(240, width - 56);
  const buttonX = (width - buttonWidth) / 2;
  const firstButtonY = min(height - 142, height / 2 + 92);
  buttons.push(new Button(
    buttonX,
    firstButtonY,
    buttonWidth,
    46,
    "↻  RETRY RUN",
    startNewRun,
    color(0, 255, 180),
  ));
  buttons.push(new Button(
    buttonX,
    firstButtonY + 58,
    buttonWidth,
    46,
    "←  MAIN MENU",
    createMainMenu,
    color(0, 190, 230),
  ));
}

/* ==========================================================================
   5. UI & DASHBOARD VISUALS
========================================================================== */
function drawMainMenu() {
  push();
  const compact = width < 820;
  const left = compact ? 28 : max(44, width * 0.08);
  const titleY = compact ? 66 : 116;

  textAlign(LEFT, TOP);
  noStroke();
  fill(0, 255, 220);
  textSize(compact ? 9 : 11);
  text("N/ZP // OPERATIVE NETWORK", left, compact ? 24 : 34);
  fill(120, 155, 178);
  textAlign(RIGHT, TOP);
  text("SECTOR 07  •  SIGNAL STABLE", width - left, compact ? 24 : 34);

  drawingContext.shadowBlur = 28;
  drawingContext.shadowColor = "rgba(255,38,170,.34)";
  fill(238, 248, 255);
  textAlign(LEFT, TOP);
  textSize(compact ? 40 : min(78, width * 0.07));
  text("NEO", left, titleY);
  fill(0, 255, 220);
  text("/", left + textWidth("NEO") + 10, titleY);
  fill(255, 48, 174);
  text("ZOMBIE", left, titleY + (compact ? 43 : 76));
  drawingContext.shadowBlur = 0;

  const copyY = titleY + (compact ? 100 : 166);
  fill(160, 190, 204);
  textSize(compact ? 9 : 12);
   text("FOUR RUNNERS. ONE HUNTER. NO CLEAN EXIT.", left, copyY);
  fill(0, 255, 180, 175);
  textSize(10);
   text("HUNT  //  HIDE  //  REPAIR  //  ESCAPE", left, copyY + 24);

  const infoW = compact ? width - 56 : min(420, width * 0.3);
  const infoX = compact ? 28 : width - infoW - left;
  const infoY = compact ? height - 100 : 92;
  fill(7, 5, 24, 220);
  stroke(0, 220, 230, 92);
  strokeWeight(1);
  rect(infoX, infoY, infoW, compact ? 68 : 190, 8);
  noStroke();
  fill(255, 72, 182);
  textAlign(LEFT, TOP);
  textSize(10);
  text("LIVE OPERATIVE READOUT", infoX + 16, infoY + 14);
  fill(170, 202, 218);
  textSize(10);
  text("OPERATIVE     SPECTRE", infoX + 16, infoY + 42);
  if (!compact) {
    text("THREAT LEVEL   RISING", infoX + 16, infoY + 62);
    fill(0, 255, 180);
    text("LOADOUT       GHOST FANGS / STATIC PULSE", infoX + 16, infoY + 82);
    fill(255, 190, 0);
    text("MISSION       CLEAR THE WAVE", infoX + 16, infoY + 108);
    fill(155, 180, 198);
    text("WASD MOVE   •   LMB FIRE   •   E ABILITY", infoX + 16, infoY + 146);
    text("RMB MELEE   •   SPACE DASH", infoX + 16, infoY + 166);
  } else {
    fill(155, 180, 198);
    text("WASD MOVE  •  LMB FIRE  •  E ABILITY", infoX + 16, infoY + 58);
  }
  pop();
}

// Full-screen dedicated HERO SELECT screen (dark bg, like SHOP/INVENTORY)
function drawHeroSelectScreen() {
  let lx = 50, topY = 70;
  let panelW = min(860, width - lx * 2);
  let slotH  = 100, slotGap = 12;
  let cols   = 2;
  let colW   = (panelW - 10) / cols;

  stroke(0, 180, 255, 28); strokeWeight(1);
  line(lx, 16, lx + panelW, 16); noStroke();

  let col = 0, row = 0;
  for (let i = 0; i < heroSlots.length; i++) {
    let h = heroSlots[i];
    let isSelected = (selectedHeroId === h.id);
    let cx2 = lx + col * (colW + 10);
    let cy2 = topY + row * (slotH + slotGap);

    let bg  = h.locked ? color(10,10,22,210) : (isSelected ? color(0,28,38,240) : color(12,12,30,220));
    let brd = h.locked ? color(44,44,66,50)  : (isSelected ? color(0,220,255,120) : color(0,140,190,60));

    fill(bg); stroke(brd); strokeWeight(isSelected ? 2 : 1);
    rect(cx2, cy2, colW, slotH, 8); noStroke();

    if (!h.locked) {
      // Accent bar
      fill(h.col[0], h.col[1], h.col[2], isSelected ? 210 : 80); noStroke();
      rect(cx2, cy2, 5, slotH, 8, 0, 0, 8);

      // Mini drone
      push();
      translate(cx2 + 46, cy2 + slotH / 2);
      fill(h.col[0], h.col[1], h.col[2]); stroke(255); strokeWeight(1.5); circle(0,0,26);
      line(6,-6,14,0); line(6,6,14,0);
      stroke(255,50,255); strokeWeight(2); line(-8,-9,-18,-15); line(-8,9,-18,15);
      pop();

      fill(isSelected ? color(0,255,255) : color(220)); textAlign(LEFT,CENTER); textSize(15); noStroke();
      text(h.name, cx2 + 82, cy2 + slotH/2 - 10);
      fill(isSelected ? color(0,180,210) : color(110)); textSize(10);
      text(h.sub, cx2 + 82, cy2 + slotH/2 + 8);
      if (isSelected) { fill(0,255,180); textSize(10); text("● SELECTED", cx2 + 82, cy2 + slotH/2 + 24); }
    } else {
      fill(44,44,66); textAlign(LEFT,CENTER); textSize(14); noStroke();
      text(h.name, cx2 + 22, cy2 + slotH/2 - 8);
      fill(55,55,80); textSize(10);
      text("LOCKED — NOT YET AVAILABLE", cx2 + 22, cy2 + slotH/2 + 10);
    }

    col++;
    if (col >= cols) { col = 0; row++; }
  }
}

function drawSettingsScreen() {
  let cx=width/2,cy=height/2;
  let pw=min(900,width-40),ph=min(650,height-24);
  let px=cx-pw/2,py=cy-ph/2;
  let midX=px+pw/2,lx=px+24,ox=midX+18,topY=py+70;

  fill(7,7,20); stroke(0,180,255,40); strokeWeight(1); rect(px,py,pw,ph,12); noStroke();
  stroke(0,180,255,28); strokeWeight(1); line(px+16,py+16,px+pw-16,py+16); noStroke();
  stroke(255,255,255,10); strokeWeight(1); line(midX,py+58,midX,py+ph-20); noStroke();

  fill(120); textAlign(LEFT,TOP); textSize(10); noStroke();
  text("KEY  BINDINGS  —  click to rebind",lx,topY);
  stroke(255,255,255,14); strokeWeight(1); line(lx,topY+15,midX-18,topY+15); noStroke();

  for (let btn of buttons) {
    if (!btn.rebindAction) continue;
    let isActive=btn.rebindAction===rebindingKey;
    fill(isActive?color(0,255,255):color(175)); textAlign(LEFT,CENTER); textSize(12); noStroke();
    text(btn.rebindLabel, btn.x+btn.w+14, btn.y+btn.h/2);
  }

  let mouseY0=topY+28+7*32+4;
  for (let [k,v] of [["LMB","Shoot"],["RMB","Melee"]]) {
    fill(16,16,34); stroke(0,100,140,40); strokeWeight(1); rect(lx,mouseY0,78,24,4); noStroke();
    fill(0,140,180); textAlign(CENTER,CENTER); textSize(11); text(k,lx+39,mouseY0+12);
    fill(110); textAlign(LEFT,CENTER); textSize(12); text(v,lx+92,mouseY0+12);
    mouseY0+=32;
  }

  let optW=pw/2-34;
  fill(120); textAlign(LEFT,TOP); textSize(10); noStroke(); text("DISPLAY",ox,topY);
  stroke(255,255,255,14); strokeWeight(1); line(ox,topY+15,px+pw-16,topY+15); noStroke();
  let audioY=topY+100;
  fill(120); textAlign(LEFT,TOP); textSize(10); noStroke(); text("AUDIO",ox,audioY);
  stroke(255,255,255,14); strokeWeight(1); line(ox,audioY+15,px+pw-16,audioY+15); noStroke();

  if (musicSlider&&sfxSlider&&menuSlider) {
    musicSlider.update(); musicSlider.draw();
    sfxSlider.update();   sfxSlider.draw();
    menuSlider.update();  menuSlider.draw();
  }
  drawSettingsMusicPlayer(ox, py+ph-174, optW);
}

function getSettingsMusicTracks() {
  if (settingsMusicTab === "ALL") return musicLibrary;
  return musicLibrary.filter(track => track.scope === settingsMusicTab);
}

function drawSettingsMusicPlayer(x, y, w) {
  fill(10,10,28,235); stroke(0,180,255,55); strokeWeight(1); rect(x,y,w,154,8); noStroke();
  fill(255,80,210); textAlign(LEFT,TOP); textSize(10); text("MUSIC PLAYER",x+10,y+6);
  let selected=getMusicTrack(settingsMusicSelectedId)||musicLibrary[0];
  fill(220); textSize(11); text(selected.title,x+10,y+51);
  fill(100,140,165); textSize(9); text(`${selected.scope} CHANNEL  //  ${selected.artist}`,x+10,y+66);
  let tracks=getSettingsMusicTracks();
  let start=settingsMusicScroll;
  for (let i=0;i<min(SETTINGS_MUSIC_VISIBLE_ROWS,tracks.length-start);i++) {
    let track=tracks[start+i], rowY=y+84+i*28;
    let active=track.id===settingsMusicSelectedId;
    fill(active?color(45,18,55,230):color(17,17,39,220));
    rect(x+8,rowY-2,w-16,25,4);
    fill(active?color(255,100,220):color(180)); textAlign(LEFT,CENTER); textSize(10);
    text(`${active?"◆":"◇"}  ${track.title}`,x+16,rowY+10);
    fill(95,125,145); textAlign(RIGHT,CENTER); textSize(8); text(track.scope,x+w-88,rowY+10);
  }
  if (tracks.length===0) {
    fill(120); textAlign(LEFT,CENTER); textSize(10); text("NO TRACKS IN THIS CHANNEL",x+12,y+105);
  }
  fill(85,110,130); textAlign(LEFT,BOTTOM); textSize(8);
  text("WHEEL TO BROWSE  //  PREVIEW IS STOPPED WHEN YOU LEAVE SETTINGS",x+10,y+148);
}

// ---------------------------------------------------------------
// SHOP SCREEN
// ---------------------------------------------------------------
function drawShopScreen() {
  let lx=40, topY=70;

  noStroke(); fill(0,255,255); textAlign(LEFT,TOP); textSize(28);
  text("OPERATIVE SHOP", lx, 22);
  fill(255,215,0); textAlign(RIGHT,TOP); textSize(15);
  text(`CRYSTALIS  ${crystalis}`, width-50, 30);

  // Categories
  let cats = [
    { label:"CHASSIS",  items:shopItems.filter(i=>i.type==="CHASSIS")  },
    { label:"WEAPON",   items:shopItems.filter(i=>i.type==="WEAPON")   },
    { label:"ABILITY",  items:shopItems.filter(i=>i.type==="ABILITY")  },
    { label:"UPGRADES", items:shopItems.filter(i=>i.type==="UPGRADE")  },
  ];

  let colW=(width-lx*2-30)/4;
  let cols=cats;

  for (let ci=0;ci<cols.length;ci++) {
    let cat=cols[ci];
    let cx2=lx + ci*(colW+10);
    // Section header
    fill(0,200,255,180); noStroke(); rect(cx2,topY,colW,22,4);
    fill(0,0,0); textAlign(CENTER,CENTER); textSize(11); text(cat.label,cx2+colW/2,topY+11);

    let cardY=topY+32;
    for (let item of cat.items) {
      let isOwned    = item.bought;
      let isEquipped = (currentSkinId===item.id||currentWeaponId===item.id||currentAbilityId===item.id);
      let canAfford  = crystalis>=item.cost;
      let isUpgrade  = item.type==="UPGRADE";
      let lvl        = isUpgrade ? (upgradeLevels[item.upgradeKey]||0) : 0;
      let maxLvl     = 5;
      let upgCost    = isUpgrade ? floor(item.cost*(1+lvl*0.45)) : item.cost;
      let canBuyUpg  = isUpgrade && lvl<maxLvl && crystalis>=upgCost;

      let bg  = isEquipped?color(0,35,22,230):(isOwned?color(10,10,28,220):(canAfford?color(14,10,20,220):color(10,10,18,200)));
      let brd = isEquipped?color(80,255,120,90):(isOwned?color(0,180,255,50):(canAfford?color(255,175,0,60):color(55,55,75,40)));
      let cardH=isUpgrade?95:110;

      fill(bg); stroke(brd); strokeWeight(1); rect(cx2,cardY,colW,cardH,7); noStroke();
      if (isEquipped) { fill(80,255,120,200); noStroke(); rect(cx2,cardY,4,cardH,7,0,0,7); }

      let nameCol=isEquipped?color(120,255,150):(isOwned?color(215):(canAfford?color(245):color(80)));
      fill(nameCol); textAlign(LEFT,TOP); textSize(12); noStroke();
      text(item.name, cx2+12, cardY+10, colW-22, 30);

      if (!isOwned && !isUpgrade) {
        fill(canAfford?color(255,185,0):color(70)); textSize(11); textAlign(RIGHT,TOP); noStroke();
        text(`${item.cost}`, cx2+colW-10, cardY+12);
      }
      if (isUpgrade) {
        fill(lvl>=maxLvl?color(100,255,100):color(180)); textSize(10); textAlign(LEFT,TOP); noStroke();
        text(`LVL ${lvl} / ${maxLvl}`, cx2+12, cardY+36);
        if (lvl<maxLvl) { fill(canBuyUpg?color(255,185,0):color(70)); textSize(10); textAlign(RIGHT,TOP); text(`${upgCost}`,cx2+colW-10,cardY+36); }
      }

      stroke(255,255,255,8); strokeWeight(1);
      line(cx2+12,cardY+52,cx2+colW-12,cardY+52); noStroke();

      cardY+=cardH+10;
    }
  }
}

// ---------------------------------------------------------------
// INVENTORY SCREEN
// ---------------------------------------------------------------
function drawInventoryScreen() {
  let lx=60, topY=88;
  let lw=260, rw=260;
  let rx=width-rw-60;
  let mx=lx+lw+24, mw=rx-mx-20;

  noStroke(); fill(0,255,255); textAlign(LEFT,TOP); textSize(26); text("INVENTORY",lx,26);
  fill(255,215,0); textAlign(RIGHT,TOP); textSize(15); text(`CRYSTALIS  ${crystalis}`,width-60,30);

  // Left: drone preview
  fill(8,8,22,230); stroke(0,255,255,30); strokeWeight(1); rect(lx,topY,lw,200,8); noStroke();
  fill(110); textSize(10); textAlign(LEFT,TOP); text("OPERATIVE PREVIEW",lx+14,topY+12);
  stroke(255,255,255,12); strokeWeight(1); line(lx+14,topY+25,lx+lw-14,topY+25); noStroke();
  push(); translate(lx+lw/2,topY+110); previewRotation+=0.015; rotate(previewRotation);
  noFill(); stroke(0,255,255,20); strokeWeight(1); circle(0,0,90);
  stroke(currentSkinColor[0],currentSkinColor[1],currentSkinColor[2],45); circle(0,0,68);
  fill(currentSkinColor[0],currentSkinColor[1],currentSkinColor[2]); stroke(255); strokeWeight(2); circle(0,0,38);
  line(9,-9,20,0); line(9,9,20,0); stroke(255,50,255); strokeWeight(3); line(-11,-13,-24,-21); line(-11,13,-24,21);
  pop();

  // Left: upgrade levels display
  fill(8,8,22,230); stroke(0,255,255,30); strokeWeight(1); rect(lx,topY+210,lw,180,8); noStroke();
  fill(110); textSize(10); textAlign(LEFT,TOP); text("STAT UPGRADES",lx+14,topY+222);
  stroke(255,255,255,12); strokeWeight(1); line(lx+14,topY+235,lx+lw-14,topY+235); noStroke();
  let statLabels=[["SPEED",upgradeLevels.speed],["HEALTH",upgradeLevels.health],["DAMAGE",upgradeLevels.damage],["FIRE RATE",upgradeLevels.fireRate]];
  let sy2=topY+248;
  for (let [lbl,lvl] of statLabels) {
    fill(160); textSize(10); textAlign(LEFT,CENTER); text(lbl,lx+14,sy2);
    fill(25,25,45); noStroke(); rect(lx+90,sy2-6,lw-108,12,3);
    fill(0,200,255); rect(lx+90,sy2-6,(lw-108)*(lvl/5),12,3);
    fill(200); textSize(9); textAlign(RIGHT,CENTER); text(`${lvl}/5`,lx+lw-14,sy2);
    sy2+=28;
  }

  // Left: synergy
  fill(8,8,22,230); stroke(0,255,255,30); strokeWeight(1); rect(lx,topY+400,lw,78,8); noStroke();
  fill(110); textSize(10); textAlign(LEFT,TOP); text("SYNERGY",lx+14,topY+412);
  stroke(255,255,255,12); strokeWeight(1); line(lx+14,topY+425,lx+lw-14,topY+425); noStroke();
  computeActiveSynergyProfiles();
  let sOn=activeSynergyText!=="NONE DETECTED // MATRIX OFFLINE";
  fill(sOn?color(100,255,100):color(95)); textSize(11); textAlign(LEFT,TOP);
  text(activeSynergyText,lx+14,topY+436,lw-28,36);

  // Middle: equippable items (owned only)
  let eqCats=[
    {label:"CHASSIS",  items:shopItems.filter(i=>i.type==="CHASSIS"  && i.bought)},
    {label:"WEAPON",   items:shopItems.filter(i=>i.type==="WEAPON"   && i.bought)},
    {label:"ABILITY",  items:shopItems.filter(i=>i.type==="ABILITY"  && i.bought)},
  ];

  let cardH=100, secLabelH=26, secGap=18;
  let sectionY=topY;
  for (let ci=0;ci<eqCats.length;ci++) {
    let cat=eqCats[ci]; let n=cat.items.length;
    let cw=n>0?floor((mw-(n-1)*10)/n):mw;
    fill(115); textAlign(LEFT,TOP); textSize(10); noStroke(); text(cat.label,mx,sectionY+4);
    stroke(255,255,255,12); strokeWeight(1); line(mx+52,sectionY+10,mx+mw,sectionY+10); noStroke();
    let cardRowY=sectionY+secLabelH;

    for (let i=0;i<n;i++) {
      let item=cat.items[i];
      let isEquipped=(currentSkinId===item.id||currentWeaponId===item.id||currentAbilityId===item.id);
      let cardX=mx+i*(cw+10);
      let bg=isEquipped?color(0,38,26,230):color(10,10,28,220);
      let brd=isEquipped?color(80,255,120,90):color(0,180,255,45);
      fill(bg); stroke(brd); strokeWeight(1); rect(cardX,cardRowY,cw,cardH,8); noStroke();
      if (isEquipped) { fill(80,255,120,200); noStroke(); rect(cardX,cardRowY,4,cardH,8,0,0,8); }
      let nc=isEquipped?color(120,255,150):color(215);
      fill(nc); textAlign(LEFT,TOP); textSize(12); noStroke(); text(item.name,cardX+14,cardRowY+10,cw-20,30);
      stroke(255,255,255,10); strokeWeight(1); line(cardX+14,cardRowY+50,cardX+cw-14,cardRowY+50); noStroke();
    }
    sectionY+=secLabelH+cardH+secGap;
  }

  if (eqCats.every(c=>c.items.length===0)) {
    fill(70); textAlign(CENTER,CENTER); textSize(14);
    text("No items owned yet.\nVisit the SHOP to buy loadout items.",mx+mw/2,topY+200);
  }

  // Right: item detail
  let rpH=max(sectionY-topY-secGap,340);
  fill(8,8,22,230); stroke(255,80,255,28); strokeWeight(1); rect(rx,topY,rw,rpH,8); noStroke();
  fill(110); textSize(10); textAlign(LEFT,TOP); text("ITEM DETAILS",rx+14,topY+12);
  stroke(255,80,255,20); line(rx+14,topY+25,rx+rw-14,topY+25); noStroke();
  let hov=buttons.find(b=>b.hovered&&b.attachedItem);
  let hi=hov?hov.attachedItem:null;
  if (!hi) {
    fill(62); textAlign(CENTER,CENTER); textSize(12); text("Hover over an item\nto see details",rx+rw/2,topY+rpH/2);
  } else {
    fill(0,255,255); textAlign(LEFT,TOP); textSize(16); text(hi.name,rx+14,topY+38);
    fill(158); textAlign(LEFT,TOP); textSize(12); text(hi.desc,rx+14,topY+70,rw-28,150);
    fill(hi.cost>0?color(255,200,0):color(100,255,100)); textSize(12); textAlign(LEFT,TOP);
    text(hi.cost>0?`Cost: ${hi.cost} Crystalis`:"Free — Standard Issue",rx+14,topY+rpH-34);
  }
}

function drawBarChartComponent(label,y,currentVal,previewVal,startX,barWidth) {
  textAlign(LEFT,CENTER); fill(180); textSize(11); text(label,startX,y-12);
  fill(25,25,45); noStroke(); rect(startX,y,barWidth,14,3);
  let cw2=map(currentVal,0,10,0,barWidth); let pw2=map(previewVal,0,10,0,barWidth);
  fill(0,255,220); rect(startX,y,cw2,14,3);
  if (pw2>cw2) { fill(100,255,100,170+sin(frameCount*0.15)*60); rect(startX+cw2,y,pw2-cw2,14,3); }
  else if (pw2<cw2) { fill(255,50,50,190); rect(startX+pw2,y,cw2-pw2,14,3); }
}

function drawTestRange() {
  stroke(0,255,255,30); strokeWeight(1);
  for (let x=0;x<width;x+=50) line(x,0,x,height);
  for (let y=0;y<height;y+=50) line(0,y,width,y);
  stroke(255,100,0,100); strokeWeight(4); noFill(); rect(0,0,width,height); noStroke();
  trainingDummy.draw();
  for (let b of bullets) b.draw();
  player.draw();
  for (let p of particles) p.draw();
  fill(0,255,255); textAlign(LEFT,TOP); textSize(24); text("SANDBOX FIELD",50,40);
  fill(200); textSize(14); text("LIVE VERIFICATION — HAZARDS OFFLINE",50,75);
}

function drawPlayingUI() {
  const compact = width < 760;
  const left = compact ? 18 : 30;
  const hp = player.health / player.maxHealth;
  const barW = compact ? min(220, width * 0.58) : 320;
  const aliveCount = survivors.filter((ally) => ally.status !== "dead").length + (playerRole === "survivor" ? 1 : 0);
  const objectiveCount = objectives.filter((objective) => objective.completed).length;

  fill(4, 3, 18, 210);
  noStroke();
  rect(0, 0, width, compact ? 82 : 72);
  stroke(0, 220, 240, 90);
  line(0, compact ? 82 : 72, width, compact ? 82 : 72);
  noStroke();

  fill(playerRole === "killer" ? color(255, 60, 120) : color(0, 255, 220));
  textAlign(LEFT, TOP);
  textSize(compact ? 13 : 16);
  text(`${playerRole.toUpperCase()} // ${matchPhase === "ESCAPE" ? "EXTRACTION" : "HUNT"}`, left, 16);
  fill(180, 200, 218);
  textSize(10);
  text(playerRole === "killer" ? "ELIMINATE ALL FOUR SURVIVORS" : "REPAIR FIVE GENERATORS // REACH THE GATE", left, 41);
  textAlign(RIGHT, TOP);
  fill(255, 190, 0);
  text(`OBJECTIVES ${objectiveCount}/5`, width - left, 16);
  fill(180, 200, 218);
  text(`TEAM ${aliveCount}/4  //  SCORE ${score}`, width - left, 40);

  fill(25, 10, 24, 220);
  rect(left, height - 70, barW, 18, 4);
  const hcol = hp > 0.5 ? color(0,255,180) : hp > 0.25 ? color(255,200,0) : color(255,60,60);
  fill(hcol);
  rect(left, height - 70, barW * hp, 18, 4);
  stroke(0, 220, 240, 120);
  noFill();
  rect(left, height - 70, barW, 18, 4);
  noStroke();
  fill(205, 220, 230);
  textAlign(LEFT, BOTTOM);
  textSize(10);
  text(`${playerRole === "killer" ? "KILLER POWER" : "SURVIVOR VITALS"}  ${floor(player.health)} / ${player.maxHealth}`, left + 6, height - 76);

  if (matchResult) {
    fill(playerRole === "killer" ? color(255, 75, 120) : color(0, 255, 180));
    textAlign(CENTER, CENTER);
    textSize(compact ? 13 : 17);
    text(matchResult, width / 2, compact ? 104 : 98);
  }

  if (playerRole === "survivor" && matchPhase === "HUNT") {
    fill(180, 200, 218);
    textAlign(RIGHT, BOTTOM);
    textSize(10);
    text("MOVE  WASD/ARROWS   FIRE  LMB   MELEE  RMB   REPAIR  R", width - left, height - 20);
  } else if (playerRole === "survivor" && matchPhase === "ESCAPE") {
    fill(255, 190, 0);
    textAlign(RIGHT, BOTTOM);
    textSize(10);
    text("GATES POWERED  //  FIND THE EXTRACTION ZONE  //  HOLD R", width - left, height - 20);
  } else if (playerRole === "killer") {
    fill(255, 170, 195);
    textAlign(RIGHT, BOTTOM);
    textSize(10);
    text("HUNT THE TEAM   //   FIRE LMB   //   MELEE RMB   //   DOWN ALL FOUR", width - left, height - 20);
  }
}

function drawAbilityUI() {
  let now=millis(),startX=width-330,y=height-95,sp=78;
  let activeAbilObj=shopItems.find(i=>i.id===currentAbilityId)||{name:"PULSE"};
  let activeName=activeAbilObj.name.replace("STATIC ","").replace("VOID ","").replace("PHASE ","").substring(0,6);
  drawAbilityIcon(startX,    y,"FANGS","LMB",now-lastShot,COOLDOWN_FANGS/upgrades.fireRate,color(0,255,220));
  drawAbilityIcon(startX+sp, y,"BLADE","RMB",now-lastMelee,COOLDOWN_BLADE,color(255,80,255));
  drawAbilityIcon(startX+sp*2,y,activeName,"E",now-lastPulse,COOLDOWN_PULSE,color(100,200,255));
  drawAbilityIcon(startX+sp*3,y,"DASH","SPC",now-dashCooldownEnd,COOLDOWN_DASH,color(180,255,255));
}

function drawAbilityIcon(x,y,name,key,timeSince,cooldown,col) {
  let progress=constrain(timeSince/cooldown,0,1); let ready=progress>=1;
  fill(15); stroke(ready?255:90); strokeWeight(3); rect(x,y,64,64,12);
  fill(ready?col:lerpColor(color(50),col,0.4)); noStroke(); circle(x+32,y+32,40);
  if (!ready) { fill(0,0,0,170); arc(x+32,y+32,54,54,-HALF_PI,-HALF_PI+TWO_PI*progress); }
  fill(255); textAlign(CENTER); textSize(11); text(name,x+32,y+18); textSize(10); text(key,x+32,y+54);
}

/* ==========================================================================
   6. STATE & SHOP LOGIC
========================================================================== */
function createMainMenu() {
  if (gameState !== "MENU" && transitionBuildTarget !== "MENU") {
    beginAreaTransition("MENU", createMainMenu);
    return;
  }
  if (transitionBuildTarget === "MENU") transitionBuildTarget = null;
  stopMenuMusic(); stopRunMusic(); exitShopMusic(); stopSettingsPreview();
  buttons=[]; gameState="MENU";
  startMenuMusic();
  const compact = width < 820;
  let bw = compact ? min(350, width - 44) : min(380, width * 0.29);
  let bh = compact ? 48 : 62;
  let spacing = compact ? 54 : 72;
  let bx = compact ? (width - bw) / 2 : max(44, width * 0.08);
  let startY = compact ? height * 0.40 : height * 0.48;

  buttons.push(new Button(
    bx, startY, bw, bh,
    `▶  START AS ${selectedRole.toUpperCase()}`,
    startSelectedRun,
    selectedRole === "killer" ? color(255, 60, 120) : color(0,255,180),
  ));
  buttons.push(new Button(
    bx, startY + spacing, bw, bh,
    `SWITCH ROLE  //  ${selectedRole === "survivor" ? "KILLER" : "SURVIVOR"}`,
    toggleSelectedRole,
    color(255, 190, 0),
  ));
  buttons.push(new Button(bx,startY+spacing*2,bw,bh,"SELECT OPERATIVE",showHeroSelect,color(0,220,255)));
  buttons.push(new Button(bx,startY+spacing*3,bw,bh,"SHOP",showShop,color(0,200,255)));
  buttons.push(new Button(bx,startY+spacing*4,bw,bh,"INVENTORY",showInventory,color(0,160,200)));
  buttons.push(new Button(bx,startY+spacing*5,bw,bh,"SETTINGS",showSettings,color(180,180,255)));
}

function toggleSelectedRole() {
  selectedRole = selectedRole === "survivor" ? "killer" : "survivor";
  createMainMenu();
}

function startSelectedRun() {
  playerRole = selectedRole;
  startNewRun();
}

function showHeroSelect() {
  if (gameState !== "HERO_SELECT" && transitionBuildTarget !== "HERO_SELECT") {
    beginAreaTransition("HERO_SELECT", showHeroSelect);
    return;
  }
  if (transitionBuildTarget === "HERO_SELECT") transitionBuildTarget = null;
  stopMenuMusic(); stopRunMusic(); stopShopMusic(); stopSettingsPreview();
  buttons=[]; gameState="HERO_SELECT";
  let lx=50, panelW=min(860,width-lx*2);
  let slotH=100, slotGap=12, cols=2, colW=(panelW-10)/cols;
  let topY=70;

  buttons.push(new Button(width-180,18,155,36,"← MAIN MENU",createMainMenu,color(145)));

  let col=0, row=0;
  for (let i=0;i<heroSlots.length;i++) {
    let h=heroSlots[i];
    let cx2=lx+col*(colW+10);
    let cy2=topY+row*(slotH+slotGap);
    if (!h.locked) {
      let hid=h.id;
      let btn=new Button(cx2,cy2,colW,slotH,"",()=>{ selectedHeroId=hid; showHeroSelect(); },color(0,200,255));
      btn.text=""; buttons.push(btn);
    }
    col++; if (col>=cols){col=0;row++;}
  }
}

function toggleMusic() {
  if (musicStarted) {
    musicStarted = false;
    stopMenuMusic(); stopRunMusic(); stopShopMusic();
  } else {
    musicStarted = true;
    if (gameState === "MENU") startMenuMusic();
    if (gameState === "PLAYING") startRunMusic();
  }
  showSettings();
}

function getMusicTrack(id) {
  return musicLibrary.find(track => track.id === id);
}

function loadMusicTrack(track, onReady) {
  if (!track) return;
  if (track.sound || track.loading) {
    if (onReady) {
      track.readyCallbacks = track.readyCallbacks || [];
      if (track.sound && track.sound.isLoaded && track.sound.isLoaded()) onReady();
      else track.readyCallbacks.push(onReady);
    }
    return;
  }
  track.loading = true;
  track.readyCallbacks = onReady ? [onReady] : [];
  track.sound = loadSound(
    track.file,
    () => {
      track.loading = false;
      const callbacks = track.readyCallbacks || [];
      track.readyCallbacks = [];
      callbacks.forEach(callback => callback());
    },
    (error) => {
      track.loading = false;
      track.sound = null;
      track.readyCallbacks = [];
      console.warn(`${track.title} could not be loaded.`, error);
    },
  );
}

function isMusicTrackReady(sound) {
  return !!sound && typeof sound.isLoaded === "function" && sound.isLoaded();
}

function fadeStopSound(sound, resetVolume = bgMusicVolume) {
  if (!sound) return;
  if (sound.isPlaying()) {
    sound.setVolume(0, 0.22);
    setTimeout(() => {
      if (sound.isPlaying()) sound.pause();
      sound.setVolume(resetVolume);
    }, 260);
  }
}

function startMenuMusic() {
  if (!musicStarted || gameState !== "MENU") return;
  if (!menuMusic) {
    loadMusicTrack(getMusicTrack("menu"), () => { menuMusic = getMusicTrack("menu").sound; startMenuMusic(); });
    return;
  }
  if (!isMusicTrackReady(menuMusic)) return;
  if (!menuMusic.isPlaying()) {
    menuMusic.loop();
    menuMusic.setVolume(0);
    menuMusic.setVolume(bgMusicVolume, 0.35);
  }
}

function stopMenuMusic() {
  fadeStopSound(menuMusic);
}

function startRunMusic() {
  if (!musicStarted || gameState !== "PLAYING") return;
  if (!bgMusic) {
    loadMusicTrack(getMusicTrack("run"), () => { bgMusic = getMusicTrack("run").sound; startRunMusic(); });
    return;
  }
  if (!isMusicTrackReady(bgMusic)) return;
  if (!bgMusic.isPlaying()) {
    bgMusic.loop();
    bgMusic.setVolume(0);
    bgMusic.setVolume(bgMusicVolume, 0.35);
  }
}

function stopRunMusic() {
  fadeStopSound(bgMusic);
}

function enterShopMusic() {
  stopMenuMusic();
  stopRunMusic();
  stopSettingsPreview();
  wasBgMusicPlayingBeforeShop = false;
  const shopTrack = getMusicTrack("shop");
  if (!shopMusic) {
    loadMusicTrack(shopTrack, () => { shopMusic = shopTrack.sound; enterShopMusic(); });
    return;
  }
  if (!isMusicTrackReady(shopMusic)) return;
  if (!shopMusic.isPlaying() && gameState === "SHOP") {
    shopMusic.loop();
    shopMusic.setVolume(0);
    shopMusic.setVolume(bgMusicVolume, 0.35);
  }
}

function exitShopMusic() {
  stopShopMusic();
  wasBgMusicPlayingBeforeShop = false;
}

function stopShopMusic() {
  fadeStopSound(shopMusic);
}

function startDeathMusic() {
  if (gameState !== "DEATH") return;
  if (!deathTrack.sound) {
    loadMusicTrack(deathTrack, startDeathMusic);
    return;
  }
  if (!isMusicTrackReady(deathTrack.sound)) return;
  if (!deathTrack.sound.isPlaying()) {
    deathTrack.sound.loop();
    deathTrack.sound.setVolume(0);
    deathTrack.sound.setVolume(bgMusicVolume, 0.35);
  }
}

function stopDeathMusic() {
  fadeStopSound(deathTrack.sound);
}

function stopSettingsPreview() {
  if (settingsPreviewTrackId) {
    const track = getMusicTrack(settingsPreviewTrackId);
    if (track && track.sound) fadeStopSound(track.sound);
  }
  settingsPreviewTrackId = null;
}

function previewSettingsMusic(id) {
  const track = getMusicTrack(id);
  if (!track) return;
  settingsMusicSelectedId = id;
  if (settingsPreviewTrackId === id && track.sound && track.sound.isPlaying()) {
    stopSettingsPreview();
    showSettings();
    return;
  }
  stopMenuMusic(); stopRunMusic(); stopShopMusic(); stopSettingsPreview();
  const startPreview = () => {
    if (gameState !== "SETTINGS" || !isMusicTrackReady(track.sound)) return;
    if (typeof userStartAudio === "function") userStartAudio();
    track.sound.loop();
    track.sound.setVolume(0);
    track.sound.setVolume(bgMusicVolume, 0.25);
    settingsPreviewTrackId = id;
    showSettings(true);
  };
  if (track.sound) startPreview();
  else loadMusicTrack(track, startPreview);
}

function selectSettingsMusic(delta) {
  const tracks=getSettingsMusicTracks();
  if (!tracks.length) return;
  let current=tracks.findIndex(track=>track.id===settingsMusicSelectedId);
  if (current<0) current=0;
  current=(current+delta+tracks.length)%tracks.length;
  settingsMusicSelectedId=tracks[current].id;
  settingsMusicScroll=constrain(current,0,max(0,tracks.length-SETTINGS_MUSIC_VISIBLE_ROWS));
  showSettings(true);
}

function showSettings() {
  let preservePreview = arguments[0] === true;
  if (gameState !== "SETTINGS" && transitionBuildTarget !== "SETTINGS") {
    beginAreaTransition("SETTINGS", showSettings);
    return;
  }
  if (transitionBuildTarget === "SETTINGS") transitionBuildTarget = null;
  stopMenuMusic(); stopRunMusic(); stopShopMusic();
  if (!preservePreview) stopSettingsPreview();
  buttons=[]; gameState="SETTINGS";
  let cx=width/2,cy=height/2;
  let pw=min(900,width-40),ph=min(650,height-24);
  let px=cx-pw/2,py=cy-ph/2;
  let midX=px+pw/2,lx=px+24,ox=midX+18,optW=pw/2-34,topY=py+70;

  buttons.push(new Button(px+pw-124,py+10,110,32,"← BACK",createMainMenu,color(140)));

  let bindingDefs=[
    {label:"Move Up",   action:"moveUp"},  {label:"Move Down", action:"moveDown"},
    {label:"Move Left", action:"moveLeft"},{label:"Move Right",action:"moveRight"},
    {label:"Dash",      action:"dash"},    {label:"Ability",   action:"ability"},
    {label:"Pause",     action:"pause"},
  ];
  let ky=topY+28;
  for (let def of bindingDefs) {
    let ac=def.action;
    let btn=new Button(lx,ky,78,24,keyCodeToName(keyBindings[ac]),()=>{rebindingKey=ac;},color(0,160,210));
    btn.rebindAction=ac; btn.rebindLabel=def.label; buttons.push(btn); ky+=32;
  }

  let halfW=floor((optW-10)/2),dispY=topY+26;
  buttons.push(new Button(ox,dispY,halfW,34,"FULLSCREEN",toggleEngineFullscreen,color(0,255,180)));
  buttons.push(new Button(ox+halfW+10,dispY,halfW,34,screenShakeEnabled?"SHAKE: ON":"SHAKE: OFF",toggleShakeEffect,color(0,180,255)));

  let audioY=topY+100;
  let isPlaying=!!(musicLibrary.find(track=>track.sound&&track.sound.isPlaying()));
  let musicLabel=!musicStarted?"▶  ENABLE MUSIC":isPlaying?"▮▮  MUSIC ACTIVE":"■  MUSIC DISABLED";
  let musicCol=isPlaying?color(255,80,255):(!musicStarted?color(0,200,160):color(100,45,100));
  buttons.push(new Button(ox,audioY+26,optW,34,musicLabel,toggleMusic,musicCol));

  let slStartY=audioY+102;
  musicSlider=new Slider(ox,slStartY,      optW,0,1,bgMusicVolume,"Music Volume","MUSIC");
  sfxSlider  =new Slider(ox,slStartY+62,  optW,0,1,sfxVolume,    "SFX Volume",  "SFX");
  menuSlider =new Slider(ox,slStartY+124, optW,0,1,menuVolume,   "UI Sounds",   "MENU");

  // The player is deliberately built from buttons so it remains usable on
  // the same canvas as the original p5 menus.
  let playerY=py+ph-174;
  let tabW=floor((optW-18)/4);
  for (let i=0;i<musicTabs.length;i++) {
    let tab=musicTabs[i];
    buttons.push(new Button(ox+i*(tabW+6),playerY+22,tabW,24,tab.label,()=>{
      settingsMusicTab=tab.id; settingsMusicScroll=0; showSettings();
    },settingsMusicTab===tab.id?color(255,80,210):color(0,150,200)));
  }
  buttons.push(new Button(ox,playerY+52,78,24,"← PREV",()=>selectSettingsMusic(-1),color(0,180,220)));
  buttons.push(new Button(ox+optW-78,playerY+52,78,24,"NEXT →",()=>selectSettingsMusic(1),color(0,180,220)));

  let visibleTracks=getSettingsMusicTracks();
  let start=settingsMusicScroll;
  for (let i=0;i<min(SETTINGS_MUSIC_VISIBLE_ROWS,visibleTracks.length-start);i++) {
    let track=visibleTracks[start+i];
    let rowY=playerY+84+i*28;
    let isPreviewing=settingsPreviewTrackId===track.id;
    buttons.push(new Button(ox+optW-76,rowY,76,22,isPreviewing?"STOP":"PREVIEW",()=>previewSettingsMusic(track.id),isPreviewing?color(255,80,210):color(0,220,170)));
  }
}

function showShop() {
  if (gameState !== "SHOP" && transitionBuildTarget !== "SHOP") {
    beginAreaTransition("SHOP", showShop);
    return;
  }
  if (transitionBuildTarget === "SHOP") transitionBuildTarget = null;
  let wasAlreadyInShop = gameState === "SHOP";
  buttons=[]; gameState="SHOP";
  if (!wasAlreadyInShop) enterShopMusic();
  let lx=40, topY=70;
  let colW=(width-lx*2-30)/4;

  buttons.push(new Button(width-180,18,155,36,"← MAIN MENU",createMainMenu,color(145)));
  buttons.push(new Button(width-350,18,155,36,"INVENTORY",showInventory,color(0,180,200)));

  let cats=[
    {label:"CHASSIS",  items:shopItems.filter(i=>i.type==="CHASSIS")  },
    {label:"WEAPON",   items:shopItems.filter(i=>i.type==="WEAPON")   },
    {label:"ABILITY",  items:shopItems.filter(i=>i.type==="ABILITY")  },
    {label:"UPGRADES", items:shopItems.filter(i=>i.type==="UPGRADE")  },
  ];

  for (let ci=0;ci<cats.length;ci++) {
    let cat=cats[ci];
    let cx2=lx+ci*(colW+10);
    let cardY=topY+32;

    for (let item of cat.items) {
      let isOwned   =item.bought;
      let isUpgrade =item.type==="UPGRADE";
      let lvl       =isUpgrade?(upgradeLevels[item.upgradeKey]||0):0;
      let maxLvl    =5;
      let upgCost   =isUpgrade?floor(item.cost*(1+lvl*0.45)):item.cost;
      let canAfford =crystalis>=(isUpgrade?upgCost:item.cost);
      let cardH     =isUpgrade?95:110;
      let masterIdx =shopItems.indexOf(item);

      let btnText,btnColor,btnAction;
      if (isUpgrade) {
        if (lvl>=maxLvl)  { btnText="MAXED"; btnColor=color(100,255,100); btnAction=null; }
        else if (canAfford){ btnText=`UPGRADE  ${upgCost}`; btnColor=color(255,185,0); btnAction=()=>executeUpgradeAction(masterIdx); }
        else               { btnText=`${upgCost} CR`; btnColor=color(55); btnAction=null; }
      } else if (!isOwned) {
        btnText=canAfford?`BUY  ${item.cost}`:`${item.cost} CR`;
        btnColor=canAfford?color(255,185,0):color(55);
        btnAction=canAfford?()=>executeCheckoutAction(masterIdx):null;
      } else {
        btnText="OWNED"; btnColor=color(0,180,255,160); btnAction=null;
      }

      let btn=new Button(cx2+8,cardY+cardH-36,colW-16,28,btnText,btnAction,btnColor);
      btn.attachedItem=item; buttons.push(btn);
      cardY+=cardH+10;
    }
  }
}

function showInventory() {
  if (gameState !== "INVENTORY" && transitionBuildTarget !== "INVENTORY") {
    beginAreaTransition("INVENTORY", showInventory);
    return;
  }
  if (transitionBuildTarget === "INVENTORY") transitionBuildTarget = null;
  stopMenuMusic(); stopRunMusic(); stopSettingsPreview();
  exitShopMusic();
  buttons=[]; gameState="INVENTORY"; hoveredItemStats=null;
  let lx=60,rw=260,rx=width-rw-60;
  let lw=260,mx=lx+lw+24,mw=rx-mx-20,topY=88;
  let cardH=100,secLabelH=26,secGap=18;

  buttons.push(new Button(lx,20,130,36,"← MAIN MENU",createMainMenu,color(145)));
  buttons.push(new Button(lx+145,20,130,36,"SHOP",showShop,color(0,200,255)));
  buttons.push(new Button(width-220,20,185,36,"⚡ TEST RANGE",enterSandboxRange,color(255,120,0)));

  let eqCats=[
    {label:"CHASSIS",  items:shopItems.filter(i=>i.type==="CHASSIS" &&i.bought)},
    {label:"WEAPON",   items:shopItems.filter(i=>i.type==="WEAPON"  &&i.bought)},
    {label:"ABILITY",  items:shopItems.filter(i=>i.type==="ABILITY" &&i.bought)},
  ];

  let sectionY=topY;
  for (let ci=0;ci<eqCats.length;ci++) {
    let cat=eqCats[ci]; let n=cat.items.length;
    let cw=n>0?floor((mw-(n-1)*10)/n):mw;
    let cardRowY=sectionY+secLabelH;
    for (let i=0;i<n;i++) {
      let item=cat.items[i];
      let masterIdx=shopItems.indexOf(item);
      let isEquipped=(currentSkinId===item.id||currentWeaponId===item.id||currentAbilityId===item.id);
      let baseX=mx+i*(cw+10);
      let btnText=isEquipped?"EQUIPPED":"EQUIP";
      let btnColor=isEquipped?color(80,210,110):color(0,220,255);
      let btnAction=isEquipped?null:()=>executeEquipmentAction(masterIdx);
      let btn=new Button(baseX+8,cardRowY+cardH-36,cw-16,28,btnText,btnAction,btnColor);
      btn.attachedItem=item; buttons.push(btn);
    }
    sectionY+=secLabelH+cardH+secGap;
  }
}

function startNewRun() {
  if (gameState !== "PLAYING" && transitionBuildTarget !== "PLAYING") {
    beginAreaTransition("PLAYING", startNewRun, true);
    return;
  }
  if (transitionBuildTarget === "PLAYING") transitionBuildTarget = null;
  stopMenuMusic(); stopShopMusic(); stopSettingsPreview();
  buttons=[]; gameState="PLAYING"; paused=false; resetGame(); startRunMusic();
}

function resetGame() {
  recomputeUpgrades();
  bullets=[]; particles=[];
  wave=1; score=0; showWaveComplete=false; gameOverState=false;
  matchPhase="HUNT";
  matchResult="";
  lastShot=lastMelee=lastPulse=dashCooldownEnd=0; lastDamageTime=-999999;
  computeActiveSynergyProfiles();
  setupMatchRoles();
}

function executeCheckoutAction(index) {
  let item=shopItems[index];
  if (!item||crystalis<item.cost) return;
  crystalis-=item.cost; item.bought=true; showShop();
}

function executeUpgradeAction(index) {
  let item=shopItems[index];
  if (!item||item.type!=="UPGRADE") return;
  let lvl=upgradeLevels[item.upgradeKey]||0;
  let cost=floor(item.cost*(1+lvl*0.45));
  if (crystalis<cost||lvl>=5) return;
  crystalis-=cost;
  upgradeLevels[item.upgradeKey]=(lvl+1);
  recomputeUpgrades();
  showShop();
}

function executeEquipmentAction(index) {
  let item=shopItems[index];
  if (!item) return;
  if (item.type==="CHASSIS") { currentSkinId=item.id; currentSkinColor=item.color; }
  else if (item.type==="WEAPON")  currentWeaponId=item.id;
  else if (item.type==="ABILITY") currentAbilityId=item.id;
  showInventory();
}

function computeActiveSynergyProfiles() {
  if (currentSkinId==="skin_crimson"&&currentWeaponId==="weap_burst")
    activeSynergyText="BURNT PLASMA V.2 (+15% RAPID FIRE)";
  else if (currentSkinId==="skin_gold"&&currentAbilityId==="abil_nova")
    activeSynergyText="AURELIAN SINGULARITY (+20% DAMAGE)";
  else if (currentSkinId==="skin_void"&&currentAbilityId==="abil_blink")
    activeSynergyText="VOID STEP (+25% BLINK RANGE)";
  else
    activeSynergyText="NONE DETECTED // MATRIX OFFLINE";
}

function enterSandboxRange() {
  if (gameState !== "TEST_RANGE" && transitionBuildTarget !== "TEST_RANGE") {
    beginAreaTransition("TEST_RANGE", enterSandboxRange);
    return;
  }
  if (transitionBuildTarget === "TEST_RANGE") transitionBuildTarget = null;
  stopMenuMusic(); stopRunMusic(); stopShopMusic(); stopSettingsPreview();
  buttons=[]; gameState="TEST_RANGE";
  sandboxBackup.wave=wave; sandboxBackup.score=score; sandboxBackup.crystalis=crystalis;
  setupSandboxEnvironment();
}
function setupSandboxEnvironment() {
  recomputeUpgrades();
  buttons=[];
  buttons.push(new Button(width-220,40,170,45,"← INVENTORY",exitSandboxRange,color(255,50,100)));
  player=new Spectre(width/3,height/2);
  trainingDummy=new TrainingDummy(width*0.68,height/2);
  bullets=[]; particles=[];
}
function exitSandboxRange() {
  wave=sandboxBackup.wave; score=sandboxBackup.score; crystalis=sandboxBackup.crystalis;
  showInventory();
}

function toggleEngineFullscreen() { let fs=fullscreen(); fullscreen(!fs); }
function toggleShakeEffect() { screenShakeEnabled=!screenShakeEnabled; showSettings(); }
function terminateRuntimeRun() { paused=false; buttons=[]; createMainMenu(); }

/* ==========================================================================
   7. INPUT HANDLING
========================================================================== */
function mouseClicked() {
  if (gameState === "LOADING") {
    if (loadingTransition && loadingTransition.showSpawnPrompt) {
      if (typeof userStartAudio === "function") userStartAudio();
      finishAreaTransition();
    }
    return false;
  }

  // A button click is the browser's user gesture: use it to unlock audio,
  // then let the action below move to the next scoped screen.
  if (gameState === "MENU") {
    if (typeof userStartAudio === "function") userStartAudio();
    if (!musicStarted) musicStarted = true;
    startMenuMusic();
  }
  for (let b of buttons) {
    if (mouseX>=b.x&&mouseX<=b.x+b.w&&mouseY>=b.y&&mouseY<=b.y+b.h) { b.clicked(); return false; }
  }
}

function mousePressed() {
  if ((gameState==="PLAYING"||gameState==="TEST_RANGE")&&!paused&&mouseButton===RIGHT)
    player.spectreBlade();
  if (gameState==="SETTINGS") {
    if (musicSlider&&musicSlider.hovered) musicSlider.dragging=true;
    if (sfxSlider&&sfxSlider.hovered)    sfxSlider.dragging=true;
    if (menuSlider&&menuSlider.hovered)  menuSlider.dragging=true;
  }
}

function mouseReleased() {
  if (musicSlider) musicSlider.dragging=false;
  if (sfxSlider)   sfxSlider.dragging=false;
  if (menuSlider)  menuSlider.dragging=false;
}

function keyPressed() {
  if (rebindingKey!==null) {
    keyBindings[rebindingKey]=keyCode; rebindingKey=null; showSettings(); return false;
  }
  keys[key]=true;
  if (gameState==="PLAYING"||gameState==="TEST_RANGE") {
    if (!paused) {
      if (keyCode===keyBindings.dash)    player.dash();
      if (keyCode===keyBindings.ability) player.useEquippedAbility();
    }
    if (gameState==="PLAYING"&&(keyCode===keyBindings.pause||keyCode===ESCAPE)) togglePause();
  }
}

function keyReleased() { keys[key]=false; }

function togglePause() {
  if (gameState!=="PLAYING") return;
  paused=!paused;
  if (paused) {
    buttons=[];
    buttons.push(new Button(width/2-155,height/2-65,310,70,"CONTINUE",()=>{paused=false;buttons=[];},color(0,255,180)));
    buttons.push(new Button(width/2-155,height/2+20,310,70,"SHOP",()=>{paused=false;showShop();},color(0,200,255)));
    buttons.push(new Button(width/2-155,height/2+105,310,70,"TERMINATE RUN",terminateRuntimeRun,color(255,80,80)));
  } else buttons=[];
}

function mouseWheel(event) {
  if (gameState==="SETTINGS") {
    let tracks=getSettingsMusicTracks();
    let maxScroll=max(0,tracks.length-SETTINGS_MUSIC_VISIBLE_ROWS);
    settingsMusicScroll=constrain(settingsMusicScroll+(event.delta>0?1:-1),0,maxScroll);
    showSettings(true);
    return false;
  }
  if (gameState==="INVENTORY") {
    if (mouseY>300&&mouseY<500) return false;
  }
}
