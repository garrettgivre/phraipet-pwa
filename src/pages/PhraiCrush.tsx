import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './PhraiCrush.css';

// Core constants
const BOARD_SIZE = 8;
const MOVES_PER_GAME = 30;
const COLORS = ['#e74c3c', '#27ae60', '#3498db', '#f1c40f', '#9b59b6', '#e67e22'] as const;

type TileColor = (typeof COLORS)[number];
type Special = 'stripedH' | 'stripedV' | 'wrapped' | 'colorBomb';

interface Tile {
  id: number;
  color: TileColor;
  special: Special | null;
}

type Cell = Tile | null;
type Board = Cell[][]; // [row][col]

interface Position {
  row: number;
  col: number;
}

// Helpers
let tileIdCounter = 1;
const randomColor = (): TileColor => {
  const idx = Math.floor(Math.random() * COLORS.length);
  return COLORS[idx] ?? COLORS[0];
};

const createTile = (color?: TileColor, special?: Special | null): Tile => ({
  id: tileIdCounter++,
  color: color ?? randomColor(),
  special: special ?? null,
});

const inBounds = (row: number, col: number): boolean =>
  row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;

const areAdjacent = (a: Position, b: Position): boolean => {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
};

const getCell = (b: Board, r: number, c: number): Cell =>
  r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE ? b[r]?.[c] ?? null : null;

type MatchEffects = {
  matched: Set<string>;
  rowClears: number[]; // rows with 4+ in a row
  colClears: number[]; // cols with 4+ in a col
  bombs: Array<{ r: number; c: number; color: TileColor }>; // 2x2 squares
};

// Find all positions part of any match and detect special patterns
const computeMatchesDetailed = (board: Board): MatchEffects => {
  const matched = new Set<string>();
  const rowClears: number[] = [];
  const colClears: number[] = [];
  const bombs: Array<{ r: number; c: number; color: TileColor }> = [];

  // Horizontal grouped runs
  for (let r = 0; r < BOARD_SIZE; r++) {
    let c = 0;
    while (c < BOARD_SIZE) {
      const start = c;
      const startCell = getCell(board, r, c);
      if (!startCell) {
        c += 1;
        continue;
      }
      const color = startCell.color;
      while (c + 1 < BOARD_SIZE) {
        const nextCell = getCell(board, r, c + 1);
        if (nextCell && nextCell.color === color) c += 1; else break;
      }
      const runLen = c - start + 1;
      if (runLen >= 3) {
        for (let cc = start; cc <= c; cc++) matched.add(`${r},${cc}`);
        if (runLen >= 4) rowClears.push(r);
      }
      c += 1;
    }
  }

  // Vertical grouped runs
  for (let c = 0; c < BOARD_SIZE; c++) {
    let r = 0;
    while (r < BOARD_SIZE) {
      const start = r;
      const startCell = getCell(board, r, c);
      if (!startCell) {
        r += 1;
        continue;
      }
      const color = startCell.color;
      while (r + 1 < BOARD_SIZE) {
        const nextCell = getCell(board, r + 1, c);
        if (nextCell && nextCell.color === color) r += 1; else break;
      }
      const runLen = r - start + 1;
      if (runLen >= 3) {
        for (let rr = start; rr <= r; rr++) matched.add(`${rr},${c}`);
        if (runLen >= 4) colClears.push(c);
      }
      r += 1;
    }
  }

  // 2x2 squares
  for (let r = 0; r < BOARD_SIZE - 1; r++) {
    for (let c = 0; c < BOARD_SIZE - 1; c++) {
      const a = getCell(board, r, c);
      const b = getCell(board, r, c + 1);
      const d = getCell(board, r + 1, c);
      const e = getCell(board, r + 1, c + 1);
      if (!a || !b || !d || !e) continue;
      if (a.color === b.color && a.color === d.color && a.color === e.color) {
        matched.add(`${r},${c}`);
        matched.add(`${r},${c + 1}`);
        matched.add(`${r + 1},${c}`);
        matched.add(`${r + 1},${c + 1}`);
        bombs.push({ r: r + 0, c: c + 0, color: a.color });
      }
    }
  }

  return { matched, rowClears, colClears, bombs };
};

