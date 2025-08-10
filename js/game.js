/**
 * js/game.js
 * 4-Lane Car Dodger - Vanilla JS
 *
 * Tweakable constants at top (CONFIG).
 * Uses canvas + Image objects; assets are loaded from separate files in /assets.
 */

/* ============================
   CONFIG - tweak game behavior
   ============================ */
const CONFIG = {
  lanes: 4,
  canvasWidth: 480,
  canvasHeight: 800,
  spawnIntervalMin: 800,   // ms
  spawnIntervalMax: 1200,  // ms
  coinSpawnMin: 6000,      // ms
  coinSpawnMax: 12000,     // ms
  enemyBaseSpeed: 180,     // px/sec
  maxEnemies: 12,
  speedIncreasePer100Score: 0.08, // multiply speed by (1 + score/100 * this)
  coinValue: 25,
  scorePerSecond: 10,      // passive score per second survived
  storageKey: 'carDodger_highscore_v1'
};

/* ============================
   Asset file paths
   ============================ */
const FILES = {
  road: 'assets/road.svg',
  player: 'assets/player.svg',
  enemy: 'assets/enemy.svg',
  coin: 'assets/coin.svg',
  audio: {
    engine: 'assets/audio/engine.ogg',
    coin: 'assets/audio/coin.ogg',
    crash: 'assets/audio/crash.ogg'
  }
};

/* ============================
   Loader
   ============================ */
const loader = {
  total: 0, loaded: 0, images: {}, audio: {},
  updateProgress(){
    const p = (this.loaded / this.total) * 100;
    const fill = document.getElementById('progress-fill');
    const text = document.getElementById('progress-text');
    fill.style.width = `${p}%`;
    text.textContent = `${Math.round(p)}%`;
  },
  loadAll(done){
    const imgKeys = ['road','player','enemy','coin'];
    const audKeys = ['engine','coin','crash'];
    this.total = imgKeys.length + audKeys.length;
    this.loaded = 0;

    imgKeys.forEach(key=>{
      const img = new Image();
      img.onload = ()=>{
        this.images[key]=img; this.loaded++; this.updateProgress();
        if(this.loaded===this.total) done(this.images, this.audio);
      };
      img.onerror = ()=>{ console.warn('Image load failed',key); this.loaded++; this.updateProgress(); if(this.loaded===this.total) done(this.images,this.audio); };
      img.src = FILES[key];
    });

    audKeys.forEach(key=>{
      const a = new Audio();
      a.preload = 'auto';
      a.oncanplaythrough = ()=>{
        this.audio[key]=a; this.loaded++; this.updateProgress();
        if(this.loaded===this.total) done(this.images, this.audio);
      };
      a.onerror = ()=>{ console.warn('Audio load failed', key); this.loaded++; this.updateProgress(); if(this.loaded===this.total) done(this.images,this.audio); };
      a.src = FILES.audio[key];
      a.load();
    });
  }
};

/* ============================
   Basic utilities & Entity class
   ============================ */
function rand(min,max){ return Math.random() * (max-min) + min; }
function randInt(min,max){ return Math.floor(rand(min,max+1)); }

class Entity {
  constructor(x,y,w,h,img,type='enemy'){
    this.x=x; this.y=y; this.w=w; this.h=h; this.img=img; this.type=type;
    this.vy=0; this.dead=false; this.lane=null;
  }
  draw(ctx){ if(this.img) ctx.drawImage(this.img,this.x,this.y,this.w,this.h); else { ctx.fillStyle='red'; ctx.fillRect(this.x,this.y,this.w,this.h); } }
}

/* ============================
   Game class
   ============================ */
class Game {
  constructor(canvas, images, audio){
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.images = images; this.audio = audio;
    this.canvas.width = CONFIG.canvasWidth; this.canvas.height = CONFIG.canvasHeight;

    // lane geometry
    this.lanes = CONFIG.lanes;
    this.laneLeft = 32;
    this.laneRight = this.canvas.width - 32;
    this.laneWidth = (this.laneRight - this.laneLeft) / this.lanes;

    // player
    this.playerW = 64; this.playerH = 128;
    this.playerLane = 1;
    this.player = null;

    // entities
    this.entities = [];

    // timers & score
    this.spawnTimer = 0; this.nextSpawn = rand(CONFIG.spawnIntervalMin, CONFIG.spawnIntervalMax);
    this.nextCoin = rand(CONFIG.coinSpawnMin, CONFIG.coinSpawnMax);
    this.score = 0; this.scoreAcc = 0;
    this.highscore = Number(localStorage.getItem(CONFIG.storageKey) || 0);

    // state
    this.running=false; this.paused=false; this.gameOver=false; this.lastTime=0; this.roadOffset=0; this.muted=false;
    this.background = this.audio.engine;
    if(this.background) this.background.loop = true, this.background.volume = 0.12;

    // UI refs
    this.hudScore = document.getElementById('score-val');
    this.hudHigh = document.getElementById('high-val');
    this.finalScoreEl = document.getElementById('final-score');
    this.hudHigh.textContent = this.highscore;

    this.initPlayer();
    this.attachListeners();
  }

