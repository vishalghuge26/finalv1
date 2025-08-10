// game.js

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// HUD elements
const scoreEl = document.getElementById('score-val');
const highEl = document.getElementById('high-val');
const finalScoreEl = document.getElementById('final-score');

// Buttons
const leftBtn = document.getElementById('left-btn');
const rightBtn = document.getElementById('right-btn');
const restartBtn = document.getElementById('restart-btn');
const pauseBtn = document.getElementById('pause-btn');

// Overlays
const overlay = document.getElementById('overlay');
const preload = document.getElementById('preload');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');

let score = 0;
let highscore = parseInt(localStorage.getItem('highscore') || 0);
let gameOver = false;
let paused = false;

// Game settings
const laneCount = 4;
const laneWidth = canvas.width / laneCount;
let playerLane = 1;
const playerY = canvas.height - 150;

// Sprite sizing (keep proportions)
const CAR_WIDTH = laneWidth * 0.8; 
const CAR_HEIGHT = CAR_WIDTH * 2; // 1:2 ratio
const COIN_SIZE = laneWidth * 0.5;

// Assets
let assets = {};
const assetList = [
    { name: 'road', src: 'assets/road.svg' },
    { name: 'player', src: 'assets/player.svg' },
    { name: 'enemy', src: 'assets/enemy.svg' },
    { name: 'coin', src: 'assets/coin.svg' }
];

// Enemy & coin objects
let enemies = [];
let coins = [];
const enemySpeed = 4;
const coinSpeed = 4;

// Interval trackers
let enemyInterval, coinInterval;

// Preload images
function loadAssets(list, callback) {
    let loaded = 0;
    list.forEach(asset => {
        const img = new Image();
        img.src = asset.src;
        img.onload = () => {
            loaded++;
            progressFill.style.width = `${(loaded / list.length) * 100}%`;
            progressText.textContent = `${Math.round((loaded / list.length) * 100)}%`;
            if (loaded === list.length) callback();
        };
        assets[asset.name] = img;
    });
}

// Spawn enemies
function spawnEnemy() {
    const lane = Math.floor(Math.random() * laneCount);
    enemies.push({ lane: lane, y: -CAR_HEIGHT });
}

// Spawn coins
function spawnCoin() {
    const lane = Math.floor(Math.random() * laneCount);
    coins.push({ lane: lane, y: -COIN_SIZE });
}

// Draw player
function drawPlayer() {
    const x = playerLane * laneWidth + (laneWidth - CAR_WIDTH) / 2;
    ctx.drawImage(assets.player, x, playerY, CAR_WIDTH, CAR_HEIGHT);
}

// Draw enemies
function drawEnemies() {
    enemies.forEach(enemy => {
        const x = enemy.lane * laneWidth + (laneWidth - CAR_WIDTH) / 2;
        ctx.drawImage(assets.enemy, x, enemy.y, CAR_WIDTH, CAR_HEIGHT);
    });
}

// Draw coins
function drawCoins() {
    coins.forEach(coin => {
        const x = coin.lane * laneWidth + (laneWidth - COIN_SIZE) / 2;
        ctx.drawImage(assets.coin, x, coin.y, COIN_SIZE, COIN_SIZE);
    });
}

// Update game objects
function update() {
    if (paused || gameOver) return;

    enemies.forEach(enemy => {
        enemy.y += enemySpeed;
        if (enemy.y > canvas.height) enemies.splice(enemies.indexOf(enemy), 1);

        // Collision with player
        if (
            enemy.lane === playerLane &&
            enemy.y + CAR_HEIGHT > playerY &&
            enemy.y < playerY + CAR_HEIGHT
        ) {
            endGame();
        }
    });

    coins.forEach(coin => {
        coin.y += coinSpeed;
        if (coin.y > canvas.height) coins.splice(coins.indexOf(coin), 1);

        // Coin collection
        if (
            coin.lane === playerLane &&
            coin.y + COIN_SIZE > playerY &&
            coin.y < playerY + CAR_HEIGHT
        ) {
            score += 10;
            coins.splice(coins.indexOf(coin), 1);
            updateScore();
        }
    });
}

// Draw road background
function drawRoad() {
    ctx.drawImage(assets.road, 0, 0, canvas.width, canvas.height);
}

// Render loop
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawRoad();
    drawCoins();
    drawEnemies();
    drawPlayer();
}

// Game loop
function loop() {
    update();
    render();
    requestAnimationFrame(loop);
}

// Controls
function moveLeft() {
    if (playerLane > 0) playerLane--;
}
function moveRight() {
    if (playerLane < laneCount - 1) playerLane++;
}

document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'a') moveLeft();
    if (e.key === 'ArrowRight' || e.key === 'd') moveRight();
});

// Button clicks
leftBtn.addEventListener('click', moveLeft);
rightBtn.addEventListener('click', moveRight);
pauseBtn.addEventListener('click', () => paused = !paused);
restartBtn.addEventListener('click', startGame);

// Tap screen controls
canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < canvas.width / 2) {
        moveLeft();
    } else {
        moveRight();
    }
});

function updateScore() {
    scoreEl.textContent = score;
    if (score > highscore) {
        highscore = score;
        localStorage.setItem('highscore', highscore);
        highEl.textContent = highscore;
    }
}

function endGame() {
    gameOver = true;
    overlay.classList.remove('hidden');
    finalScoreEl.textContent = score;

    // Stop spawning
    clearInterval(enemyInterval);
    clearInterval(coinInterval);
}

function startGame() {
    enemies = [];
    coins = [];
    score = 0;
    playerLane = 1;
    updateScore();
    gameOver = false;
    paused = false;
    overlay.classList.add('hidden');

    // Clear old timers before setting new ones
    clearInterval(enemyInterval);
    clearInterval(coinInterval);

    // Spawn timers
    enemyInterval = setInterval(spawnEnemy, 1500);
    coinInterval = setInterval(spawnCoin, 2000);
}

// Start after assets load
loadAssets(assetList, () => {
    preload.classList.add('hidden');
    highEl.textContent = highscore;
    startGame();
    loop();
});
