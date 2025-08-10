// Paths to game assets
const assets = [
  "assets/player.svg",
  "assets/enemy.svg",
  "assets/road.svg"
];

let loadedCount = 0;
const totalAssets = assets.length;

// UI elements
const progressFill = document.getElementById("progress-fill");
const progressText = document.getElementById("progress-text");
const preloadOverlay = document.getElementById("preload");
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const images = {};

// Load each asset
assets.forEach(path => {
  const img = new Image();
  img.src = path;
  img.onload = () => {
    loadedCount++;
    images[path] = img;
    updateProgress();
    if (loadedCount === totalAssets) {
      startGame();
    }
  };
  img.onerror = () => {
    console.error("Failed to load:", path);
    loadedCount++;
    updateProgress();
    if (loadedCount === totalAssets) {
      startGame();
    }
  };
});

function updateProgress() {
  const percent = Math.floor((loadedCount / totalAssets) * 100);
  progressFill.style.width = percent + "%";
  progressText.textContent = percent + "%";
}

function startGame() {
  // Hide preload overlay
  preloadOverlay.classList.add("hidden");

  // Example: draw the road and player in the middle
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw road
  const road = images["assets/road.svg"];
  ctx.drawImage(road, 0, 0, canvas.width, canvas.height);

  // Draw player car
  const player = images["assets/player.svg"];
  const playerWidth = 80;
  const playerHeight = 160;
  ctx.drawImage(
    player,
    (canvas.width - playerWidth) / 2,
    canvas.height - playerHeight - 20,
    playerWidth,
    playerHeight
  );
}
