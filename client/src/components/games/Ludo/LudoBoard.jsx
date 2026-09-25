import { motion } from 'framer-motion';

/*
  Proper Ludo Board on a 15x15 grid:
  
  ┌──────────┐   ┌─┬─┬─┐   ┌──────────┐
  │  RED     │   │ │ │ │   │  (empty) │
  │  BASE    │   │ │ │ │   │          │
  │  (0-5,   │   │ │ │ │   │          │
  │   0-5)   │   │ │ │ │   │          │
  │          │   │ │ │ │   │          │
  └──────────┘   │ │ │ │   └──────────┘
  ┌─┬─┬─┬─┬─┬─┐ │ │ │ │ ┌─┬─┬─┬─┬─┬─┐
  ├─┼─┼─┼─┼─┼─┤ ├─┼ C ┼─┤ ├─┼─┼─┼─┼─┤
  ├─┼─┼─┼─┼─┼─┤ │ │ │ │ ├─┼─┼─┼─┼─┼─┤
  └──────────┘   │ │ │ │   └──────────┘
  ┌──────────┐   │ │ │ │   ┌──────────┐
  │  (empty) │   │ │ │ │   │  BLUE    │
  │          │   │ │ │ │   │  BASE    │
  │          │   │ │ │ │   │  (9-14,  │
  │          │   │ │ │ │   │   9-14)  │
  └──────────┘   └─┴─┴─┘   └──────────┘

  2-Player: Red (top-left) vs Blue (bottom-right)
*/

// 52-tile circular path coordinates [row, col] on the 15x15 grid
// Clockwise starting from Red's entry point
const PATH_COORDS = [
  // Red exit → going right along row 6
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],           // 0-4

  // Turn up along column 6
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],   // 5-10

  // Across top of vertical arm
  [0, 7],                                             // 11

  // Down along column 8
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],   // 12-17

  // Right along row 6
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], // 18-23

  // Down right edge
  [7, 14],                                            // 24

  // Left along row 8
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], // 25-30

  // Down along column 8
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], // 31-36

  // Across bottom
  [14, 7],                                            // 37

  // Up along column 6
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], // 38-43

  // Left along row 8
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],   // 44-49

  // Up left edge
  [7, 0],                                             // 50

  // Complete loop
  [6, 0],                                             // 51
];

// Build a lookup set for quick "is this cell on the path?" checks
const pathSet = new Set(PATH_COORDS.map(([r, c]) => `${r},${c}`));

// Safe zones (star tiles on the path)
const SAFE_POSITIONS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const safeCoordSet = new Set(
  [...SAFE_POSITIONS].map(pos => {
    const [r, c] = PATH_COORDS[pos];
    return `${r},${c}`;
  })
);

// Home stretch coordinates (the 6 tiles before the center finish)
const HOME_STRETCH = {
  red:  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  blue: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
};

// Add home stretch cells to the renderable set
const homeStretchSet = new Set();
Object.values(HOME_STRETCH).forEach(coords => {
  coords.forEach(([r, c]) => homeStretchSet.add(`${r},${c}`));
});

// Base piece starting slots (4 positions inside each base quadrant)
const BASE_SLOTS = {
  red:  [[2, 1], [2, 3], [4, 1], [4, 3]],
  blue: [[10, 11], [10, 13], [12, 11], [12, 13]],
};

// Player config matching server
const PLAYER_CONFIG = {
  red:  { startPos: 0, homeStretch: HOME_STRETCH.red },
  blue: { startPos: 26, homeStretch: HOME_STRETCH.blue },
};

// Convert piece data to grid coordinates
function getPieceGridPos(piece, color) {
  // Finished → center
  if (piece.isFinished) return [7, 7];

  // In base → one of the 4 base slots
  if (piece.isHome) {
    const idx = parseInt(piece.id.split('-')[1]);
    return BASE_SLOTS[color][idx];
  }

  // In home stretch
  if (piece.steps > 52) {
    const stretchIdx = piece.steps - 53; // 0–5
    const coords = PLAYER_CONFIG[color].homeStretch;
    return coords[Math.min(stretchIdx, coords.length - 1)];
  }

  // On main path
  const pathIdx = (PLAYER_CONFIG[color].startPos + piece.steps - 1) % 52;
  return PATH_COORDS[pathIdx] || [7, 7];
}

