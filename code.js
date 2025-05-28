let lastBoardString, lastBoardState, moveSequence = '', headPlayer = 1;

// Convert 2D board array to string for easy comparison
const boardToString = b => b.map(r => r.join('')).join('|');

// Find column of the last move by comparing previous and current board states
function findLastMoveColumn(prev, cur) {
  for (let c = 0; c < 7; c++)
    for (let r = 5; r >= 0; r--) {
      const p = prev?.[r]?.[c] || 0, n = cur[r][c];
      if (p !== n && n !== 0) return c + 1;
    }
  return null;
}

function updateBestMove() {
  // Build current board state from DOM
  const board = Array.from({ length: 6 }, () => Array(7).fill(0));
  let count1 = 0, count2 = 0;

  document.querySelectorAll('[class*="grid-item"][class*="cell"]').forEach(cell => {
    if (!cell.querySelector('svg.animated.tin-in')) return;

    const m = cell.className.match(/cell-(\d+)-(\d+)/);
    if (!m) return;

    let y = +m[1] - 1, x = +m[2] - 1;
    if (x < 0 || x >= 7 || y < 0 || y >= 6) return;

    if (cell.querySelector('.circle-light')) board[y][x] = 2, count2++;
    else if (cell.querySelector('.circle-dark')) board[y][x] = 1, count1++;
  });

  const currentBoardString = boardToString(board);
  if (currentBoardString === lastBoardString) return; // No changes

  if (currentBoardString === '0000000|0000000|0000000|0000000|0000000|0000000') {
    moveSequence = ''; // Reset if board empty
  }

  // Determine starting player on first move
  if (count1 + count2 === 1) headPlayer = count1 >= count2 ? 1 : 2;

  const playerToMove = headPlayer !== 2
    ? (count1 <= count2 ? 1 : 2)
    : (count1 >= count2 ? 2 : 1);

  const lastMoveCol = findLastMoveColumn(lastBoardState, board);
  if (lastMoveCol !== null) moveSequence += lastMoveCol;

  lastBoardState = JSON.parse(JSON.stringify(board));
  lastBoardString = currentBoardString;

  // Remove previous evaluations
  document.querySelectorAll('.col-eval').forEach(e => e.remove());
  if (!moveSequence.length) return;

  // Fetch best move evaluations and display
  fetch(`https://connect4.gamesolver.org/solve?pos=${moveSequence}`)
    .then(r => r.json())
    .then(data => {
      let bestCol = -1, bestScore = -Infinity;
      data.score.forEach((s, c) => {
        if (s !== 100 && s > bestScore) bestScore = s, bestCol = c;
      });

      data.score.forEach((score, col) => {
        if (score === 100) return;

        let text = '-', color = 'gray';
        if (score > 0) text = score.toString(), color = '#00BB00';
        else if (score < 0) text = (-score).toString(), color = 'red';
        if (col === bestCol) text = `[${text}]`;

        const cell = document.querySelector(`.grid-item.cell-1-${col + 1}`);
        if (!cell) return;

        const div = document.createElement('div');
        div.textContent = text;
        div.classList.add('col-eval');
        Object.assign(div.style, {
          position: 'absolute', fontSize: '28px', fontWeight: 'bold', color,
          userSelect: 'none', pointerEvents: 'none', zIndex: 1000, textDecoration: 'none'
        });

        const rect = cell.getBoundingClientRect();
        div.style.top = `${window.scrollY + rect.top - 40}px`;
        div.style.left = `${window.scrollX + rect.left + rect.width / 2}px`;
        div.style.transform = 'translateX(-50%)';
        document.body.appendChild(div);
      });
    })
    .catch(e => console.error('Error requesting solver:', e));
}

// Checking board for updates every 30ms
setInterval(updateBestMove, 30);
