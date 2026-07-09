import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  SIZE,
  HUMAN,
  AI,
  createEmptyBoard,
  cloneBoard,
  checkWinner,
  isBoardFull,
  getBestMove,
} from './utils/gomokuAI';

const AI_THINK_DELAY = 500;

const RESULT_LABEL = {
  [HUMAN]: { text: '🎉 Bạn thắng!', className: 'bg-green-50 border-green-200 text-green-700' },
  [AI]: { text: '🤖 Máy thắng!', className: 'bg-red-50 border-red-200 text-red-700' },
  draw: { text: '🤝 Hoà!', className: 'bg-gray-50 border-gray-200 text-gray-600' },
};

export default function CoCaroPage() {
  const [board, setBoard] = useState(createEmptyBoard);
  const [starter, setStarter] = useState(HUMAN);
  const [turn, setTurn] = useState(HUMAN);
  const [winner, setWinner] = useState(null); // HUMAN | AI | 'draw' | null
  const [winLine, setWinLine] = useState([]);
  const [aiThinking, setAiThinking] = useState(false);
  const [stats, setStats] = useState({ [HUMAN]: 0, [AI]: 0, draw: 0 });
  const thinkTimer = useRef(null);

  const gameOver = winner !== null;

  useEffect(() => () => clearTimeout(thinkTimer.current), []);

  const finishGame = (result, line) => {
    setWinner(result);
    setWinLine(line || []);
    setStats((s) => ({ ...s, [result]: s[result] + 1 }));
  };

  const runAiMove = (currentBoard) => {
    setAiThinking(true);
    thinkTimer.current = setTimeout(() => {
      const move = getBestMove(currentBoard, AI, HUMAN);
      const next = cloneBoard(currentBoard);
      next[move.y][move.x] = AI;
      setBoard(next);
      setAiThinking(false);

      const result = checkWinner(next);
      if (result) {
        finishGame(result.winner, result.line);
      } else if (isBoardFull(next)) {
        finishGame('draw');
      } else {
        setTurn(HUMAN);
      }
    }, AI_THINK_DELAY);
  };

  const handleCellClick = (x, y) => {
    if (gameOver || aiThinking || turn !== HUMAN || board[y][x]) return;

    const next = cloneBoard(board);
    next[y][x] = HUMAN;
    setBoard(next);

    const result = checkWinner(next);
    if (result) {
      finishGame(result.winner, result.line);
      return;
    }
    if (isBoardFull(next)) {
      finishGame('draw');
      return;
    }
    setTurn(AI);
    runAiMove(next);
  };

  const startNewRound = () => {
    clearTimeout(thinkTimer.current);
    const nextStarter = winner === 'draw' || winner === null ? starter : winner;
    const empty = createEmptyBoard();
    setStarter(nextStarter);
    setBoard(empty);
    setWinner(null);
    setWinLine([]);
    setTurn(nextStarter);
    if (nextStarter === AI) {
      runAiMove(empty);
    }
  };

  const isWinCell = (x, y) => winLine.some(([lx, ly]) => lx === x && ly === y);

  return (
    <div>
      <Helmet>
        <title>Cờ caro - XSMB</title>
        <meta name="description" content="Chơi cờ caro (gomoku) đấu với máy, AI khó, thắng thua tính theo phiên." />
      </Helmet>

      <div className="flex flex-col items-center">
        <div className="w-full max-w-md flex items-center justify-between mb-3">
          <div className="text-sm">
            <span className="font-semibold text-gray-800">⚫ Bạn</span>
            <span className="mx-2 text-gray-300">·</span>
            <span className="font-semibold text-red-600">🔴 Máy</span>
          </div>
          <div className="text-xs text-gray-400">
            Ai thắng ván trước đi trước
          </div>
        </div>

        <div className="w-full max-w-md grid grid-cols-3 gap-2 mb-3 text-center">
          <div className="rounded-lg border border-gray-200 bg-white py-2">
            <div className="text-lg font-extrabold text-gray-800">{stats[HUMAN]}</div>
            <div className="text-[11px] text-gray-400">Bạn thắng</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white py-2">
            <div className="text-lg font-extrabold text-gray-500">{stats.draw}</div>
            <div className="text-[11px] text-gray-400">Hoà</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white py-2">
            <div className="text-lg font-extrabold text-red-600">{stats[AI]}</div>
            <div className="text-[11px] text-gray-400">Máy thắng</div>
          </div>
        </div>

        <div className="w-full max-w-md mb-3 h-6 flex items-center justify-center">
          {gameOver ? (
            <div className={`w-full text-center text-sm font-bold rounded-lg border py-1 ${RESULT_LABEL[winner].className}`}>
              {RESULT_LABEL[winner].text}
            </div>
          ) : aiThinking ? (
            <div className="text-xs text-gray-400 animate-pulse">🤖 Máy đang suy nghĩ...</div>
          ) : (
            <div className="text-xs text-gray-400">
              {turn === HUMAN ? 'Lượt của bạn' : 'Lượt của máy'}
            </div>
          )}
        </div>

        <div
          className="w-full max-w-md aspect-square grid grid-cols-[repeat(15,minmax(0,1fr))] border border-gray-300 bg-gray-200 gap-px select-none"
        >
          {board.map((row, y) =>
            row.map((cell, x) => {
              const win = isWinCell(x, y);
              return (
                <button
                  key={`${x}-${y}`}
                  onClick={() => handleCellClick(x, y)}
                  disabled={gameOver || aiThinking || turn !== HUMAN || !!cell}
                  className={`aspect-square flex items-center justify-center ${
                    win ? 'bg-yellow-200' : 'bg-white'
                  }`}
                >
                  {cell && (
                    <span
                      className={`block rounded-full ${
                        cell === HUMAN ? 'bg-gray-900' : 'bg-red-600'
                      }`}
                      style={{ width: '70%', height: '70%' }}
                    />
                  )}
                </button>
              );
            })
          )}
        </div>

        <button
          onClick={startNewRound}
          disabled={aiThinking}
          className="mt-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold text-sm transition-colors shadow-lg"
        >
          {gameOver ? '🔄 Ván mới' : '🔄 Chơi lại'}
        </button>

        <div className="mt-3 text-[11px] text-gray-400 text-center max-w-md">
          Kết quả thắng/thua chỉ lưu trong phiên chơi này, rời trang là mất.
        </div>
      </div>
    </div>
  );
}