// Determine cell type/style for each grid cell
function getCellInfo(row, col) {
  const key = `${row},${col}`;
  const isCenter = row === 7 && col === 7;
  const isPath = pathSet.has(key);
  const isSafe = safeCoordSet.has(key);
  const isHomeStretch = homeStretchSet.has(key);

  // Base regions
  const isRedBase = row >= 0 && row <= 5 && col >= 0 && col <= 5;
  const isBlueBase = row >= 9 && row <= 14 && col >= 9 && col <= 14;

  // Inner base (where pieces sit)
  const isRedInner = row >= 1 && row <= 4 && col >= 0 && col <= 4;
  const isBlueInner = row >= 10 && row <= 13 && col >= 10 && col <= 14;

  // Unused corner bases (greyed out for 2-player)
  const isTopRight = row >= 0 && row <= 5 && col >= 9 && col <= 14;
  const isBottomLeft = row >= 9 && row <= 14 && col >= 0 && col <= 5;

  if (isCenter) {
    return { bg: 'bg-white/10', border: 'border-white/20', show: true, label: '★' };
  }

  if (isHomeStretch) {
    // Red or blue home stretch
    const isRed = HOME_STRETCH.red.some(([r, c]) => r === row && c === col);
    return {
      bg: isRed ? 'bg-red-500/20' : 'bg-blue-500/20',
      border: isRed ? 'border-red-500/25' : 'border-blue-500/25',
      show: true,
    };
  }

  if (isPath) {
    return {
      bg: isSafe ? 'bg-white/8' : 'bg-[#1e1e1e]',
      border: isSafe ? 'border-white/15' : 'border-[#2e2e2e]',
      show: true,
      label: isSafe ? '✦' : null,
    };
  }

  if (isRedBase) {
    return {
      bg: isRedInner ? 'bg-red-500/12' : 'bg-red-500/6',
      border: 'border-red-500/15',
      show: true,
    };
  }

  if (isBlueBase) {
    return {
      bg: isBlueInner ? 'bg-blue-500/12' : 'bg-blue-500/6',
      border: 'border-blue-500/15',
      show: true,
    };
  }

  if (isTopRight || isBottomLeft) {
    return { bg: 'bg-white/[0.02]', border: 'border-white/[0.04]', show: true };
  }

  // Empty cells (not part of any region)
  return { bg: 'bg-transparent', border: 'border-transparent', show: false };
}

export default function LudoBoard({ ludoState, myColor, selectablePieces, onMovePiece }) {
  if (!ludoState) return null;

  // Collect all piece positions
  const renderedPieces = [];
  ['red', 'blue'].forEach(color => {
    (ludoState.pieces[color] || []).forEach(piece => {
      const [row, col] = getPieceGridPos(piece, color);
      renderedPieces.push({ ...piece, color, row, col });
    });
  });

  // Group pieces by cell for stacking
  const piecesByCell = {};
  renderedPieces.forEach(p => {
    const key = `${p.row},${p.col}`;
    if (!piecesByCell[key]) piecesByCell[key] = [];
    piecesByCell[key].push(p);
  });

  return (
    <div className="w-full flex justify-center">
      <div
        className="relative inline-grid gap-px"
        style={{
          gridTemplateColumns: 'repeat(15, 1fr)',
          gridTemplateRows: 'repeat(15, 1fr)',
          width: 'min(88vw, 390px)',
          height: 'min(88vw, 390px)',
        }}
      >
        {Array.from({ length: 15 * 15 }, (_, i) => {
          const row = Math.floor(i / 15);
          const col = i % 15;
          const cell = getCellInfo(row, col);
          const key = `${row},${col}`;

          // Pieces on this cell
          const cellPieces = piecesByCell[key] || [];

          return (
            <div
              key={key}
              className={`
                relative flex items-center justify-center
                ${cell.show ? `${cell.bg} border ${cell.border}` : ''}
                rounded-[2px] transition-colors duration-200
              `}
              style={{ aspectRatio: '1' }}
            >
              {/* Safe zone / center marker */}
              {cell.label && (
                <span className="text-[7px] text-white/20 absolute inset-0 flex items-center justify-center select-none pointer-events-none">
                  {cell.label}
                </span>
              )}

              {/* Render pieces stacked on this cell */}
              {cellPieces.map((piece, idx) => {
                const isSelectable = selectablePieces.includes(piece.id);
                const offset = cellPieces.length > 1
                  ? { x: (idx % 2) * 6 - 3, y: Math.floor(idx / 2) * 6 - 3 }
                  : { x: 0, y: 0 };

                return (
                  <motion.button
                    key={piece.id}
                    layout
                    initial={false}
                    animate={{
                      x: offset.x,
                      y: offset.y,
                      scale: piece.isFinished ? 0.6 : 1,
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    onClick={() => isSelectable && onMovePiece(piece.id)}
                    disabled={!isSelectable}
                    className={`
                      absolute z-10 rounded-full
                      border-2 border-white/40 shadow-md
                      ${piece.color === 'red' ? 'bg-red-500' : 'bg-blue-500'}
                      ${isSelectable ? 'cursor-pointer ring-2 ring-white/50 z-20' : ''}
                      ${piece.isFinished ? 'opacity-40' : ''}
                    `}
                    style={{
                      width: 'min(4.5vw, 20px)',
                      height: 'min(4.5vw, 20px)',
                    }}
                  >
                    {/* Pulse ring for selectable pieces */}
                    {isSelectable && (
                      <motion.span
                        className="absolute inset-[-3px] rounded-full border-2 border-white/60"
                        animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
