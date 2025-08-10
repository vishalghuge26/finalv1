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
const muteBtn = document.getElementById('mute-btn');

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
    enemies.push({ lane: lane, y: -100 });
}

// Spawn coins
function spawnCoin() {
    const lane = Math.floor(Math.random() * laneCount);
    coins.push({ lane: lane, y: -50 });
}

// Draw player
function drawPlayer() {
    ctx.drawImage(assets.player, playerLane * laneWidth, playerY, laneWidth, 100);
}

// Draw enemies
function drawEnemies() {
    enemies.forEach(enemy => {
        ctx.drawImage(assets.enemy, enemy.lane * laneWidth, enemy.y, laneWidth, 100);
    });
}

// Draw coins
function drawCoins() {
    coins.forEach(coin => {
        ctx.drawImage(assets.coin, coin.lane * laneWidth + laneWidth / 4, coin.y, laneWidth / 2, laneWidth / 2);
    });
}

// Update game objects
function update() {
    if (paused || gameOver) return;

    enemies.forEach(enemy => {
        enemy.y += enemySpeed;
        if (enemy.y > canvas.height) enemies.splice(enemies.indexOf(enemy), 1);

        // Collision with player
        if (enemy.lane === playerLane && enemy.y + 100 > playerY && enemy.y < playerY + 100) {
            endGame();
        }
    });

    coins.forEach(coin => {
        coin.y += coinSpeed;
        if (coin.y > canvas.height) coins.splice(coins.indexOf(coin), 1);

        // Coin collection
        if (coin.lane === playerLane && coin.y + 50 > playerY && coin.y < playerY + 100) {
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

leftBtn.addEventListener('click', moveLeft);
rightBtn.addEventListener('click', moveRight);

pauseBtn.addEventListener('click', () => paused = !paused);

restartBtn.addEventListener('click', startGame);

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

    // Spawn timers
    setInterval(spawnEnemy, 1500);
    setInterval(spawnCoin, 2000);
}

// Start after assets load
loadAssets(assetList, () => {
    preload.classList.add('hidden');
    highEl.textContent = highscore;
    startGame();
    loop();
});