  initPlayer(){
    const x = this.laneCenterX(this.playerLane) - this.playerW/2;
    const y = this.canvas.height - this.playerH - 34;
    this.player = new Entity(x,y,this.playerW,this.playerH,this.images.player,'player');
  }

  laneCenterX(i){ return this.laneLeft + this.laneWidth*i + this.laneWidth/2; }
  laneXForSprite(i,w){ return this.laneCenterX(i) - w/2; }

  attachListeners(){
    window.addEventListener('keydown', (e)=>{
      if(e.key==='ArrowLeft' || e.key==='a' || e.key==='A'){ e.preventDefault(); this.moveLeft(); }
      if(e.key==='ArrowRight' || e.key==='d' || e.key==='D'){ e.preventDefault(); this.moveRight(); }
      if(e.key==='p' || e.key==='P'){ this.togglePause(); }
    });

    const leftBtn = document.getElementById('left-btn');
    const rightBtn = document.getElementById('right-btn');
    leftBtn.addEventListener('touchstart', e=>{ e.preventDefault(); this.moveLeft(); });
    rightBtn.addEventListener('touchstart', e=>{ e.preventDefault(); this.moveRight(); });
    leftBtn.addEventListener('mousedown', e=>{ e.preventDefault(); this.moveLeft(); });
    rightBtn.addEventListener('mousedown', e=>{ e.preventDefault(); this.moveRight(); });

    document.getElementById('pause-btn').addEventListener('click', ()=>this.togglePause());
    document.getElementById('mute-btn').addEventListener('click', ()=>this.toggleMute());
    document.getElementById('restart-btn').addEventListener('click', ()=>this.restart());

    document.addEventListener('visibilitychange', ()=>{
      if(document.hidden) this.pause(true); else this.pause(false);
    });
  }

  moveLeft(){ if(this.playerLane>0){ this.playerLane--; this.player.x = this.laneXForSprite(this.playerLane,this.player.w); this.playSfx('engine',0.02);} }
  moveRight(){ if(this.playerLane<this.lanes-1){ this.playerLane++; this.player.x = this.laneXForSprite(this.playerLane,this.player.w); this.playSfx('engine',0.02);} }

  togglePause(){ this.paused = !this.paused; document.getElementById('pause-btn').textContent = this.paused ? '▶️' : '⏸️'; }
  pause(val){ this.paused = !!val; document.getElementById('pause-btn').textContent = this.paused ? '▶️' : '⏸️'; }
  toggleMute(){ this.muted = !this.muted; document.getElementById('mute-btn').textContent = this.muted ? '🔇' : '🔊'; if(this.background) this.background.muted=this.muted; for(const k in this.audio) if(this.audio[k]) this.audio[k].muted=this.muted; }

  playSfx(key, vol=0.6){
    if(this.muted) return;
    const a = this.audio[key]; if(!a) return;
    try { const clone = a.cloneNode(); clone.volume = vol; clone.play(); } catch(e){ a.currentTime=0; a.volume=vol; a.play(); }
  }

  enemySpeed(){ return CONFIG.enemyBaseSpeed * (1 + (this.score/100) * CONFIG.speedIncreasePer100Score); }

  spawnEnemy(){
    if(this.entities.filter(e=>e.type==='enemy').length >= CONFIG.maxEnemies) return;
    const lane = randInt(0,this.lanes-1);
    const w=64,h=128;
    const x = this.laneXForSprite(lane,w);
    const y = -h - rand(0,120);
    const ent = new Entity(x,y,w,h,this.images.enemy,'enemy');
    ent.vy = this.enemySpeed();
    ent.lane = lane;
    this.entities.push(ent);
  }

  spawnCoin(){
    const lane = randInt(0,this.lanes-1);
    const size = 36;
    const x = this.laneXForSprite(lane,size);
    const y = -size - 10;
    const ent = new Entity(x,y,size,size,this.images.coin,'coin');
    ent.vy = this.enemySpeed() * 0.85;
    ent.lane = lane;
    this.entities.push(ent);
  }

