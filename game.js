const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const rollBtn = document.getElementById("roll-btn");
const resetBtn = document.getElementById("reset-btn");
const diceEl = document.getElementById("dice");
const diceResult = document.getElementById("dice-result");
const messageEl = document.getElementById("message");
const currentPlayerEl = document.getElementById("current-player");
const p1PosEl = document.getElementById("p1-pos");
const p2PosEl = document.getElementById("p2-pos");

const BOARD_SIZE = 10;
const CELL_SIZE = canvas.width / BOARD_SIZE;
const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

const SNAKES = {
  16: 6,
  47: 26,
  49: 11,
  56: 53,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  98: 78,
};

const LADDERS = {
  1: 38,
  4: 14,
  9: 31,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  80: 100,
};

const COLORS = {
  light: "#f5e6ca",
  dark: "#d4a574",
  snake: "#e74c3c",
  ladder: "#27ae60",
  p1: "#e74c3c",
  p2: "#3498db",
};

let players = [
  { pos: 0, color: COLORS.p1, name: "Player 1" },
  { pos: 0, color: COLORS.p2, name: "Player 2" },
];
let currentPlayer = 0;
let isAnimating = false;
let gameOver = false;

function getCellCoords(num) {
  if (num <= 0) return { x: -1, y: -1 };
  const n = num - 1;
  const row = Math.floor(n / BOARD_SIZE);
  const col = n % BOARD_SIZE;
  const x = row % 2 === 0 ? col : BOARD_SIZE - 1 - col;
  const y = BOARD_SIZE - 1 - row;
  return {
    x: x * CELL_SIZE + CELL_SIZE / 2,
    y: y * CELL_SIZE + CELL_SIZE / 2,
  };
}

function drawBoard() {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const isLight = (row + col) % 2 === 0;
      ctx.fillStyle = isLight ? COLORS.light : COLORS.dark;
      ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);

      const boardRow = BOARD_SIZE - 1 - row;
      const num =
        boardRow % 2 === 0
          ? boardRow * BOARD_SIZE + col + 1
          : boardRow * BOARD_SIZE + (BOARD_SIZE - col);

      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(num, col * CELL_SIZE + 4, row * CELL_SIZE + 4);
    }
  }
}

function drawSnakesAndLadders() {
  // Ladders
  for (const [from, to] of Object.entries(LADDERS)) {
    const start = getCellCoords(Number(from));
    const end = getCellCoords(Number(to));
    drawLadder(start, end);
  }

  // Snakes
  for (const [from, to] of Object.entries(SNAKES)) {
    const start = getCellCoords(Number(from));
    const end = getCellCoords(Number(to));
    drawSnake(start, end);
  }
}

function drawLadder(from, to) {
  const offset = 8;
  ctx.strokeStyle = COLORS.ladder;
  ctx.lineWidth = 4;
  ctx.setLineDash([]);

  // Left rail
  ctx.beginPath();
  ctx.moveTo(from.x - offset, from.y);
  ctx.lineTo(to.x - offset, to.y);
  ctx.stroke();

  // Right rail
  ctx.beginPath();
  ctx.moveTo(from.x + offset, from.y);
  ctx.lineTo(to.x + offset, to.y);
  ctx.stroke();

  // Rungs
  const steps = 5;
  ctx.lineWidth = 2;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const rx = from.x + (to.x - from.x) * t;
    const ry = from.y + (to.y - from.y) * t;
    ctx.beginPath();
    ctx.moveTo(rx - offset, ry);
    ctx.lineTo(rx + offset, ry);
    ctx.stroke();
  }
}

function drawSnake(from, to) {
  ctx.strokeStyle = COLORS.snake;
  ctx.lineWidth = 4;
  ctx.setLineDash([8, 4]);

  ctx.beginPath();
  const cpX = (from.x + to.x) / 2 + (Math.random() - 0.5) * 40;
  const cpY = (from.y + to.y) / 2;
  ctx.moveTo(from.x, from.y);
  ctx.quadraticCurveTo(cpX, cpY, to.x, to.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Snake head
  ctx.fillStyle = COLORS.snake;
  ctx.beginPath();
  ctx.arc(from.x, from.y, 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayers() {
  players.forEach((player, i) => {
    if (player.pos <= 0) return;
    const { x, y } = getCellCoords(player.pos);
    const offsetX = i === 0 ? -8 : 8;

    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(x + offsetX, y, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(i + 1, x + offsetX, y);
  });
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBoard();
  drawSnakesAndLadders();
  drawPlayers();
}

function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

async function animateMove(player, from, to) {
  const step = from < to ? 1 : -1;
  let current = from;

  while (current !== to) {
    current += step;
    player.pos = current;
    render();
    await sleep(120);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function handleRoll() {
  if (isAnimating || gameOver) return;
  isAnimating = true;
  rollBtn.disabled = true;
  messageEl.textContent = "";

  // Dice animation
  diceEl.classList.add("rolling");
  const value = rollDice();
  await sleep(400);
  diceEl.classList.remove("rolling");
  diceEl.textContent = DICE_FACES[value - 1];
  diceResult.textContent = value;

  const player = players[currentPlayer];
  const newPos = player.pos + value;

  if (newPos > 100) {
    messageEl.textContent = `Need exact ${100 - player.pos} to win!`;
    isAnimating = false;
    rollBtn.disabled = false;
    currentPlayer = 1 - currentPlayer;
    updateUI();
    return;
  }

  await animateMove(player, player.pos, newPos);

  // Check snake or ladder
  if (SNAKES[newPos]) {
    messageEl.textContent = `🐍 Snake! Slide down from ${newPos} to ${SNAKES[newPos]}`;
    await sleep(500);
    await animateMove(player, newPos, SNAKES[newPos]);
  } else if (LADDERS[newPos]) {
    messageEl.textContent = `🪜 Ladder! Climb up from ${newPos} to ${LADDERS[newPos]}`;
    await sleep(500);
    await animateMove(player, newPos, LADDERS[newPos]);
  }

  if (player.pos === 100) {
    gameOver = true;
    messageEl.textContent = `🎉 ${player.name} wins!`;
    currentPlayerEl.textContent = `${player.name} wins!`;
    rollBtn.disabled = true;
    isAnimating = false;
    return;
  }

  currentPlayer = 1 - currentPlayer;
  updateUI();
  isAnimating = false;
  rollBtn.disabled = false;
}

function updateUI() {
  const player = players[currentPlayer];
  currentPlayerEl.textContent = `${player.name}'s Turn`;
  currentPlayerEl.style.borderLeft = `4px solid ${player.color}`;
  p1PosEl.textContent = players[0].pos;
  p2PosEl.textContent = players[1].pos;
}

function resetGame() {
  players[0].pos = 0;
  players[1].pos = 0;
  currentPlayer = 0;
  isAnimating = false;
  gameOver = false;
  rollBtn.disabled = false;
  diceEl.textContent = "🎲";
  diceResult.textContent = "";
  messageEl.textContent = "";
  updateUI();
  render();
}

rollBtn.addEventListener("click", handleRoll);
resetBtn.addEventListener("click", resetGame);

// Init
updateUI();
render();
