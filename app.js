(function () {
  'use strict';

  const B = Blokus;
  const DIAG = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
  const CPU_DELAY = 600;

  let game = B.createGame();
  let humanPlayer = 0;
  let busy = false;
  let selectedPiece = null;
  let orientation = null;
  let hoverPos = null;
  let prevGhost = [];

  const boardEl = document.getElementById('board');
  const handEl = document.getElementById('hand');
  const statusEl = document.getElementById('status');
  const turnEl = document.getElementById('turnInfo');
  const handTitleEl = document.getElementById('handTitle');
  const hintEl = document.getElementById('hint');
  const overlayEl = document.getElementById('overlay');
  const resultEl = document.getElementById('result');
  const humanColorEl = document.getElementById('humanColor');
  const boardEls = [];

  function isHumanTurn() {
    return !game.over && !busy && game.currentPlayer === humanPlayer;
  }

  function initBoard() {
    for (let r = 0; r < B.BOARD_SIZE; r++) {
      boardEls[r] = [];
      for (let c = 0; c < B.BOARD_SIZE; c++) {
        const div = document.createElement('div');
        div.className = 'cell';
        div.addEventListener('mousemove', () => {
          hoverPos = { r, c };
          renderGhost();
        });
        div.addEventListener('click', () => onCellClick(r, c));
        boardEl.appendChild(div);
        boardEls[r][c] = div;
      }
    }
    boardEl.addEventListener('mouseleave', () => {
      hoverPos = null;
      renderGhost();
    });
  }

  function render() {
    renderBoard();
    renderStatus();
    renderTurn();
    renderHand();
  }

  function renderBoard() {
    for (let r = 0; r < B.BOARD_SIZE; r++) {
      for (let c = 0; c < B.BOARD_SIZE; c++) {
        const div = boardEls[r][c];
        const owner = game.board[r][c];
        div.style.background = owner === null ? '' : B.COLORS[owner];
      }
    }
    renderGhost();
  }

  function renderGhost() {
    for (const [r, c] of prevGhost) {
      boardEls[r][c].classList.remove('ghost-ok', 'ghost-bad');
    }
    prevGhost = [];
    if (selectedPiece === null || game.over || hoverPos === null) return;
    if (game.currentPlayer !== humanPlayer) return;
    const valid = B.isPlacementValid(game, game.currentPlayer, orientation, hoverPos.r, hoverPos.c);
    for (const [dr, dc] of orientation) {
      const r = hoverPos.r + dr;
      const c = hoverPos.c + dc;
      if (r < 0 || c < 0 || r >= B.BOARD_SIZE || c >= B.BOARD_SIZE) continue;
      if (game.board[r][c] !== null) continue;
      boardEls[r][c].classList.add(valid ? 'ghost-ok' : 'ghost-bad');
      prevGhost.push([r, c]);
    }
  }

  function renderStatus() {
    statusEl.innerHTML = '';
    for (let i = 0; i < B.PLAYER_COUNT; i++) {
      const p = game.players[i];
      const div = document.createElement('div');
      div.className = 'playerStatus' + (i === game.currentPlayer ? ' current' : '');
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.style.background = B.COLORS[i];
      div.appendChild(chip);
      const label = i === humanPlayer ? 'あなた' : 'CPU';
      div.appendChild(document.createTextNode(B.COLOR_NAMES[i] + '（' + label + '） 残り:' + p.remaining.length + '枚'));
      statusEl.appendChild(div);
    }
  }

  function renderTurn() {
    const who = game.currentPlayer === humanPlayer
      ? 'あなた（' + B.COLOR_NAMES[game.currentPlayer] + '）'
      : B.COLOR_NAMES[game.currentPlayer] + '（CPU）';
    const note = (busy && game.currentPlayer !== humanPlayer) ? ' - 思考中...' : '';
    turnEl.innerHTML = '現在の手番: <span style="color:' + B.COLORS[game.currentPlayer] + '; font-weight:bold">'
      + who + '</span>' + note;
  }

  function renderHand() {
    const player = game.players[game.currentPlayer];
    const active = isHumanTurn();
    handTitleEl.textContent = B.COLOR_NAMES[game.currentPlayer]
      + (active ? 'の手番' : '（' + (game.currentPlayer === humanPlayer ? 'あなた' : 'CPU') + '）')
      + ' - 手持ち ' + player.remaining.length + ' 枚';
    handEl.innerHTML = '';
    for (const pi of player.remaining) {
      const piece = B.PIECES[pi];
      const cells = piece.orientations[0];
      const w = cells.reduce((m, x) => Math.max(m, x[1]), 0) + 1;
      const h = cells.reduce((m, x) => Math.max(m, x[0]), 0) + 1;
      const btn = document.createElement('button');
      btn.className = 'pieceBtn' + (pi === selectedPiece ? ' selected' : '');
      btn.title = piece.name;
      btn.disabled = !active;
      btn.style.gridTemplateColumns = 'repeat(' + w + ', 14px)';
      btn.style.gridTemplateRows = 'repeat(' + h + ', 14px)';
      for (let rr = 0; rr < h; rr++) {
        for (let cc = 0; cc < w; cc++) {
          const cell = document.createElement('div');
          cell.className = 'pcell';
          if (cells.some((x) => x[0] === rr && x[1] === cc)) {
            cell.style.background = B.COLORS[game.currentPlayer];
          }
          btn.appendChild(cell);
        }
      }
      btn.addEventListener('click', () => selectPiece(pi));
      handEl.appendChild(btn);
    }
    if (!active) {
      hintEl.textContent = game.currentPlayer === humanPlayer ? 'CPUのターンです。' : 'CPUが考え中です...';
    } else {
      hintEl.textContent = selectedPiece === null
        ? 'ピースをクリックして選択してください。'
        : '選択中: ' + B.PIECES[selectedPiece].name + '（R:回転 / F:反転）ボード上の空きマスをクリックで配置。';
    }
  }

  function selectPiece(pi) {
    if (!isHumanTurn()) return;
    if (selectedPiece === pi) {
      selectedPiece = null;
      orientation = null;
    } else {
      selectedPiece = pi;
      orientation = B.PIECES[pi].orientations[0];
    }
    hoverPos = null;
    renderGhost();
    renderHand();
  }

  function rotateCurrent() {
    if (!isHumanTurn() || orientation === null) return;
    orientation = B.normalizeCells(orientation.map(([r, c]) => [c, -r]));
    renderGhost();
    renderHand();
  }

  function flipCurrent() {
    if (!isHumanTurn() || orientation === null) return;
    orientation = B.normalizeCells(orientation.map(([r, c]) => [r, -c]));
    renderGhost();
    renderHand();
  }

  function onCellClick(r, c) {
    if (!isHumanTurn()) return;
    if (selectedPiece === null) return;
    if (B.isPlacementValid(game, game.currentPlayer, orientation, r, c)) {
      B.placePiece(game, game.currentPlayer, selectedPiece, orientation, r, c);
      selectedPiece = null;
      orientation = null;
      hoverPos = null;
      render();
      checkGameOver();
      maybeRunCpu();
    }
  }

  function doPass() {
    if (!isHumanTurn()) return;
    B.pass(game);
    selectedPiece = null;
    orientation = null;
    hoverPos = null;
    render();
    checkGameOver();
    maybeRunCpu();
  }

  function cpuScore(m, board) {
    let s = 0;
    for (const [dr, dc] of m.cells) {
      for (const [er, ec] of DIAG) {
        const rr = m.r + dr + er;
        const cc = m.c + dc + ec;
        if (rr >= 0 && cc >= 0 && rr < B.BOARD_SIZE && cc < B.BOARD_SIZE && board[rr][cc] === null) {
          s++;
        }
      }
    }
    return s;
  }

  function chooseCpuMove(moves) {
    const maxCells = moves.reduce((mx, x) => Math.max(mx, x.cells.length), 0);
    const biggest = moves.filter((m) => m.cells.length === maxCells);
    let best = biggest[0];
    let bestScore = -1;
    for (const m of biggest) {
      const s = cpuScore(m, game.board);
      if (s > bestScore) {
        bestScore = s;
        best = m;
      }
    }
    return best;
  }

  function maybeRunCpu() {
    if (game.over) return;
    if (game.currentPlayer === humanPlayer) return;
    if (busy) return;
    busy = true;
    selectedPiece = null;
    orientation = null;
    hoverPos = null;
    render();
    setTimeout(() => {
      const moves = B.listMoves(game, game.currentPlayer);
      if (moves.length === 0) {
        B.pass(game);
      } else {
        const move = chooseCpuMove(moves);
        B.placePiece(game, game.currentPlayer, move.pieceIndex, move.cells, move.r, move.c);
      }
      busy = false;
      render();
      checkGameOver();
      maybeRunCpu();
    }, CPU_DELAY);
  }

  function checkGameOver() {
    if (!game.over) return;
    const list = game.winnerRanking;
    let html = '<h2>ゲーム終了</h2><ol>';
    list.forEach((rank, i) => {
      const label = rank.index === humanPlayer ? 'あなた' : 'CPU';
      html += '<li style="color:' + B.COLORS[rank.index] + '">'
        + (i + 1) + '位 ' + B.COLOR_NAMES[rank.index] + '（' + label + '）'
        + ' 残り:' + rank.remaining + '枚（残りマス:' + rank.cells + '）</li>';
    });
    html += '</ol>';
    resultEl.innerHTML = html;
    overlayEl.classList.remove('hidden');
  }

  function restart() {
    humanPlayer = parseInt(humanColorEl.value, 10);
    game = B.createGame();
    selectedPiece = null;
    orientation = null;
    hoverPos = null;
    prevGhost = [];
    busy = false;
    overlayEl.classList.add('hidden');
    render();
    maybeRunCpu();
  }

  document.getElementById('btnRotate').addEventListener('click', rotateCurrent);
  document.getElementById('btnFlip').addEventListener('click', flipCurrent);
  document.getElementById('btnPass').addEventListener('click', doPass);
  document.getElementById('btnRestart').addEventListener('click', restart);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') rotateCurrent();
    else if (e.key === 'f' || e.key === 'F') flipCurrent();
  });

  initBoard();
  const qs = new URLSearchParams(location.search);
  const qHuman = qs.get('human');
  if (qHuman !== null) humanPlayer = parseInt(qHuman, 10) || 0;
  render();
  maybeRunCpu();
})();