  update(delta){
    if(this.paused || this.gameOver) return;
    this.roadOffset += this.enemySpeed() * (delta/1000);

    this.spawnTimer += delta;
    if(this.spawnTimer >= this.nextSpawn){
      this.spawnEnemy();
      this.spawnTimer = 0;
      this.nextSpawn = rand(CONFIG.spawnIntervalMin, CONFIG.spawnIntervalMax);
    }

    this.nextCoin -= delta;
    if(this.nextCoin <= 0){
      this.spawnCoin();
      this.nextCoin = rand(CONFIG.coinSpawnMin, CONFIG.coinSpawnMax);
    }

    for(const e of this.entities) e.y += e.vy * (delta/1000);
    this.entities = this.entities.filter(e=>e.y < this.canvas.height + 200 && !e.dead);

    for(const e of this.entities){
      if((e.type === 'enemy' || e.type === 'coin') && this.aabbCollide(this.player,e)){
        if(e.type === 'enemy'){ this.endGame(); return; }
        if(e.type === 'coin'){ e.dead=true; this.score += CONFIG.coinValue; this.playSfx('coin',0.6); }
      }
    }

    this.scoreAcc += delta * (CONFIG.scorePerSecond/1000);
    if(this.scoreAcc >= 1){
      const add = Math.floor(this.scoreAcc);
      this.score += add;
      this.scoreAcc -= add;
    }
    this.hudScore.textContent = Math.max(0, Math.floor(this.score));
  }

  aabbCollide(a,b){
    return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
  }

  endGame(){
    if(this.gameOver) return;
    this.gameOver = true; this.running=false;
    this.playSfx('crash',0.6);
    document.getElementById('overlay').classList.remove('hidden');
    document.getElementById('overlay-title').textContent = 'Game Over';
    this.finalScoreEl.textContent = Math.floor(this.score);
    if(this.score > this.highscore){
      this.highscore = Math.floor(this.score);
      localStorage.setItem(CONFIG.storageKey,this.highscore);
      this.hudHigh.textContent = this.highscore;
    }
  }

  restart(){
    document.getElementById('overlay').classList.add('hidden');
    this.entities = []; this.score = 0; this.scoreAcc = 0;
    this.spawnTimer = 0; this.nextSpawn = rand(CONFIG.spawnIntervalMin, CONFIG.spawnIntervalMax);
    this.nextCoin = rand(CONFIG.coinSpawnMin, CONFIG.coinSpawnMax);
    this.gameOver = false; this.playerLane = 1; this.player.x = this.laneXForSprite(this.playerLane,this.player.w);
    this.running = true; this.lastTime = performance.now(); this.loop(this.lastTime);
  }

  drawRoad(){
    const img = this.images.road;
    const iw = img.width, ih = img.height;
    const scale = this.canvas.width / iw;
    const drawH = ih * scale;
    let y = - (this.roadOffset % drawH);
    while(y < this.canvas.height){
      this.ctx.drawImage(img, 0, 0, iw, ih, 0, y, this.canvas.width, drawH);
      y += drawH;
    }
  }

  draw(){
    this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    this.drawRoad();
    for(const e of this.entities) e.draw(this.ctx);
    this.player.draw(this.ctx);
  }

  loop(now){
    if(!this.running) return;
    const delta = Math.min(60, now - (this.lastTime || now));
    this.lastTime = now;
    if(!this.paused && !this.gameOver) this.update(delta);
    this.draw();
    if(!this.gameOver) requestAnimationFrame(t=>this.loop(t));
  }

  start(){
    this.running = true;
    if(this.background && !this.muted){
      try { this.background.play(); } catch(e){}
    }
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }
}

/* ============================
   Boot: load assets then start
   ============================ */
(function boot(){
  const preloadEl = document.getElementById('preload');

  loader.loadAll((images,audio)=>{
    // hide preload after a short delay
    setTimeout(()=>{ preloadEl.classList.add('hidden'); }, 200);
    const canvas = document.getElementById('game-canvas');
    const game = new Game(canvas, images, audio);

    // start on first user interaction to allow audio playback on mobile
    const startNow = ()=>{
      if(game.background) try { game.background.play(); } catch(e){}
      game.start();
      window.removeEventListener('pointerdown', startNow);
      window.removeEventListener('keydown', startNow);
    };
    window.addEventListener('pointerdown', startNow);
    window.addEventListener('keydown', startNow);
  });
})();
