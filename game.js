const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highscore");

const loadingScreen = document.getElementById("loading-screen");
const loadingProgress = document.getElementById("loading-progress");
const startScreen = document.getElementById("start-screen");
const countdownEl = document.getElementById("countdown");
const countdownText = document.getElementById("countdown-text");
const gameOverScreen = document.getElementById("game-over");
const finalScoreEl = document.getElementById("final-score");

const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const leftBtn = document.getElementById("left-btn");
const rightBtn = document.getElementById("right-btn");

const assets = {
  images: {
    road: "assets/road.svg",
    player: "assets/player.svg",
    enemy: "assets/enemy.svg",
    coin: "assets/coin.svg"
  },
  sounds: {}
};

let loadedAssets = {};
let gameRunning = false;
let score = 0;
let highScore = parseInt(localStorage.getItem("highscore") || "0");
let playerLane = 1;
let speed = 2;
let entities = [];
let spawnTimer = 0;
let laneX = [48, 96, 144, 192];

// Load images
function loadAssets() {
  return new Promise(resolve => {
    const total = Object.keys(assets.images).length;
    let loaded = 0;

    for (let key in assets.images) {
      const img = new Image();
      img.src = assets.images[key];
      img.onload = () => {
        loadedAssets[key] = img;
        loaded++;
        loadingProgress.style.width = ((loaded / total) * 100) + "%";
        if (loaded === total) resolve();
      };
    }
  });
}

// Game loop
function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(loadedAssets.road, 0, 0);

  entities.forEach(ent => {
    ent.y += speed;
    ctx.drawImage(loadedAssets[ent.type], laneX[ent.lane], ent.y);
  });

  entities = entities.filter(ent => ent.y < canvas.height + 50);

  if (gameRunning) {
    spawnTimer -= 1;
    if (spawnTimer <= 0) {
      let type = Math.random() < 0.15 ? "coin" : "enemy";
      entities.push({
        type: type,
        lane: Math.floor(Math.random() * 4),
        y: -50
      });
      spawnTimer = 50 + Math.random() * 30;
    }

    score++;
    if (score % 500 === 0) speed += 0.5;
    scoreEl.textContent = "Score: " + score;
    highScoreEl.textContent = "High: " + highScore;

    // Collision
    entities.forEach(ent => {
      if (ent.lane === playerLane && ent.y > 400 && ent.y < 450) {
        if (ent.type === "enemy") {
          endGame();
        } else if (ent.type === "coin") {
          score += 100;
          ent.y = canvas.height + 100;
        }
      }
    });
  }

  ctx.drawImage(loadedAssets.player, laneX[playerLane], 420);
  requestAnimationFrame(update);
}

function startGame() {
  score = 0;
  speed = 2;
  entities = [];
  playerLane = 1;
  gameRunning = true;
}

function endGame() {
  gameRunning = false;
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("highscore", highScore);
  }
  finalScoreEl.textContent = "Final Score: " + score;
  gameOverScreen.style.display = "flex";
}

function showCountdown() {
  let count = 3;
  countdownEl.style.display = "flex";
  countdownText.textContent = count;
  let interval = setInterval(() => {
    count--;
    if (count > 0) {
      countdownText.textContent = count;
    } else {
      clearInterval(interval);
      countdownEl.style.display = "none";
      startGame();
    }
  }, 1000);
}

// Controls
document.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft" && playerLane > 0) playerLane--;
  if (e.key === "ArrowRight" && playerLane < 3) playerLane++;
});
leftBtn.addEventListener("click", () => {
  if (playerLane > 0) playerLane--;
});
rightBtn.addEventListener("click", () => {
  if (playerLane < 3) playerLane++;
});
startBtn.addEventListener("click", () => {
  startScreen.style.display = "none";
  showCountdown();
});
restartBtn.addEventListener("click", () => {
  gameOverScreen.style.display = "none";
  showCountdown();
});

// Init
loadAssets().then(() => {
  loadingScreen.style.display = "none";
  startScreen.style.display = "flex";
  highScoreEl.textContent = "High: " + highScore;
  update();
});
