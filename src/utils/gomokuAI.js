// Engine cờ caro (gomoku) 15x15: kiểm tra thắng thua + AI đánh theo heuristic 2 nước nhìn trước.
export const SIZE = 15;
export const EMPTY = null;
export const HUMAN = 'H';
export const AI = 'A';

const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

const SCORE = {
  FIVE: 10_000_000,
  OPEN_FOUR: 500_000,
  FOUR: 10_000,
  OPEN_THREE: 5_000,
  THREE: 500,
  OPEN_TWO: 100,
  TWO: 50,
  ONE: 10,
};

function inBounds(x, y) {
  return x >= 0 && x < SIZE && y >= 0 && y < SIZE;
}

export function createEmptyBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
}

export function cloneBoard(board) {
  return board.map((row) => row.slice());
}

export function isBoardFull(board) {
  return board.every((row) => row.every((cell) => cell !== EMPTY));
}

// Trả về { winner, line } nếu có 5 quân liên tiếp, ngược lại null.
export function checkWinner(board) {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const mark = board[y][x];
      if (!mark) continue;
      for (const [dx, dy] of DIRECTIONS) {
        const line = [[x, y]];
        let cx = x + dx;
        let cy = y + dy;
        while (inBounds(cx, cy) && board[cy][cx] === mark) {
          line.push([cx, cy]);
          cx += dx;
          cy += dy;
        }
        if (line.length >= 5) {
          return { winner: mark, line: line.slice(0, 5) };
        }
      }
    }
  }
  return null;
}

function patternScore(count, openEnds) {
  if (count >= 5) return SCORE.FIVE;
  if (count === 4) return openEnds === 2 ? SCORE.OPEN_FOUR : openEnds === 1 ? SCORE.FOUR : 0;
  if (count === 3) return openEnds === 2 ? SCORE.OPEN_THREE : openEnds === 1 ? SCORE.THREE : 0;
  if (count === 2) return openEnds === 2 ? SCORE.OPEN_TWO : openEnds === 1 ? SCORE.TWO : 0;
  if (count === 1) return openEnds > 0 ? SCORE.ONE : 0;
  return 0;
}

// Điểm đe doạ nếu quân `mark` chiếm ô (x,y) — cộng dồn cả 4 hướng.
function evaluatePoint(board, x, y, mark) {
  let total = 0;
  for (const [dx, dy] of DIRECTIONS) {
    let count = 1;
    let openEnds = 0;

    let cx = x + dx;
    let cy = y + dy;
    while (inBounds(cx, cy) && board[cy][cx] === mark) {
      count++;
      cx += dx;
      cy += dy;
    }
    if (inBounds(cx, cy) && board[cy][cx] === EMPTY) openEnds++;

    cx = x - dx;
    cy = y - dy;
    while (inBounds(cx, cy) && board[cy][cx] === mark) {
      count++;
      cx -= dx;
      cy -= dy;
    }
    if (inBounds(cx, cy) && board[cy][cx] === EMPTY) openEnds++;

    total += patternScore(count, openEnds);
  }
  return total;
}

// Chỉ xét các ô trống trong bán kính 2 quanh quân đã đánh, để search luôn nhanh trên bàn 15x15.
function getCandidates(board) {
  const seen = new Set();
  const candidates = [];
  let hasStone = false;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (!board[y][x]) continue;
      hasStone = true;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (!inBounds(nx, ny) || board[ny][nx] !== EMPTY) continue;
          const key = ny * SIZE + nx;
          if (!seen.has(key)) {
            seen.add(key);
            candidates.push({ x: nx, y: ny });
          }
        }
      }
    }
  }
  if (!hasStone) {
    const c = Math.floor(SIZE / 2);
    return [{ x: c, y: c }];
  }
  return candidates;
}

function combinedScore(board, x, y, mine, theirs) {
  const offense = evaluatePoint(board, x, y, mine);
  const defense = evaluatePoint(board, x, y, theirs);
  return offense + defense * 1.05;
}

// AI chọn nước đi: thắng ngay nếu có thể, chặn ngay nếu đối phương sắp thắng,
// chặn nếu đối phương sắp có "tứ mở" không cản nổi, rồi mới xét heuristic + nhìn trước 1 nước của người.
export function getBestMove(inputBoard, aiMark = AI, humanMark = HUMAN) {
  const board = cloneBoard(inputBoard);
  const candidates = getCandidates(board);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  for (const { x, y } of candidates) {
    if (evaluatePoint(board, x, y, aiMark) >= SCORE.FIVE) return { x, y };
  }

  const mustBlockFive = candidates.filter(({ x, y }) => evaluatePoint(board, x, y, humanMark) >= SCORE.FIVE);
  if (mustBlockFive.length > 0) {
    mustBlockFive.sort((a, b) => evaluatePoint(board, b.x, b.y, aiMark) - evaluatePoint(board, a.x, a.y, aiMark));
    return mustBlockFive[0];
  }

  const mustBlockOpenFour = candidates.filter(({ x, y }) => evaluatePoint(board, x, y, humanMark) >= SCORE.OPEN_FOUR);
  if (mustBlockOpenFour.length > 0) {
    mustBlockOpenFour.sort((a, b) => evaluatePoint(board, b.x, b.y, aiMark) - evaluatePoint(board, a.x, a.y, aiMark));
    return mustBlockOpenFour[0];
  }

  const ranked = candidates
    .map(({ x, y }) => ({ x, y, combined: combinedScore(board, x, y, aiMark, humanMark) }))
    .sort((a, b) => b.combined - a.combined);

  const top = ranked.slice(0, Math.min(12, ranked.length));

  let best = top[0];
  let bestScore = -Infinity;
  for (const cand of top) {
    board[cand.y][cand.x] = aiMark;
    const humanCandidates = getCandidates(board);
    let humanBest = 0;
    for (const hc of humanCandidates) {
      const hScore = combinedScore(board, hc.x, hc.y, humanMark, aiMark);
      if (hScore > humanBest) humanBest = hScore;
    }
    board[cand.y][cand.x] = EMPTY;

    const netScore = cand.combined - humanBest * 0.9;
    if (netScore > bestScore) {
      bestScore = netScore;
      best = cand;
    }
  }
  return { x: best.x, y: best.y };
}
