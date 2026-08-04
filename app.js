(function () {
  'use strict';

  const B = Blokus;

  let game = B.createGame();
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
  const boardEls = [];

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
      div.appendChild(document.createTextNode(B.COLOR_NAMES[i] + ' 残り:' + p.remaining.length + '枚'));
      statusEl.appendChild(div);
    }
  }

  function renderTurn() {
    turnEl.innerHTML = '現在の手番: <span style="color:' + B.COLORS[game.currentPlayer] + '; font-weight:bold">'
      + B.COLOR_NAMES[game.currentPlayer] + '</span>';
  }

  function renderHand() {
    const player = game.players[game.currentPlayer];
    handTitleEl.textContent = B.COLOR_NAMES[game.currentPlayer] + 'の手番 - 手持ち ' + player.remaining.length + ' 枚';
    handEl.innerHTML = '';
    for (const pi of player.remaining) {
      const piece = B.PIECES[pi];
      const cells = piece.orientations[0];
      const w = cells.reduce((m, x) => Math.max(m, x[1]), 0) + 1;
      const h = cells.reduce((m, x) => Math.max(m, x[0]), 0) + 1;
      const btn = document.createElement('button');
      btn.className = 'pieceBtn' + (pi === selectedPiece ? ' selected' : '');
      btn.title = piece.name;
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
    hintEl.textContent = selectedPiece === null
      ? 'ピースをクリックして選択してください。'
      : '選択中: ' + B.PIECES[selectedPiece].name + '（R:回転 / F:反転）ボード上の空きマスをクリックで配置。';
  }

  function selectPiece(pi) {
    if (game.over) return;
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
    if (orientation === null) return;
    orientation = B.normalizeCells(orientation.map(([r, c]) => [c, -r]));
    renderGhost();
    renderHand();
  }

  function flipCurrent() {
    if (orientation === null) return;
    orientation = B.normalizeCells(orientation.map(([r, c]) => [r, -c]));
    renderGhost();
    renderHand();
  }

  function onCellClick(r, c) {
    if (game.over) return;
    if (selectedPiece === null) return;
    if (B.isPlacementValid(game, game.currentPlayer, orientation, r, c)) {
      B.placePiece(game, game.currentPlayer, selectedPiece, orientation, r, c);
      selectedPiece = null;
      orientation = null;
      hoverPos = null;
      render();
      checkGameOver();
    }
  }

  function doPass() {
    if (game.over) return;
    B.pass(game);
    selectedPiece = null;
    orientation = null;
    hoverPos = null;
    render();
    checkGameOver();
  }

  function checkGameOver() {
    if (!game.over) return;
    const list = game.winnerRanking;
    let html = '<h2>ゲーム終了</h2><ol>';
    list.forEach((rank, i) => {
      html += '<li style="color:' + B.COLORS[rank.index] + '">'
        + (i + 1) + '位 ' + B.COLOR_NAMES[rank.index]
        + ' 残り:' + rank.remaining + '枚（残りマス:' + rank.cells + '）</li>';
    });
    html += '</ol>';
    resultEl.innerHTML = html;
    overlayEl.classList.remove('hidden');
  }

  function restart() {
    game = B.createGame();
    selectedPiece = null;
    orientation = null;
    hoverPos = null;
    prevGhost = [];
    overlayEl.classList.add('hidden');
    render();
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
  render();
})();
