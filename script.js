const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".site-nav");
const navLinks = document.querySelectorAll(".site-nav a");
const year = document.querySelector("#year");
const gameSections = Array.from(document.querySelectorAll("[data-game-id]"));
const gameById = {};
let activeGameId = "snake";

if (year) {
  year.textContent = new Date().getFullYear();
}

if (navToggle && nav) {
  navToggle.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      document.body.classList.remove("nav-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

function setActiveGame(gameId) {
  if (!gameById[gameId]) {
    return;
  }

  activeGameId = gameId;
  gameSections.forEach((section) => {
    section.classList.toggle("is-active", section.dataset.gameId === gameId);
  });
}

function registerGame(gameId, game) {
  gameById[gameId] = game;
}

if (window.SnakeGame) {
  const snakeGame = new window.SnakeGame({
    canvas: document.querySelector("#game-canvas"),
    statusEl: document.querySelector("#game-status"),
    scoreEl: document.querySelector("#game-score"),
    bestEl: document.querySelector("#game-best"),
    actionButtons: document.querySelectorAll('[data-game="snake"][data-action]'),
    padButtons: document.querySelectorAll(".game-shell[data-game-id='snake'] [data-dir]"),
    onActivate: () => setActiveGame("snake"),
  });

  window.snakeGame = snakeGame;
  registerGame("snake", snakeGame);
  snakeGame.mount();
}

if (window.TetrisGame) {
  const tetrisGame = new window.TetrisGame({
    canvas: document.querySelector("#tetris-canvas"),
    statusEl: document.querySelector("#tetris-status"),
    scoreEl: document.querySelector("#tetris-score"),
    bestEl: document.querySelector("#tetris-best"),
    actionButtons: document.querySelectorAll('[data-game="tetris"][data-action]'),
    onActivate: () => setActiveGame("tetris"),
  });

  window.tetrisGame = tetrisGame;
  registerGame("tetris", tetrisGame);
  tetrisGame.mount();
}

setActiveGame("snake");

window.addEventListener("keydown", (event) => {
  const key = event.key;
  const activeGame = gameById[activeGameId];
  if (!activeGame || typeof activeGame.handleKey !== "function") {
    return;
  }

  const handled = activeGame.handleKey(key);
  if (handled) {
    event.preventDefault();
  }
});

window.addEventListener("resize", () => {
  if (window.snakeGame) {
    window.snakeGame.draw();
  }
  if (window.tetrisGame) {
    window.tetrisGame.draw();
  }
});

gameSections.forEach((section) => {
  section.addEventListener("pointerdown", () => setActiveGame(section.dataset.gameId));
  section.addEventListener("focusin", () => setActiveGame(section.dataset.gameId));
});
