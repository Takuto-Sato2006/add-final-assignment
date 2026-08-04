(function (global) {
  'use strict';

  const BOARD_SIZE = 20;
  const PLAYER_COUNT = 4;
  const CORNERS = [[0, 0], [0, 19], [19, 19], [19, 0]];
  const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f'];
  const COLOR_NAMES = ['赤', '青', '緑', '黄'];
  const EDGE = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const DIAG = [[1, 1], [-1, 1], [1, -1], [-1, -1]];

  const BASE_PIECES = [
    { name: 'モノミノ', cells: [[0, 0]] },
    { name: 'ドミノ', cells: [[0, 0], [1, 0]] },
    { name: 'トロミノ I', cells: [[0, 0], [1, 0], [2, 0]] },
    { name: 'トロミノ L', cells: [[0, 0], [1, 0], [0, 1]] },
    { name: 'テトロミノ I', cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
    { name: 'テトロミノ L', cells: [[0, 0], [1, 0], [2, 0], [0, 1]] },
    { name: 'テトロミノ T', cells: [[0, 0], [1, 0], [2, 0], [1, 1]] },
    { name: 'テトロミノ S', cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
    { name: 'テトロミノ O', cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
    { name: 'ペントミノ F', cells: [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]] },
    { name: 'ペントミノ I', cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },
    { name: 'ペントミノ L', cells: [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1]] },
    { name: 'ペントミノ N', cells: [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1]] },
    { name: 'ペントミノ P', cells: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]] },
    { name: 'ペントミノ T', cells: [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]] },
    { name: 'ペントミノ U', cells: [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]] },
    { name: 'ペントミノ V', cells: [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2]] },
    { name: 'ペントミノ W', cells: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]] },
    { name: 'ペントミノ X', cells: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]] },
    { name: 'ペントミノ Y', cells: [[0, 0], [1, 0], [2, 0], [3, 0], [2, 1]] },
    { name: 'ペントミノ Z', cells: [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2]] },
  ];

  function normalize(cells) {
    let minR = Infinity;
    let minC = Infinity;
    for (const [r, c] of cells) {
      minR = Math.min(minR, r);
      minC = Math.min(minC, c);
    }
    return cells
      .map(([r, c]) => [r - minR, c - minC])
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  }

  function rotate(cells) {
    return cells.map(([r, c]) => [c, -r]);
  }

  function flip(cells) {
    return cells.map(([r, c]) => [r, -c]);
  }

  function makeOrientations(cells) {
    const seen = new Set();
    const out = [];
    for (let f = 0; f < 2; f++) {
      let cur = cells;
      for (let r = 0; r < 4; r++) {
        const n = normalize(cur);
        const k = n.map((c) => c.join(',')).join(';');
        if (!seen.has(k)) {
          seen.add(k);
          out.push(n);
        }
        cur = rotate(cur);
      }
      cells = flip(cells);
    }
    return out;
  }

  const PIECES = BASE_PIECES.map((p) => ({
    name: p.name,
    size: p.cells.length,
    orientations: makeOrientations(p.cells),
  }));

  function createGame() {
    const board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
    const players = [];
    for (let i = 0; i < PLAYER_COUNT; i++) {
      players.push({ index: i, remaining: PIECES.map((_, j) => j), hasPlaced: false });
    }
    return {
      board,
      players,
      currentPlayer: 0,
      passCount: 0,
      over: false,
      winnerRanking: null,
    };
  }

  function isPlacementValid(game, playerIndex, cells, r, c) {
    if (game.over) return false;
    const board = game.board;
    const player = game.players[playerIndex];
    for (const [dr, dc] of cells) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= BOARD_SIZE || nc >= BOARD_SIZE) return false;
      if (board[nr][nc] !== null) return false;
    }
    if (!player.hasPlaced) {
      const corner = CORNERS[playerIndex];
      return cells.some(([dr, dc]) => r + dr === corner[0] && c + dc === corner[1]);
    }
    let touchCorner = false;
    for (const [dr, dc] of cells) {
      const nr = r + dr;
      const nc = c + dc;
      for (const [er, ec] of EDGE) {
        const cr = nr + er;
        const cc = nc + ec;
        if (cr >= 0 && cc >= 0 && cr < BOARD_SIZE && cc < BOARD_SIZE && board[cr][cc] === playerIndex) {
          return false;
        }
      }
      for (const [er, ec] of DIAG) {
        const cr = nr + er;
        const cc = nc + ec;
        if (cr >= 0 && cc >= 0 && cr < BOARD_SIZE && cc < BOARD_SIZE && board[cr][cc] === playerIndex) {
          touchCorner = true;
        }
      }
    }
    return touchCorner;
  }

  function hasAnyMove(game, playerIndex) {
    const player = game.players[playerIndex];
    for (const pieceIndex of player.remaining) {
      const piece = PIECES[pieceIndex];
      for (const cells of piece.orientations) {
        const h = Math.max(...cells.map((x) => x[0])) + 1;
        const w = Math.max(...cells.map((x) => x[1])) + 1;
        for (let r = 0; r + h <= BOARD_SIZE; r++) {
          for (let c = 0; c + w <= BOARD_SIZE; c++) {
            if (isPlacementValid(game, playerIndex, cells, r, c)) return true;
          }
        }
      }
    }
    return false;
  }

  function listMoves(game, playerIndex) {
    const out = [];
    const player = game.players[playerIndex];
    for (const pieceIndex of player.remaining) {
      const piece = PIECES[pieceIndex];
      for (const cells of piece.orientations) {
        const h = Math.max(...cells.map((x) => x[0])) + 1;
        const w = Math.max(...cells.map((x) => x[1])) + 1;
        for (let r = 0; r + h <= BOARD_SIZE; r++) {
          for (let c = 0; c + w <= BOARD_SIZE; c++) {
            if (isPlacementValid(game, playerIndex, cells, r, c)) {
              out.push({ pieceIndex, cells, r, c });
            }
          }
        }
      }
    }
    return out;
  }

  function placePiece(game, playerIndex, pieceIndex, cells, r, c) {
    if (!isPlacementValid(game, playerIndex, cells, r, c)) return false;
    const player = game.players[playerIndex];
    for (const [dr, dc] of cells) {
      game.board[r + dr][c + dc] = playerIndex;
    }
    player.remaining = player.remaining.filter((i) => i !== pieceIndex);
    player.hasPlaced = true;
    game.passCount = 0;
    advanceTurn(game);
    return true;
  }

  function pass(game) {
    if (game.over) return;
    game.passCount += 1;
    advanceTurn(game);
  }

  function advanceTurn(game) {
    if (game.over) return;
    if (game.players.some((p) => p.remaining.length === 0)) {
      game.over = true;
      game.winnerRanking = calcRanking(game);
      return;
    }
    if (game.passCount >= PLAYER_COUNT) {
      game.over = true;
      game.winnerRanking = calcRanking(game);
      return;
    }
    game.currentPlayer = (game.currentPlayer + 1) % PLAYER_COUNT;
    if (!hasAnyMove(game, game.currentPlayer)) {
      game.passCount += 1;
      advanceTurn(game);
    }
  }

  function calcRanking(game) {
    return game.players
      .map((p) => {
        let cells = 0;
        for (const i of p.remaining) cells += PIECES[i].size;
        return { index: p.index, remaining: p.remaining.length, cells };
      })
      .sort((a, b) => a.remaining - b.remaining || a.cells - b.cells);
  }

  const api = {
    BOARD_SIZE,
    PLAYER_COUNT,
    COLORS,
    COLOR_NAMES,
    CORNERS,
    PIECES,
    createGame,
    isPlacementValid,
    hasAnyMove,
    listMoves,
    placePiece,
    pass,
    advanceTurn,
    calcRanking,
    normalizeCells: normalize,
  };

  global.Blokus = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
