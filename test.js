const B = require('./game.js');

let failures = 0;
function check(name, cond) {
  if (cond) console.log('OK  ' + name);
  else { console.log('NG  ' + name); failures++; }
}

const expectedSizes = [1, 2, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];

check('ピースは21種', B.PIECES.length === 21);
check('合計マス数は89', B.PIECES.reduce((s, p) => s + p.size, 0) === 89);

for (let i = 0; i < B.PIECES.length; i++) {
  const p = B.PIECES[i];
  check('サイズ ' + p.name + ' = ' + expectedSizes[i], p.size === expectedSizes[i]);
  check('向きが1つ以上ある ' + p.name, p.orientations.length >= 1);
  check('向きの数が1/2/4/8のいずれか ' + p.name,
    [1, 2, 4, 8].includes(p.orientations.length));

  for (const cells of p.orientations) {
    check('向きのサイズが正しい ' + p.name, cells.length === p.size);
    check('向きのセルが連結 ' + p.name, (function () {
      const seen = new Set();
      const queue = [cells[0]];
      seen.add(cells[0].join(','));
      while (queue.length) {
        const [r, c] = queue.pop();
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const key = (r + dr) + ',' + (c + dc);
          if (!seen.has(key) && cells.some((x) => x[0] === r + dr && x[1] === c + dc)) {
            seen.add(key);
            queue.push([r + dr, c + dc]);
          }
        }
      }
      return seen.size === p.size;
    })());
  }
}

const allKeys = new Set();
let duplicateShape = false;
for (const p of B.PIECES) {
  for (const cells of p.orientations) {
    const k = cells.map((x) => x.join(',')).join(';');
    if (allKeys.has(k)) duplicateShape = true;
    allKeys.add(k);
  }
}
check('21種が全て異なる形(回転・反転の重複なし)', duplicateShape === false);

const g = B.createGame();
const mono = B.PIECES[0].orientations[0];

check('最初の手は角以外に置けない', B.isPlacementValid(g, 0, mono, 3, 3) === false);
check('最初の手は自分の角に置ける(赤=左上)', B.isPlacementValid(g, 0, mono, 0, 0) === true);
check('青は右上の角から開始', B.isPlacementValid(g, 1, mono, 0, 19) === true);
check('緑は右下の角から開始', B.isPlacementValid(g, 2, mono, 19, 19) === true);
check('黄は左下の角から開始', B.isPlacementValid(g, 3, mono, 19, 0) === true);

B.placePiece(g, 0, 0, mono, 0, 0);
check('配置後ボードに反映される', g.board[0][0] === 0);
check('手持ちが21→20枚になる', g.players[0].remaining.length === 20);
check('ターンが進む', g.currentPlayer === 1);

const domino = B.PIECES[1];
const horDomino = domino.orientations.find((cells) =>
  cells.length === 2 && cells[0][0] === cells[1][0] && cells[0][1] === 0 && cells[1][1] === 1);

check('同じ色と辺で接する配置は禁止', B.isPlacementValid(g, 0, horDomino, 0, 1) === false);
check('同じ色と辺で接する配置は禁止(下方向)', B.isPlacementValid(g, 0, horDomino, 1, -1) === false);
check('角で接する配置は可能', B.isPlacementValid(g, 0, mono, 1, 1) === true);
check('接続しない配置は禁止', B.isPlacementValid(g, 0, mono, 5, 5) === false);

const g2 = B.createGame();
g2.players[0].hasPlaced = true;
g2.board[4][4] = 0;
g2.board[6][6] = 0;
g2.board[4][5] = 1;
g2.board[5][4] = 1;
check('他色と辺で接しても配置可能', B.isPlacementValid(g2, 0, mono, 5, 5) === true);
check('他色と辺で接して自分の色と辺で接するのは禁止', B.isPlacementValid(g2, 0, mono, 4, 4) === false);

const g3 = B.createGame();
for (let i = 0; i < B.PLAYER_COUNT; i++) {
  check('全プレイヤーは初期状態で置ける場所がある', B.hasAnyMove(g3, i) === true);
}

const g4 = B.createGame();
for (let i = 0; i < 4; i++) B.pass(g4);
check('4人連続パスでゲーム終了', g4.over === true);

const g5 = B.createGame();
g5.players[0].remaining = g5.players[0].remaining.filter((i) => i !== 0);
g5.players[1].remaining = g5.players[1].remaining.filter((i) => i !== 0 && i !== 1);
const rank = B.calcRanking(g5);
check('ランキング:残り枚数の少ない方が上位', rank[0].index === 1 && rank[1].index === 0);

console.log(failures === 0 ? '\nALL PASS' : '\n' + failures + ' FAIL');
process.exit(failures === 0 ? 0 : 1);
