const sounds = {
  engine: new Audio("data:audio/mp3;base64,ENGINE_PLACEHOLDER"),
  coin: new Audio("data:audio/mp3;base64,COIN_PLACEHOLDER"),
  crash: new Audio("data:audio/mp3;base64,CRASH_PLACEHOLDER")
};
sounds.engine.loop = true;

// On game start:
sounds.engine.play();

// On coin collect:
sounds.coin.currentTime = 0;
sounds.coin.play();

// On crash:
sounds.crash.play();
sounds.engine.pause();
