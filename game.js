(function () {
  const STORAGE_KEY = "loop-engineering-snake-best";
  const GRID_SIZE = 20;
  const TICK_MS = 120;
  const COLORS = {
    board: "#f8f5ef",
    grid: "rgba(23, 33, 43, 0.05)",
    snake: "#0f766e",
    snakeHead: "#0b5e58",
    food: "#c97b3b",
    text: "#17212b",
    danger: "#b42318",
  };

  const DIRECTIONS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  function sameCell(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  function cloneCell(cell) {
    return { x: cell.x, y: cell.y };
  }

  class SnakeGame {
    constructor({ canvas, statusEl, scoreEl, bestEl, actionButtons, padButtons }) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.statusEl = statusEl;
      this.scoreEl = scoreEl;
      this.bestEl = bestEl;
      this.actionButtons = Array.from(actionButtons || []);
      this.padButtons = Array.from(padButtons || []);
      this.timerId = null;
      this.running = false;
      this.paused = false;
      this.gameOver = false;
      this.score = 0;
      this.bestScore = Number(localStorage.getItem(STORAGE_KEY) || 0);
      this.direction = DIRECTIONS.right;
      this.nextDirection = DIRECTIONS.right;
      this.snake = [];
      this.food = { x: 0, y: 0 };
      this.lastTime = 0;
      this.resizeRatio = 24;
    }

    mount() {
      this.bindButtons();
      this.bindInput();
      this.syncScoreboard();
      this.reset(true);
      this.draw();
    }

    bindButtons() {
      this.actionButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const action = button.dataset.action;
          if (action === "start") this.start();
          if (action === "pause") this.togglePause();
          if (action === "restart") this.restart();
        });
      });

      this.padButtons.forEach((button) => {
        const direction = button.dataset.dir;
        const handler = (event) => {
          event.preventDefault();
          this.queueDirection(direction);
          if (!this.running && !this.gameOver) {
            this.start();
          }
        };

        button.addEventListener("pointerdown", handler, { passive: false });
        button.addEventListener("touchstart", handler, { passive: false });
      });
    }

    bindInput() {
      window.addEventListener("keydown", (event) => {
        const key = event.key.toLowerCase();
        if (key === " " || key === "spacebar") {
          event.preventDefault();
          if (!this.running) {
            this.start();
          } else {
            this.togglePause();
          }
          return;
        }
        if (key === "r") {
          event.preventDefault();
          this.restart();
          return;
        }
        const mapping = {
          arrowup: "up",
          w: "up",
          arrowdown: "down",
          s: "down",
          arrowleft: "left",
          a: "left",
          arrowright: "right",
          d: "right",
        };
        if (mapping[key]) {
          event.preventDefault();
          this.queueDirection(mapping[key]);
        }
      });

      window.addEventListener("resize", () => this.draw());
    }

    reset(keepBest = false) {
      this.stopTimer();
      this.running = false;
      this.paused = false;
      this.gameOver = false;
      this.score = 0;
      this.direction = DIRECTIONS.right;
      this.nextDirection = DIRECTIONS.right;
      this.snake = [
        { x: 7, y: 10 },
        { x: 6, y: 10 },
        { x: 5, y: 10 },
      ];
      this.food = this.spawnFood();
      if (!keepBest) {
        this.bestScore = Math.max(this.bestScore, Number(localStorage.getItem(STORAGE_KEY) || 0));
      }
      this.syncScoreboard();
      this.setStatus("대기 중");
    }

    restart() {
      this.reset(true);
      this.draw();
      this.start();
    }

    start() {
      if (this.running) {
        return;
      }
      this.gameOver = false;
      this.paused = false;
      this.running = true;
      this.setStatus("진행 중");
      this.loop();
    }

    togglePause() {
      if (!this.running && !this.gameOver) {
        this.start();
        return;
      }
      if (this.gameOver) {
        this.restart();
        return;
      }
      this.paused = !this.paused;
      if (this.paused) {
        this.stopTimer();
        this.setStatus("일시정지");
      } else {
        this.setStatus("진행 중");
        this.loop();
      }
    }

    stopTimer() {
      if (this.timerId !== null) {
        clearTimeout(this.timerId);
        this.timerId = null;
      }
    }

    loop() {
      this.stopTimer();
      if (!this.running || this.paused || this.gameOver) {
        return;
      }
      this.timerId = setTimeout(() => {
        this.step();
        this.draw();
        this.loop();
      }, TICK_MS);
    }

    queueDirection(name) {
      const next = DIRECTIONS[name];
      if (!next) {
        return;
      }
      if (this.isReverse(next)) {
        return;
      }
      this.nextDirection = next;
    }

    isReverse(next) {
      return (
        next.x === -this.direction.x &&
        next.y === -this.direction.y &&
        (this.direction.x !== 0 || this.direction.y !== 0)
      );
    }

    step() {
      if (!this.running || this.paused || this.gameOver) {
        return;
      }

      this.direction = this.nextDirection;
      const head = this.snake[0];
      const nextHead = {
        x: head.x + this.direction.x,
        y: head.y + this.direction.y,
      };

      if (this.isWallCollision(nextHead) || this.isSelfCollision(nextHead)) {
        this.finish();
        return;
      }

      this.snake.unshift(nextHead);
      if (sameCell(nextHead, this.food)) {
        this.score += 1;
        this.food = this.spawnFood();
        this.updateBestScore();
        this.syncScoreboard();
        return;
      }

      this.snake.pop();
      this.syncScoreboard();
    }

    finish() {
      this.gameOver = true;
      this.running = false;
      this.paused = false;
      this.stopTimer();
      this.updateBestScore();
      this.setStatus("게임 오버");
      this.draw();
    }

    isWallCollision(cell) {
      return cell.x < 0 || cell.y < 0 || cell.x >= GRID_SIZE || cell.y >= GRID_SIZE;
    }

    isSelfCollision(cell) {
      return this.snake.some((part) => sameCell(part, cell));
    }

    spawnFood() {
      let food = { x: 0, y: 0 };
      let safe = false;
      let guard = 0;
      while (!safe && guard < 500) {
        food = {
          x: Math.floor(Math.random() * GRID_SIZE),
          y: Math.floor(Math.random() * GRID_SIZE),
        };
        safe = !this.snake.some((part) => sameCell(part, food));
        guard += 1;
      }
      return food;
    }

    updateBestScore() {
      if (this.score > this.bestScore) {
        this.bestScore = this.score;
        localStorage.setItem(STORAGE_KEY, String(this.bestScore));
      }
      this.syncScoreboard();
    }

    syncScoreboard() {
      if (this.scoreEl) {
        this.scoreEl.textContent = String(this.score);
      }
      if (this.bestEl) {
        this.bestEl.textContent = String(this.bestScore);
      }
    }

    setStatus(text) {
      if (this.statusEl) {
        this.statusEl.textContent = text;
      }
    }

    draw() {
      const ctx = this.ctx;
      const size = this.canvas.width;
      const cellSize = size / GRID_SIZE;
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = COLORS.board;
      ctx.fillRect(0, 0, size, size);

      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      for (let i = 0; i <= GRID_SIZE; i += 1) {
        const pos = i * cellSize;
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(size, pos);
        ctx.stroke();
      }

      ctx.fillStyle = COLORS.food;
      this.drawCell(this.food, cellSize, 0.18);

      this.snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? COLORS.snakeHead : COLORS.snake;
        this.drawCell(segment, cellSize, index === 0 ? 0.16 : 0.2);
      });

      if (this.gameOver) {
        this.drawOverlay("게임 오버", "R 또는 재시작 버튼으로 다시 시작");
      } else if (this.paused) {
        this.drawOverlay("일시정지", "스페이스 또는 일시정지 버튼으로 재개");
      } else if (!this.running) {
        this.drawOverlay("대기 중", "시작 버튼, 방향키, WASD 또는 터치 버튼");
      }
    }

    drawCell(cell, cellSize, insetRatio) {
      const ctx = this.ctx;
      const inset = cellSize * insetRatio;
      const x = cell.x * cellSize + inset;
      const y = cell.y * cellSize + inset;
      const size = cellSize - inset * 2;
      const radius = Math.max(6, cellSize * 0.22);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.arcTo(x + size, y, x + size, y + size, radius);
      ctx.arcTo(x + size, y + size, x, y + size, radius);
      ctx.arcTo(x, y + size, x, y, radius);
      ctx.arcTo(x, y, x + size, y, radius);
      ctx.closePath();
      ctx.fill();
    }

    drawOverlay(title, subtitle) {
      const ctx = this.ctx;
      const size = this.canvas.width;
      ctx.fillStyle = "rgba(255, 255, 255, 0.64)";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 28px Segoe UI, sans-serif";
      ctx.fillText(title, size / 2, size / 2 - 18);
      ctx.font = "16px Segoe UI, sans-serif";
      ctx.fillText(subtitle, size / 2, size / 2 + 18);
      if (this.gameOver) {
        ctx.fillStyle = COLORS.danger;
        ctx.fillRect(size / 2 - 38, size / 2 + 44, 76, 4);
      }
    }
  }

  window.SnakeGame = SnakeGame;
}());
