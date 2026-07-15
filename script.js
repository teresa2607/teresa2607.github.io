const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".site-nav");
const navLinks = document.querySelectorAll(".site-nav a");
const year = document.querySelector("#year");
const gameRoot = document.querySelector("#game-canvas");

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

if (gameRoot && window.SnakeGame) {
  const game = new window.SnakeGame({
    canvas: gameRoot,
    statusEl: document.querySelector("#game-status"),
    scoreEl: document.querySelector("#game-score"),
    bestEl: document.querySelector("#game-best"),
    actionButtons: document.querySelectorAll("[data-action]"),
    padButtons: document.querySelectorAll("[data-dir]"),
  });

  window.snakeGame = game;
  game.mount();
}
