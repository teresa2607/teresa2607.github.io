(function () {
  const STORAGE_KEY = "loop-engineering-tetris-best";
  const COLS = 10;
  const ROWS = 20;
  const CELL = 24;
  const DROP_MS = 600;

  const COLORS = {
    board: "#f8f5ef",
    grid: "rgba(23, 33, 43, 0.05)",
    text: "#17212b",
    active: "#0f766e",
    best: "#c97b3b",
    I: "#5ab4ff",
    O: "#f2c14e",
    T: "#9d79d6",
    S: "#74c69d",
    Z: "#ff6b6b",
    J: "#4d96ff",
    L: "#f77f00",
  };

  const SHAPES = {
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]],
  };

  const TETROMINOES = Object.keys(SHAPES);

  function cloneMatrix(matrix) {
    return matrix.map((row) => row.slice());
  }

  function rotateMatrix(matrix) {
    const height = matrix.length;
    const width = matrix[0].length;
    const rotated = Array.from({ length: width }, () => Array(height).fill(0));
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        rotated[x][height - 1 - y] = matrix[y][x];
      }
    }
    return rotated;
  }

  class TetrisGame {
    constructor({ canvas, statusEl, scoreEl, bestEl, actionButtons, onActivate }) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.statusEl = statusEl;
      this.scoreEl = scoreEl;
      this.bestEl = bestEl;
      this.actionButtons = Array.from(actionButtons || []);
      this.onActivate = onActivate || null;
      this.timerId = null;
      this.running = false;
      this.paused = false;
      this.gameOver = false;
      this.score = 0;
      this.level = 1;
      this.dropMs = DROP_MS;
      this.bestScore = Number(localStorage.getItem(STORAGE_KEY) || 0);
      this.board = this.createBoard();
      this.current = null;
      this.nextType = this.randomType();
      this.draw();
    }

    mount() {
      this.bindButtons();
      this.syncScoreboard();
      this.reset(true);
      this.draw();
    }

    bindButtons() {
      this.actionButtons.forEach((button) => {
        button.addEventListener("click", () => {
          if (this.onActivate) this.onActivate();
          const action = button.dataset.action;
          if (action === "start") this.start();
          if (action === "pause") this.togglePause();
          if (action === "restart") this.restart();
        });
      });
    }

    handleKey(key) {
      const normalized = key.toLowerCase();
      if (normalized === " " || normalized === "spacebar") {
        if (!this.running && !this.gameOver) {
          this.start();
        }
        this.hardDrop();
        return true;
      }
      if (normalized === "p") {
        this.togglePause();
        return true;
      }
      if (normalized === "r") {
        this.restart();
        return true;
      }
      const mapping = {
        arrowleft: () => this.move(-1, 0),
        a: () => this.move(-1, 0),
        arrowright: () => this.move(1, 0),
        d: () => this.move(1, 0),
        arrowdown: () => this.softDrop(),
        s: () => this.softDrop(),
        arrowup: () => this.rotate(),
        w: () => this.rotate(),
      };
      if (mapping[normalized]) {
        if (!this.running && !this.gameOver) {
          this.start();
        }
        mapping[normalized]();
        return true;
      }
      return false;
    }

    createBoard() {
      return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    }

    randomType() {
      return TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];
    }

    spawnPiece() {
      const type = this.nextType || this.randomType();
      this.nextType = this.randomType();
      const matrix = cloneMatrix(SHAPES[type]);
      const piece = {
        type,
        matrix,
        x: Math.floor((COLS - matrix[0].length) / 2),
        y: 0,
      };
      if (!this.canPlace(piece.matrix, piece.x, piece.y)) {
        this.gameOver = true;
        this.running = false;
        this.paused = false;
        this.stopTimer();
        this.setStatus("게임 오버");
        this.updateBestScore();
      }
      return piece;
    }

    reset(keepBest = false) {
      this.stopTimer();
      this.running = false;
      this.paused = false;
      this.gameOver = false;
      this.score = 0;
      this.level = 1;
      this.dropMs = DROP_MS;
      this.board = this.createBoard();
      this.nextType = this.randomType();
      this.current = this.spawnPiece();
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
      if (this.running || this.gameOver) {
        if (this.gameOver) {
          this.restart();
        }
        return;
      }
      this.running = true;
      this.paused = false;
      this.setStatus("진행 중");
      this.loop();
    }

    togglePause() {
      if (this.gameOver) {
        this.restart();
        return;
      }
      if (!this.running) {
        this.start();
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
      }, this.dropMs);
    }

    canPlace(matrix, offsetX, offsetY) {
      for (let y = 0; y < matrix.length; y += 1) {
        for (let x = 0; x < matrix[y].length; x += 1) {
          if (!matrix[y][x]) continue;
          const boardX = offsetX + x;
          const boardY = offsetY + y;
          if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
            return false;
          }
          if (boardY >= 0 && this.board[boardY][boardX]) {
            return false;
          }
        }
      }
      return true;
    }

    move(dx, dy) {
      if (!this.running || this.paused || this.gameOver) return false;
      const nextX = this.current.x + dx;
      const nextY = this.current.y + dy;
      if (this.canPlace(this.current.matrix, nextX, nextY)) {
        this.current.x = nextX;
        this.current.y = nextY;
        this.draw();
        return true;
      }
      if (dy > 0) {
        this.lockPiece();
      }
      return false;
    }

    softDrop() {
      if (!this.running || this.paused || this.gameOver) return false;
      const moved = this.move(0, 1);
      if (!moved) {
        this.lockPiece();
      }
      return true;
    }

    hardDrop() {
      if (!this.running || this.paused || this.gameOver) {
        if (!this.running && !this.gameOver) {
          this.start();
        }
        return false;
      }
      while (this.canPlace(this.current.matrix, this.current.x, this.current.y + 1)) {
        this.current.y += 1;
      }
      this.lockPiece();
      return true;
    }

    rotate() {
      if (!this.running || this.paused || this.gameOver) return false;
      const rotated = rotateMatrix(this.current.matrix);
      const kicks = [0, -1, 1, -2, 2];
      for (const kick of kicks) {
        if (this.canPlace(rotated, this.current.x + kick, this.current.y)) {
          this.current.matrix = rotated;
          this.current.x += kick;
          this.draw();
          return true;
        }
      }
      return false;
    }

    step() {
      if (!this.running || this.paused || this.gameOver) return;
      if (!this.canPlace(this.current.matrix, this.current.x, this.current.y + 1)) {
        this.lockPiece();
        return;
      }
      this.current.y += 1;
    }

    lockPiece() {
      const { matrix, x, y, type } = this.current;
      for (let row = 0; row < matrix.length; row += 1) {
        for (let col = 0; col < matrix[row].length; col += 1) {
          if (!matrix[row][col]) continue;
          const boardY = y + row;
          const boardX = x + col;
          if (boardY < 0) {
            this.gameOver = true;
            this.running = false;
            this.stopTimer();
            this.setStatus("게임 오버");
            this.updateBestScore();
            this.draw();
            return;
          }
          this.board[boardY][boardX] = type;
        }
      }

      const cleared = this.clearLines();
      if (cleared > 0) {
        const points = [0, 100, 300, 500, 800];
        this.score += points[cleared] || cleared * 200;
        this.level = 1 + Math.floor(this.score / 500);
        this.dropMs = Math.max(120, DROP_MS - (this.level - 1) * 40);
        this.updateBestScore();
      }

      this.current = this.spawnPiece();
      this.syncScoreboard();
      this.draw();
      if (this.gameOver) {
        return;
      }
      if (this.running && !this.paused) {
        this.loop();
      }
    }

    clearLines() {
      let cleared = 0;
      for (let row = ROWS - 1; row >= 0; row -= 1) {
        if (this.board[row].every(Boolean)) {
          this.board.splice(row, 1);
          this.board.unshift(Array(COLS).fill(null));
          cleared += 1;
          row += 1;
        }
      }
      return cleared;
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
      const cellSize = size / COLS;
      ctx.clearRect(0, 0, size, size * 2);
      ctx.fillStyle = COLORS.board;
      ctx.fillRect(0, 0, size, size * 2);

      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      for (let i = 0; i <= COLS; i += 1) {
        const pos = i * cellSize;
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, size * 2);
        ctx.stroke();
      }
      for (let i = 0; i <= ROWS; i += 1) {
        const pos = i * cellSize;
        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(size, pos);
        ctx.stroke();
      }

      for (let y = 0; y < ROWS; y += 1) {
        for (let x = 0; x < COLS; x += 1) {
          const cell = this.board[y][x];
          if (cell) {
            this.drawBlock(x, y, cell, cellSize);
          }
        }
      }

      if (this.current) {
        for (let y = 0; y < this.current.matrix.length; y += 1) {
          for (let x = 0; x < this.current.matrix[y].length; x += 1) {
            if (!this.current.matrix[y][x]) continue;
            this.drawBlock(this.current.x + x, this.current.y + y, this.current.type, cellSize);
          }
        }
      }

      if (this.gameOver) {
        this.drawOverlay("게임 오버", "R 또는 재시작 버튼으로 다시 시작");
      } else if (this.paused) {
        this.drawOverlay("일시정지", "P 또는 일시정지 버튼으로 재개");
      } else if (!this.running) {
        this.drawOverlay("대기 중", "시작 버튼 또는 방향키로 시작");
      }
    }

    drawBlock(x, y, type, cellSize) {
      const ctx = this.ctx;
      const inset = cellSize * 0.08;
      const px = x * cellSize + inset;
      const py = y * cellSize + inset;
      const size = cellSize - inset * 2;
      const radius = Math.max(4, cellSize * 0.18);
      ctx.fillStyle = COLORS[type] || COLORS.active;
      ctx.beginPath();
      ctx.moveTo(px + radius, py);
      ctx.arcTo(px + size, py, px + size, py + size, radius);
      ctx.arcTo(px + size, py + size, px, py + size, radius);
      ctx.arcTo(px, py + size, px, py, radius);
      ctx.arcTo(px, py, px + size, py, radius);
      ctx.closePath();
      ctx.fill();
    }

    drawOverlay(title, subtitle) {
      const ctx = this.ctx;
      const size = this.canvas.width;
      ctx.fillStyle = "rgba(255, 255, 255, 0.64)";
      ctx.fillRect(0, 0, size, size * 2);
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 26px Segoe UI, sans-serif";
      ctx.fillText(title, size / 2, size);
      ctx.font = "16px Segoe UI, sans-serif";
      ctx.fillText(subtitle, size / 2, size + 34);
    }
  }

  window.TetrisGame = TetrisGame;
}());