// Backward-compatible simple matcher for initial board generation
const findMatches = (board: Board): Set<string> => computeMatchesDetailed(board).matched;

// Check whether swapping a<->b yields any match
const isValidSwap = (board: Board, a: Position, b: Position): boolean => {
  if (!areAdjacent(a, b)) return false;
  const copy = board.map((row) => row.slice());
  const aCell = copy[a.row]?.[a.col] ?? null;
  const bCell = copy[b.row]?.[b.col] ?? null;
  copy[a.row]![a.col] = bCell;
  copy[b.row]![b.col] = aCell;
  return findMatches(copy).size > 0;
};

// Remove matches, apply gravity, and refill. Returns score gained for this cascade and whether anything changed.

// Ensure initial board has no immediate matches
const generateInitialBoard = (): Board => {
  const board: Board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null as Cell)
  );
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      board[r]![c] = createTile();
    }
  }
  let matches = findMatches(board);
  let guard = 0;
  while (matches.size > 0 && guard < 100) {
    matches.forEach((key) => {
      const [rStr, cStr] = key.split(',');
      const r = Number(rStr);
      const c = Number(cStr);
      board[r]![c] = createTile();
    });
    matches = findMatches(board);
    guard++;
  }
  return board;
};

export default function PhraiCrush() {
  const navigate = useNavigate();

  const [board, setBoard] = useState<Board>(() => generateInitialBoard());
  const [selected, setSelected] = useState<Position | null>(null);
  const [moves, setMoves] = useState<number>(MOVES_PER_GAME);
  const [score, setScore] = useState<number>(0);
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [swipeStart, setSwipeStart] = useState<(Position & { x: number; y: number }) | null>(null);
  const [vanishingIds, setVanishingIds] = useState<Set<number>>(new Set());
  // const [swappingIds, setSwappingIds] = useState<Set<number>>(new Set());
  const [fallingIds, setFallingIds] = useState<Set<number>>(new Set());
  const [spawningIds, setSpawningIds] = useState<Set<number>>(new Set());
  const [spawnOffsets, setSpawnOffsets] = useState<Map<number, number>>(new Map());
  const [spawnsArmed, setSpawnsArmed] = useState<boolean>(true);
  const [tileDurations, setTileDurations] = useState<Map<number, number>>(new Map());
  type Particle = { id: number; x: number; y: number; color: string; size: number; dx: number; dy: number };
  const [particles, setParticles] = useState<Particle[]>([]);
  const [rowFlash, setRowFlash] = useState<number | null>(null);
  const [colFlash, setColFlash] = useState<number | null>(null);

  const computeTileSize = (): number => {
    const padding = 24;
    const maxWidth = Math.min(window.innerWidth, 520);
    const maxHeight = Math.min(window.innerHeight - 160, 720);
    const size = Math.floor(
      Math.min((maxWidth - padding) / BOARD_SIZE, (maxHeight - padding) / BOARD_SIZE)
    );
    return Math.max(32, Math.min(64, size));
  };
  const [tileSize, setTileSize] = useState<number>(() => computeTileSize());
  useEffect(() => {
    const onResize = () => setTileSize(computeTileSize());
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true } as any);
    return () => {
      window.removeEventListener('resize', onResize as any);
      window.removeEventListener('orientationchange', onResize as any);
    };
  }, []);

  const handleNewGame = useCallback(() => {
    tileIdCounter = 1;
    setBoard(generateInitialBoard());
    setSelected(null);
    setMoves(MOVES_PER_GAME);
    setScore(0);
    setIsResolving(false);
    setGameOver(false);
  }, []);

  // Process cascades starting from a specific board state
  const processCascadesFrom = useCallback(async (start: Board) => {
    if (isResolving) return;
    setIsResolving(true);

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    let cascade = 0;
    let working = start.map((row) => row.slice());

    while (true) {
      // Detect matches without mutating first
      const { matched, rowClears, colClears, bombs } = computeMatchesDetailed(working);
      if (matched.size === 0) break;

      // Mark vanishing tiles for animation
      const idsToVanish: number[] = [];
      const particlesToAdd: Particle[] = [];
      matched.forEach((key) => {
        const [rStr, cStr] = key.split(',');
        const r = Number(rStr);
        const c = Number(cStr);
        const t = working[r]?.[c];
        if (t && t.id != null) {
          idsToVanish.push(t.id);
          // Spawn burst particles from tile center
          const baseX = 8 + c * (tileSize + 4) + tileSize / 2;
          const baseY = 8 + r * (tileSize + 4) + tileSize / 2;
          const count = 10;
          for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
            const dist = (tileSize * 0.4) + Math.random() * (tileSize * 0.6);
            const dx = Math.cos(angle) * dist;
            const dy = Math.sin(angle) * dist;
            const size = Math.max(3, Math.min(7, 3 + Math.floor(Math.random() * 6)));
            particlesToAdd.push({
              id: Date.now() + Math.floor(Math.random() * 1000000) + i,
              x: baseX,
              y: baseY,
              color: t.color,
              size,
              dx,
              dy,
            });
          }
        }
      });
      setVanishingIds(new Set(idsToVanish));
      if (particlesToAdd.length > 0) {
        setParticles((prev) => [...prev, ...particlesToAdd]);
        const toRemoveIds = particlesToAdd.map((p) => p.id);
        // Clean up particles after animation ends
        window.setTimeout(() => {
          setParticles((prev) => prev.filter((p) => !toRemoveIds.includes(p.id)));
        }, 600);
      }

      // Score gain before removal
      const scoreGained = matched.size * 10 + (rowClears.length + colClears.length) * 20 + bombs.length * 40;
      cascade += 1;
      const multiplier = 1 + (cascade - 1) * 0.5;
      setScore((prev) => prev + Math.floor(scoreGained * multiplier));

      // Let vanish animation play
      // eslint-disable-next-line no-await-in-loop
      await delay(200);

      // Trigger visual effects for powerups
      if (rowClears.length > 0) {
        setRowFlash(rowClears[0]!);
        window.setTimeout(() => setRowFlash(null), 350);
      }
      if (colClears.length > 0) {
        setColFlash(colClears[0]!);
        window.setTimeout(() => setColFlash(null), 350);
      }

      // Decide special tile spawns and remove matches
      // Priority: 5-in-a-row => colorBomb, 2x2 => wrapped, 4-in-a-row => striped
      let spawnedSpecial: { r: number; c: number; special: Special; color?: TileColor } | null = null;

      // Check for 5-in-a-row horizontally or vertically at any matched cell
      // Simple heuristic: if any row/col has run >=5, place colorBomb at the first cell of that run
      let hasFive = false;
      for (let r = 0; r < BOARD_SIZE; r++) {
        let c = 0;
        while (c < BOARD_SIZE) {
          const start = c;
          const t = working[r]?.[c];
          if (!t) { c++; continue; }
          const col = t.color;
          while (c + 1 < BOARD_SIZE && working[r]?.[c + 1]?.color === col) c++;
          const len = c - start + 1;
          if (len >= 5) {
            spawnedSpecial = { r, c: start, special: 'colorBomb' };
            hasFive = true;
            break;
          }
          c++;
        }
        if (hasFive) break;
      }
      if (!hasFive) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          let r = 0;
          while (r < BOARD_SIZE) {
            const start = r;
            const t = working[r]?.[c];
            if (!t) { r++; continue; }
            const col = t.color;
            while (r + 1 < BOARD_SIZE && working[r + 1]?.[c]?.color === col) r++;
            const len = r - start + 1;
            if (len >= 5) {
              spawnedSpecial = { r: start, c, special: 'colorBomb' };
              hasFive = true;
              break;
            }
            r++;
          }
          if (hasFive) break;
        }
      }

      // If 2x2 square found, spawn wrapped candy at its top-left
      if (!hasFive && bombs.length > 0) {
        const b = bombs[0]!;
        spawnedSpecial = { r: b.r, c: b.c, special: 'wrapped', color: b.color };
      }

      // If 4+ line (but not 5), spawn striped at the center of the run
      if (!hasFive && !spawnedSpecial && (rowClears.length > 0 || colClears.length > 0)) {
        if (rowClears.length > 0) {
          const rr = rowClears[0]!;
          // find a contiguous colored run in this row (>=4) to pick color
          let best: { start: number; end: number; color: TileColor } | null = null;
          let c = 0;
          while (c < BOARD_SIZE) {
            const start = c;
            const t = working[rr]?.[c];
            if (!t) { c++; continue; }
            const col = t.color;
            while (c + 1 < BOARD_SIZE && working[rr]?.[c + 1]?.color === col) c++;
            const len = c - start + 1;
            if (len >= 4) best = { start, end: c, color: col };
            c++;
          }
          if (best) {
            const mid = Math.floor((best.start + best.end) / 2);
            spawnedSpecial = { r: rr, c: mid, special: 'stripedH', color: best.color };
          }
        } else if (colClears.length > 0) {
          const cc = colClears[0]!;
          let best: { start: number; end: number; color: TileColor } | null = null;
          let r = 0;
          while (r < BOARD_SIZE) {
            const start = r;
            const t = working[r]?.[cc];
            if (!t) { r++; continue; }
            const col = t.color;
            while (r + 1 < BOARD_SIZE && working[r + 1]?.[cc]?.color === col) r++;
            const len = r - start + 1;
            if (len >= 4) best = { start, end: r, color: col };
            r++;
          }
          if (best) {
            const mid = Math.floor((best.start + best.end) / 2);
            spawnedSpecial = { r: mid, c: cc, special: 'stripedV', color: best.color };
          }
        }
      }

      // Remove matched base tiles (but leave spot for special if any)
      matched.forEach((key) => {
        const [rStr, cStr] = key.split(',');
        const r = Number(rStr);
        const c = Number(cStr);
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
          working[r]![c] = null;
        }
      });

      // Clear matched row/col tiles (they are also null; this reinforces)
      rowClears.forEach((r) => {
        for (let c = 0; c < BOARD_SIZE; c++) working[r]![c] = null;
      });
      colClears.forEach((c) => {
        for (let r = 0; r < BOARD_SIZE; r++) working[r]![c] = null;
      });

      // Place special tile if applicable
      if (spawnedSpecial) {
        const { r, c, special, color } = spawnedSpecial;
        const baseColor = color ?? (working[r]?.[c]?.color ?? randomColor());
        working[r]![c] = createTile(baseColor, special);
      }

      // Gravity with falling/spawn tracking
      const beforePositions = new Map<number, { r: number; c: number }>();
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const t = working[r]?.[c];
          if (t && t.id != null) beforePositions.set(t.id, { r, c });
        }
      }

      const prevIds = new Set(beforePositions.keys());

      for (let c = 0; c < BOARD_SIZE; c++) {
        let write = BOARD_SIZE - 1;
        for (let r = BOARD_SIZE - 1; r >= 0; r--) {
          const cell = working[r]?.[c] ?? null;
          if (cell !== null) {
            working[write]![c] = cell; // keep column index unchanged
            if (write !== r) working[r]![c] = null;
            write--;
          }
        }
        for (let r = write; r >= 0; r--) {
          working[r]![c] = createTile();
        }
      }

      const afterPositions = new Map<number, { r: number; c: number }>();
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const t = working[r]?.[c];
          if (t && t.id != null) afterPositions.set(t.id, { r, c });
        }
      }

      const falling: number[] = [];
      const durationUpdates = new Map<number, number>();
      afterPositions.forEach((pos, id) => {
        const before = beforePositions.get(id);
        if (before && pos.r > before.r) {
          falling.push(id);
          const deltaRows = pos.r - before.r;
          // Longer, gravity-like fall duration scaled by distance
          const ms = Math.max(320, Math.min(1100, 220 * deltaRows));
          durationUpdates.set(id, ms);
        }
      });
      const spawned: number[] = [];
      afterPositions.forEach((_pos, id) => {
        if (!prevIds.has(id)) spawned.push(id);
      });

      // Compute spawn offsets per id so new tiles fall from above their column top
      const spawnOffsetUpdates = new Map<number, number>();
      if (spawned.length > 0) {
        const colToMaxRow = new Map<number, number>();
        spawned.forEach((id) => {
          const pos = afterPositions.get(id);
          if (pos) {
            const cur = colToMaxRow.get(pos.c) ?? -1;
            colToMaxRow.set(pos.c, Math.max(cur, pos.r));
          }
        });
        spawned.forEach((id) => {
          const pos = afterPositions.get(id);
          if (!pos) return;
          const maxRow = colToMaxRow.get(pos.c) ?? pos.r;
          const offsetRows = Math.max(1, maxRow - pos.r + 1);
          spawnOffsetUpdates.set(id, offsetRows);
          // Duration for spawns scales with distance too
          const ms = Math.max(320, Math.min(1100, 220 * offsetRows));
          durationUpdates.set(id, ms);
        });
      }
      setFallingIds(new Set(falling));
      setSpawningIds(new Set(spawned));
      if (durationUpdates.size > 0) {
        setTileDurations((prev) => {
          const next = new Map(prev);
          durationUpdates.forEach((ms, id) => next.set(id, ms));
          return next;
        });
      }
      if (spawnOffsetUpdates.size > 0) {
        setSpawnOffsets((prev) => {
          const next = new Map(prev);
          spawnOffsetUpdates.forEach((rows, id) => next.set(id, rows));
          return next;
        });
        // Arm on next frame to trigger transition from above to final position
        setSpawnsArmed(false);
        requestAnimationFrame(() => setSpawnsArmed(true));
      }

      // Update board and clear vanishing marks for next cycle
      setBoard(working.map((row) => row.slice()));
      setVanishingIds(new Set());
      // Allow fall animation to complete before clearing flags (based on max duration this tick)
      const maxDuration = durationUpdates.size > 0
        ? Array.from(durationUpdates.values()).reduce((a, b) => Math.max(a, b), 0)
        : 450;
      window.setTimeout(() => {
        setFallingIds(new Set());
        setSpawningIds(new Set());
        setSpawnOffsets(new Map());
      }, maxDuration + 100);

      // Small pause between cascades for readability
      // eslint-disable-next-line no-await-in-loop
      await delay(140);
    }

    setIsResolving(false);
  }, [isResolving, tileSize]);

  // Convenience wrapper (currently unused but kept for future use)
  // const processCascades = useCallback(async () => {
  //   await processCascadesFrom(board);
  // }, [board, processCascadesFrom]);

  // Auto-resolve if any matches exist on the current board (covers manual edits and edge cases)
  useEffect(() => {
    if (isResolving || gameOver) return;
    const m = findMatches(board);
    if (m.size > 0) {
      const snapshot = board.map((row) => row.slice());
      void processCascadesFrom(snapshot);
    }
  }, [board, isResolving, gameOver, processCascadesFrom]);

  // Attempt a swap and resolve if valid
  const attemptSwap = useCallback(
    (a: Position, b: Position) => {
      if (!inBounds(a.row, a.col) || !inBounds(b.row, b.col)) return;
      if (!areAdjacent(a, b)) return;
      if (isResolving || gameOver) return;

      let didSwap = false;
      let nextForResolve: Board | null = null;
      // Pre-compute swap tile ids from current board for duration tuning
      const aId = board[a.row]?.[a.col]?.id;
      const bId = board[b.row]?.[b.col]?.id;
      if (aId != null || bId != null) {
        setTileDurations((prev) => {
          const next = new Map(prev);
          if (aId != null) next.set(aId, 260);
          if (bId != null) next.set(bId, 260);
          return next;
        });
      }
      setBoard((prev) => {
        const next = prev.map((row) => row.slice());
        if (!isValidSwap(next, a, b)) {
          return prev; // invalid move leaves state unchanged
        }
        const aCell = next[a.row]?.[a.col] ?? null;
        const bCell = next[b.row]?.[b.col] ?? null;
        // Optional: track swapping tiles for extra highlight
        next[a.row]![a.col] = bCell;
        next[b.row]![b.col] = aCell;
        didSwap = true;
        nextForResolve = next.map((row) => row.slice());
        return next;
      });

      if (didSwap && nextForResolve) {
        setMoves((prev) => prev - 1);
        setSelected(null);
        // Resolve cascades from the swapped board to avoid stale closures
        void processCascadesFrom(nextForResolve);
        // Optional: clear swapping highlight after motion
      }
    },
    [board, isResolving, gameOver, processCascadesFrom]
  );

  // Swipe helpers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>, row: number, col: number) => {
      if (gameOver) return;
      setSelected({ row, col });
      setSwipeStart({ row, col, x: e.clientX, y: e.clientY });
      try {
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      } catch {
        /* noop */
      }
    },
    [gameOver]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!swipeStart || isResolving || gameOver) return;
      const dx = e.clientX - swipeStart.x;
      const dy = e.clientY - swipeStart.y;
      const threshold = 10; // px before committing a swipe
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

      // Determine primary direction
      const horizontal = Math.abs(dx) >= Math.abs(dy);
      let target: Position = { row: swipeStart.row, col: swipeStart.col };
      if (horizontal) {
        target = { row: swipeStart.row, col: swipeStart.col + (dx > 0 ? 1 : -1) };
      } else {
        target = { row: swipeStart.row + (dy > 0 ? 1 : -1), col: swipeStart.col };
      }

      if (inBounds(target.row, target.col)) {
        attemptSwap({ row: swipeStart.row, col: swipeStart.col }, target);
      }
      setSwipeStart(null);
    },
    [swipeStart, attemptSwap, isResolving, gameOver]
  );

  const handlePointerUp = useCallback(() => {
    setSwipeStart(null);
  }, []);



  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (gameOver) return;
      const pos = { row, col };
      if (!selected) {
        setSelected(pos);
        return;
      }
      if (selected.row === row && selected.col === col) {
        setSelected(null);
        return;
      }
      if (areAdjacent(selected, pos)) {
        attemptSwap(selected, pos);
        return;
      }
      setSelected(pos);
    },
    [selected, attemptSwap, gameOver]
  );

  // End game when out of moves and resolution is finished
  useEffect(() => {
    if (moves > 0 || isResolving) return;
    setGameOver(true);
  }, [moves, isResolving]);

  // Styles
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    height: '100vh',
    // Leave room for the app header
    paddingTop: 'calc(96px + env(safe-area-inset-top))',
  };

  const boardStyle: React.CSSProperties = {
    position: 'relative',
    width: BOARD_SIZE * (tileSize + 4) - 4 + 16,
    height: BOARD_SIZE * (tileSize + 4) - 4 + 16,
    padding: 8,
    borderRadius: 12,
    background: 'rgba(0,0,0,0.25)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
  };

  const gridOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 8,
    display: 'grid',
    gridTemplateColumns: `repeat(${BOARD_SIZE}, ${tileSize}px)`,
    gridTemplateRows: `repeat(${BOARD_SIZE}, ${tileSize}px)`,
    gap: 4,
    pointerEvents: 'none',
  };

  const topBarStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: 'min(520px, 95vw)',
    marginBottom: 12,
    color: '#fff',
    fontWeight: 700,
  };

  const statPill: React.CSSProperties = {
    background: 'rgba(0,0,0,0.35)',
    padding: '8px 12px',
    borderRadius: 12,
  };

  const buttonStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.7)',
    color: '#fff',
    border: '2px solid rgba(255,255,255,0.3)',
    borderRadius: 10,
    padding: '8px 12px',
    fontWeight: 700,
    cursor: 'pointer',
  };

  return (
    <div className="phraicrush-container" style={containerStyle}>
      <div style={topBarStyle}>
        <button style={buttonStyle} onClick={() => { void navigate('/play'); }}>← Back</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={statPill}>Score: {score.toLocaleString()}</div>
          <div style={statPill}>Moves: {moves}</div>
        </div>
        <button style={buttonStyle} onClick={handleNewGame}>New Game</button>
      </div>

      <div style={boardStyle} className="crush-board" aria-label="Candy board" role="grid">
        {/* Grid overlay for cells */}
        <div style={gridOverlayStyle} className="crush-board-grid">
          {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, i) => (
            <div key={`grid-${i}`} className="crush-grid-cell" />
          ))}
          {rowFlash != null && (
            <div
              className="row-flash"
              style={{
                gridColumn: `1 / ${BOARD_SIZE + 1}`,
                gridRow: `${rowFlash + 1} / ${rowFlash + 2}`,
              }}
            />
          )}
          {colFlash != null && (
            <div
              className="col-flash"
              style={{
                gridRow: `1 / ${BOARD_SIZE + 1}`,
                gridColumn: `${colFlash + 1} / ${colFlash + 2}`,
              }}
            />
          )}
        </div>

        {/* Absolute-positioned tiles with transforms */}
        {board.map((row, r) =>
          row.map((cell, c) => {
            if (!cell) return null;
            const x = 8 + c * (tileSize + 4);
            let y = 8 + r * (tileSize + 4);
            // If tile was just spawned and not armed yet, start it above the board by its spawn offset rows
            const spawnRows = spawnOffsets.get(cell.id);
            if (spawnRows && !spawnsArmed) {
              y -= spawnRows * (tileSize + 4);
            }
            const isSelected = selected && selected.row === r && selected.col === c;
            const classes = [
              'tile',
              fallingIds.has(cell.id) ? 'falling' : '',
              spawningIds.has(cell.id) ? 'spawning' : '',
            ].filter(Boolean).join(' ');
            const innerClasses = [
              'tile-inner',
              vanishingIds.has(cell.id) ? 'vanish' : '',
              spawningIds.has(cell.id) ? 'spawning' : '',
              fallingIds.has(cell.id) ? 'falling' : '',
              cell.special ? `special ${cell.special}` : '',
            ].filter(Boolean).join(' ');

            const isFallingOrSpawn = fallingIds.has(cell.id) || spawnOffsets.has(cell.id);
            const style: React.CSSProperties = {
              width: tileSize,
              height: tileSize,
              transform: `translate3d(${x}px, ${y}px, 0)`,
              outline: isSelected ? '3px solid #FFD700' : '2px solid rgba(255,255,255,0.15)',
              transitionDuration: `${tileDurations.get(cell.id) ?? (fallingIds.has(cell.id) || spawnOffsets.has(cell.id) ? 520 : 300)}ms`,
              transitionTimingFunction: isFallingOrSpawn ? 'cubic-bezier(0.2, 0.8, 0.2, 1)' : undefined,
            };
            return (
              <button
                key={cell.id}
                className={classes}
                role="gridcell"
                aria-label={`Cell ${r},${c}`}
                onClick={() => handleCellClick(r, c)}
                onPointerDown={(e) => handlePointerDown(e, r, c)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={style}
              >
                <div
                  className={innerClasses}
                  style={{
                    background: cell.color,
                    width: '100%',
                    height: '100%',
                    borderRadius: 10,
                    boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.15), inset 0 -2px 6px rgba(0,0,0,0.25)'
                  }}
                />
              </button>
            );
          })
        )}

        {/* Particle burst overlay */}
        <div className="particles-container">
          {particles.map((p) => (
            <div
              key={p.id}
              className="particle"
              style={{
                top: p.y,
                left: p.x,
                width: p.size,
                height: p.size,
                background: p.color,
                boxShadow: `0 0 8px ${p.color}`,
                // CSS variables to drive keyframes
                ['--dx' as any]: `${p.dx}px`,
                ['--dy' as any]: `${p.dy}px`,
              } as unknown as React.CSSProperties}
            />
          ))}
        </div>
      </div>

      {/* Legend / Key */}
      <div className="crush-legend">
        <div className="legend-item">
          <div className="legend-icon tile-inner special stripedH" style={{ background: '#3498db' }} />
          <div className="legend-text">Striped (Row): clears entire row</div>
        </div>
        <div className="legend-item">
          <div className="legend-icon tile-inner special stripedV" style={{ background: '#e74c3c' }} />
          <div className="legend-text">Striped (Column): clears entire column</div>
        </div>
        <div className="legend-item">
          <div className="legend-icon tile-inner special wrapped" style={{ background: '#27ae60' }} />
          <div className="legend-text">Wrapped: 3×3 explosion</div>
        </div>
        <div className="legend-item">
          <div className="legend-icon tile-inner special colorBomb" style={{ background: '#9b59b6' }} />
          <div className="legend-text">Color Bomb: clears all tiles of a color</div>
        </div>
      </div>

      {gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-content">
            <h2>Game Over!</h2>
            <p>Final Score: {score.toLocaleString()}</p>
            <button onClick={() => { void navigate('/play'); }}>Back to Games</button>
            <button onClick={handleNewGame}>Play Again</button>
          </div>
        </div>
      )}
    </div>
  );
}


