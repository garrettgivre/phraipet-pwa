import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './PhraiCrush.css';
import { useCoins } from '../contexts/CoinsContext';

// Core constants
const BOARD_SIZE = 8;
const MOVES_PER_GAME = 30;
const COLORS = ['#e74c3c', '#27ae60', '#3498db', '#f1c40f', '#9b59b6', '#e67e22'] as const;
const COLOR_NAMES: Record<(typeof COLORS)[number], string> = {
  '#e74c3c': 'Red',
  '#27ae60': 'Green',
  '#3498db': 'Blue',
  '#f1c40f': 'Yellow',
  '#9b59b6': 'Purple',
  '#e67e22': 'Orange',
};

type TileColor = (typeof COLORS)[number];
type Special = 'stripedH' | 'stripedV' | 'wrapped' | 'colorBomb' | 'butterfly';
type PieceType = 'bottledButterfly' | 'toyBoxBlue' | 'toyBoxPink' | 'fortuneCookie' | 'fortuneSlip' | 'cookie' | 'acorn';

interface Tile {
  id: number;
  color: TileColor;
  special: Special | null;
  matchable?: boolean; // default true; if false, excluded from match detection
  pieceType?: PieceType | null; // non-matchable moving piece kinds
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
  matchable: true,
  pieceType: null,
});

const createPiece = (pieceType: PieceType): Tile => {
  // Assign a recognizable color hue per piece; visuals can be refined later
  const colorMap: Record<PieceType, TileColor> = {
    bottledButterfly: '#f1c40f' as TileColor,
    toyBoxBlue: '#3498db' as TileColor,
    toyBoxPink: '#9b59b6' as TileColor,
    fortuneSlip: '#ffffff' as TileColor,
    cookie: '#e74c3c' as TileColor,
    fortuneCookie: '#e67e22' as TileColor,
    acorn: '#27ae60' as TileColor,
  };
  return {
    id: tileIdCounter++,
    color: colorMap[pieceType] ?? randomColor(),
    special: null,
    matchable: false,
    pieceType,
  };
};

const inBounds = (row: number, col: number): boolean =>
  row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;

const areAdjacent = (a: Position, b: Position): boolean => {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
};

const getCell = (b: Board, r: number, c: number): Cell =>
  r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE ? b[r]?.[c] ?? null : null;

// (reserved)

// Compute effect area for a special at r,c (does not include null checks for caller)
const getSpecialEffectArea = (
  board: Board,
  r: number,
  c: number,
  special: Special,
  opts?: { color?: TileColor }
): Array<{ r: number; c: number }> => {
  const area: Array<{ r: number; c: number }> = [];
  if (special === 'stripedH') {
    area.push({ r, c });
    for (let cc = c - 1; cc >= 0; cc--) {
      area.push({ r, c: cc });
      const t = board[r]?.[cc];
      if (t && t.pieceType === 'cookie') break;
    }
    for (let cc = c + 1; cc < BOARD_SIZE; cc++) {
      area.push({ r, c: cc });
      const t = board[r]?.[cc];
      if (t && t.pieceType === 'cookie') break;
    }
  } else if (special === 'stripedV') {
    area.push({ r, c });
    for (let rr = r - 1; rr >= 0; rr--) {
      area.push({ r: rr, c });
      const t = board[rr]?.[c];
      if (t && t.pieceType === 'cookie') break;
    }
    for (let rr = r + 1; rr < BOARD_SIZE; rr++) {
      area.push({ r: rr, c });
      const t = board[rr]?.[c];
      if (t && t.pieceType === 'cookie') break;
    }
  } else if (special === 'wrapped') {
    for (let rr = r - 2; rr <= r + 2; rr++) {
      for (let cc = c - 2; cc <= c + 2; cc++) {
        if (inBounds(rr, cc)) area.push({ r: rr, c: cc });
      }
    }
  } else if (special === 'butterfly') {
    // Plus-shaped 1-radius hit
    const plus = [
      { r, c }, { r: r - 1, c }, { r: r + 1, c }, { r, c: c - 1 }, { r, c: c + 1 }
    ];
    plus.forEach((p) => { if (inBounds(p.r, p.c)) area.push(p); });
    // Snipes one objective-relevant tile (closest color with remaining > 0)
    // Choose the first active collectColor objective and remove one matching tile anywhere
    // Note: this function doesn't know objectives; caller will add a snipe target
  } else if (special === 'colorBomb') {
    const targetColor = opts?.color;
    if (targetColor) {
      for (let rr = 0; rr < BOARD_SIZE; rr++) {
        for (let cc = 0; cc < BOARD_SIZE; cc++) {
          const t = board[rr]?.[cc];
          if (t && t.color === targetColor) area.push({ r: rr, c: cc });
        }
      }
    } else {
      // If no color specified, clear all
      for (let rr = 0; rr < BOARD_SIZE; rr++) for (let cc = 0; cc < BOARD_SIZE; cc++) area.push({ r: rr, c: cc });
    }
  }
  return area;
};

type MatchEffects = {
  matched: Set<string>;
  rowClears: number[]; // rows with 4+ in a row
  colClears: number[]; // cols with 4+ in a col
  bombs: Array<{ r: number; c: number; color: TileColor }>; // 2x2 squares -> Butterfly
  intersections: Array<{ r: number; c: number; color: TileColor }>; // T/L intersections -> Wrapped
};

// Find all positions part of any match and detect special patterns
const computeMatchesDetailed = (board: Board): MatchEffects => {
  const matched = new Set<string>();
  const rowClears: number[] = [];
  const colClears: number[] = [];
  const bombs: Array<{ r: number; c: number; color: TileColor }> = [];
  const intersections: Array<{ r: number; c: number; color: TileColor }> = [];

  // Track run lengths per cell for L/T detection
  const horizRunLen: number[][] = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
  const vertRunLen: number[][] = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));

  // Horizontal grouped runs
  for (let r = 0; r < BOARD_SIZE; r++) {
    let c = 0;
    while (c < BOARD_SIZE) {
      const start = c;
      const startCell = getCell(board, r, c);
      if (!startCell || startCell.matchable === false) {
        c += 1;
        continue;
      }
      const color = startCell.color;
      while (c + 1 < BOARD_SIZE) {
         const nextCell = getCell(board, r, c + 1);
         if (nextCell && nextCell.matchable !== false && nextCell.color === color) c += 1; else break;
      }
      const runLen = c - start + 1;
      if (runLen >= 3) {
        for (let cc = start; cc <= c; cc++) matched.add(`${r},${cc}`);
        if (runLen >= 4) rowClears.push(r);
        for (let cc = start; cc <= c; cc++) horizRunLen[r]![cc] = runLen;
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
      if (!startCell || startCell.matchable === false) {
        r += 1;
        continue;
      }
      const color = startCell.color;
      while (r + 1 < BOARD_SIZE) {
         const nextCell = getCell(board, r + 1, c);
         if (nextCell && nextCell.matchable !== false && nextCell.color === color) r += 1; else break;
      }
      const runLen = r - start + 1;
      if (runLen >= 3) {
        for (let rr = start; rr <= r; rr++) matched.add(`${rr},${c}`);
        if (runLen >= 4) colClears.push(c);
        for (let rr = start; rr <= r; rr++) vertRunLen[rr]![c] = runLen;
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
      if (a.matchable === false || b.matchable === false || d.matchable === false || e.matchable === false) continue;
      if (a.color === b.color && a.color === d.color && a.color === e.color) {
        matched.add(`${r},${c}`);
        matched.add(`${r},${c + 1}`);
        matched.add(`${r + 1},${c}`);
        matched.add(`${r + 1},${c + 1}`);
        bombs.push({ r: r + 0, c: c + 0, color: a.color });
      }
    }
  }

  // L/T intersections: any cell that is part of both a horizontal and vertical run (>=3)
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const t = getCell(board, r, c);
      if (!t) continue;
      if ((horizRunLen[r]?.[c] ?? 0) >= 3 && (vertRunLen[r]?.[c] ?? 0) >= 3) {
        intersections.push({ r, c, color: t.color });
      }
    }
  }

  return { matched, rowClears, colClears, bombs, intersections };
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
  const { updateCoins } = useCoins();

  const [board, setBoard] = useState<Board>(() => generateInitialBoard());
  const [selected, setSelected] = useState<Position | null>(null);
  const [moves, setMoves] = useState<number>(MOVES_PER_GAME);
  const [score, setScore] = useState<number>(0);
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [isFinishing, setIsFinishing] = useState<boolean>(false);
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
  const [rowFlashes, setRowFlashes] = useState<number[]>([]);
  const [colFlashes, setColFlashes] = useState<number[]>([]);
  const [cascadeCount, setCascadeCount] = useState<number>(0);
  const [objectivePulse, setObjectivePulse] = useState<TileColor | null>(null);
  const [shakingIds, setShakingIds] = useState<Set<number>>(new Set());
  const [hint, setHint] = useState<string | null>(null);
  const [turns, setTurns] = useState<number>(0);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showLegend, setShowLegend] = useState<boolean>(false);
  const [showDevTools, setShowDevTools] = useState<boolean>(false);
  const [powerupsVisible, setPowerupsVisible] = useState<boolean>(false);
  const [winBanner, setWinBanner] = useState<string | null>(null);

  // Level config
  type GravityDir = 'down' | 'up';
  type LevelMode = 'normal' | 'coinVacuum';
  type Objective =
    | { type: 'collectColor'; color: TileColor; remaining: number }
    | { type: 'collectSlip'; remaining: number };
  const [gravity, setGravity] = useState<GravityDir>('down');
  const [levelMode, setLevelMode] = useState<LevelMode>('normal');
  const [objectives, setObjectives] = useState<Objective[]>([
    { type: 'collectColor', color: COLORS[0], remaining: 12 },
    { type: 'collectColor', color: COLORS[2], remaining: 10 },
    { type: 'collectSlip', remaining: 3 },
  ]);

  // Power-ups (in-level, no move cost)
  type ActivePowerup = 'none' | 'miniWand' | 'megaWand' | 'gloves' | 'shuffle';
  const [activePowerup, setActivePowerup] = useState<ActivePowerup>('none');
  const gloveFirstPickRef = useRef<Position | null>(null);
  type Booster = null | 'colorBomb' | 'striped' | 'wrapped';
  const [booster, setBooster] = useState<Booster>(null);

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
    let fresh = generateInitialBoard();
    // Apply pre-level booster if selected
    if (booster) {
      const coords: Array<{ r: number; c: number }> = [];
      for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) if (fresh[r]?.[c]) coords.push({ r, c });
      if (coords.length > 0) {
        const pick = coords[Math.floor(Math.random() * coords.length)]!;
        const base = fresh[pick.r]![pick.c]!;
        let special: Special = booster === 'colorBomb' ? 'colorBomb' : booster === 'wrapped' ? 'wrapped' : (Math.random() < 0.5 ? 'stripedH' : 'stripedV');
        fresh[pick.r]![pick.c] = { ...base, special };
      }
    }
    setBoard(fresh);
    setSelected(null);
    setMoves(MOVES_PER_GAME);
    setScore(0);
    setIsResolving(false);
    setGameOver(false);
    setIsFinishing(false);
    setGravity((g) => (g === 'down' ? 'up' : 'down'));
    setLevelMode((m) => (m === 'normal' ? 'coinVacuum' : 'normal'));
    setObjectives([
      { type: 'collectColor', color: COLORS[0], remaining: 12 },
      { type: 'collectColor', color: COLORS[2], remaining: 10 },
      { type: 'collectSlip', remaining: 3 },
    ]);
    setActivePowerup('none');
    gloveFirstPickRef.current = null;
    setTurns(0);
  }, []);

  // Process cascades starting from a specific board state
  const processCascadesFrom = useCallback(async (start: Board): Promise<void> => {
    if (isResolving) return;
    setIsResolving(true);

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    
    const resolveLoop = async (initial: Board): Promise<void> => {
      let cascade = 0;
      let working = initial.map((row) => row.slice());

      while (true) {
      // Detect matches without mutating first
      const { matched, rowClears, colClears, bombs, intersections } = computeMatchesDetailed(working);
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

      // Tally matched colors for objectives and award coins for coinVacuum mode
      const colorTally = new Map<TileColor, number>();
      matched.forEach((key) => {
        const [rs, cs] = key.split(',');
        const tr = Number(rs), tc = Number(cs);
        const t = working[tr]?.[tc];
        if (t) colorTally.set(t.color, (colorTally.get(t.color) ?? 0) + 1);
      });
      if (colorTally.size > 0) {
        setObjectives((prev) => prev.map((o) => o.type === 'collectColor' ? { ...o, remaining: Math.max(0, o.remaining - (colorTally.get(o.color) ?? 0)) } : o));
        // Pulse the first objective color that was reduced
        const pulsed = Array.from(colorTally.keys())[0] ?? null;
        if (pulsed) {
          setObjectivePulse(pulsed);
          window.setTimeout(() => setObjectivePulse(null), 450);
        }
      }
      if (levelMode === 'coinVacuum' && matched.size > 0) {
        // 1 coin per cleared tile baseline; bonus for specials counted below in scoreGained
        void updateCoins(matched.size);
      }

      // Score gain before removal
      const scoreGained = matched.size * 10 + (rowClears.length + colClears.length) * 20 + bombs.length * 40;
      cascade += 1;
      setCascadeCount(cascade);
      const multiplier = 1 + (cascade - 1) * 0.5;
      setScore((prev) => prev + Math.floor(scoreGained * multiplier));

      // Let vanish animation play
      // eslint-disable-next-line no-await-in-loop
      await delay(200);

      // Trigger visual effects for powerups
      if (rowClears.length > 0) {
        setRowFlashes(rowClears.slice(0));
        window.setTimeout(() => setRowFlashes([]), 350);
      }
      if (colClears.length > 0) {
        setColFlashes(colClears.slice(0));
        window.setTimeout(() => setColFlashes([]), 350);
      }

      // Decide special tile spawns and remove matches
      // Priority: 5-in-a-row => colorBomb (Nova Rod)
      // 2x2 => butterfly (Butterfly)
      // L/T intersection => wrapped (Bomb)
      // 4-in-a-row => striped (Missile)
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

      // If 2x2 square found, spawn butterfly at its top-left
      if (!hasFive && bombs.length > 0) {
        const b = bombs[0]!;
        spawnedSpecial = { r: b.r, c: b.c, special: 'butterfly', color: b.color };
      }

      // If L/T found and no color bomb/butterfly, spawn wrapped at intersection
      if (!hasFive && !spawnedSpecial && intersections.length > 0) {
        const t = intersections[0]!;
        spawnedSpecial = { r: t.r, c: t.c, special: 'wrapped', color: t.color };
      }

      // If 4+ line (but not 5 and no wrapped), spawn striped at the center of the run
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

      // Remove matched base tiles (but leave spot for special if any). Also trigger special effects where needed.
      matched.forEach((key) => {
        const [rStr, cStr] = key.split(',');
        const r = Number(rStr);
        const c = Number(cStr);
        if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return;
        const t = working[r]?.[c];
        if (!t) { working[r]![c] = null; return; }
        if (t.special) {
          // Trigger the special effect area
          const area = getSpecialEffectArea(working, r, c, t.special, { color: t.color });
          area.forEach((p) => { if (inBounds(p.r, p.c)) working[p.r]![p.c] = null; });
          if (t.special === 'butterfly') {
            // Snipe: remove one tile of the first objective color still remaining
            const targetObj = objectives.find((o): o is Extract<Objective, { type: 'collectColor' }> => o.type === 'collectColor' && o.remaining > 0);
            if (targetObj) {
              // Find any tile of that color
              outer: for (let rr = 0; rr < BOARD_SIZE; rr++) {
                for (let cc = 0; cc < BOARD_SIZE; cc++) {
                  const tt = working[rr]?.[cc];
                  if (tt && tt.color === targetObj.color) { working[rr]![cc] = null; break outer; }
                }
              }
            }
          }
        }
        working[r]![c] = null;
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
        const newTile = createTile(baseColor, special);
        working[r]![c] = newTile;
        // Visually pop the special spawn by treating it as spawning
        setSpawningIds((prev) => new Set([...Array.from(prev), newTile.id]));
        setTileDurations((prev) => new Map(prev).set(newTile.id, 320));
      }

      // Adjacency clears for certain non-matchable pieces (e.g., Fortune Cookies, Cookies via specials only)
      const neighborsToClear: Array<{ r: number; c: number }> = [];
      const fortuneSlipsToSpawn: Array<{ r: number; c: number }> = [];
      matched.forEach((key) => {
        const [rStr, cStr] = key.split(',');
        const r = Number(rStr), c = Number(cStr);
        const neigh = [
          { r: r - 1, c }, { r: r + 1, c }, { r, c: c - 1 }, { r, c: c + 1 }
        ];
        for (const p of neigh) {
          if (!inBounds(p.r, p.c)) continue;
          const t = working[p.r]?.[p.c];
          if (t && t.pieceType === 'fortuneCookie') {
            neighborsToClear.push({ r: p.r, c: p.c });
            // 50% chance the cookie reveals a required Fortune Slip
            if (Math.random() < 0.5) fortuneSlipsToSpawn.push({ r: p.r, c: p.c });
          } else if (t && t.pieceType === 'cookie') {
            // Cookies block missiles but can be cleared by adjacent matches
            neighborsToClear.push({ r: p.r, c: p.c });
          }
        }
      });
      neighborsToClear.forEach((p) => { working[p.r]![p.c] = null; });
      fortuneSlipsToSpawn.forEach((p) => { working[p.r]![p.c] = createPiece('fortuneSlip'); });
      if (neighborsToClear.length > 0) {
        setScore((prev) => prev + neighborsToClear.length * 30);
      }

      // Special-on-special combos:
      // For now, if any two specials exist, combine the first pair by type rules below.
      const specialsToDetonate: Array<{ r: number; c: number; t: Tile }> = [];
      for (let rr = 0; rr < BOARD_SIZE; rr++) {
        for (let cc = 0; cc < BOARD_SIZE; cc++) {
          const t = working[rr]?.[cc];
          if (t && t.special) specialsToDetonate.push({ r: rr, c: cc, t });
        }
      }
      if (specialsToDetonate.length >= 2) {
        // Take the first two for now; future: detect the exact pair swapped
        const a = specialsToDetonate[0]!; const b = specialsToDetonate[1]!;
        const comboClears = new Set<string>();
        const isStriped = (s: Special | null) => s === 'stripedH' || s === 'stripedV';
        // Missile + Missile: 3 rows + 3 cols crossburst
        if (isStriped(a.t.special) && isStriped(b.t.special)) {
          const rows = [a.r, b.r, Math.floor((a.r + b.r) / 2)];
          const cols = [a.c, b.c, Math.floor((a.c + b.c) / 2)];
          rows.forEach((rr) => { if (rr >= 0 && rr < BOARD_SIZE) for (let cc = 0; cc < BOARD_SIZE; cc++) comboClears.add(`${rr},${cc}`); });
          cols.forEach((cc) => { if (cc >= 0 && cc < BOARD_SIZE) for (let rr = 0; rr < BOARD_SIZE; rr++) comboClears.add(`${rr},${cc}`); });
        }
        // Missile + Butterfly: Butterfly cross, then a row/col from the targeted objective tile
        else if ((isStriped(a.t.special) && b.t.special === 'butterfly') || (isStriped(b.t.special) && a.t.special === 'butterfly')) {
          const butterfly = a.t.special === 'butterfly' ? a : b;
          const striped = a.t.special === 'butterfly' ? b : a;
          // Butterfly plus area at its position
          const plus = [
            { r: butterfly.r, c: butterfly.c },
            { r: butterfly.r - 1, c: butterfly.c },
            { r: butterfly.r + 1, c: butterfly.c },
            { r: butterfly.r, c: butterfly.c - 1 },
            { r: butterfly.r, c: butterfly.c + 1 },
          ];
          plus.forEach((p) => { if (inBounds(p.r, p.c)) comboClears.add(`${p.r},${p.c}`); });
          // Snipe an objective tile; then clear row or column through it
          let target: { r: number; c: number } | null = null;
          outer2: for (let rr = 0; rr < BOARD_SIZE; rr++) {
            for (let cc = 0; cc < BOARD_SIZE; cc++) {
              const t = working[rr]?.[cc];
              const targetObj = objectives.find((o): o is Extract<Objective, { type: 'collectColor' }> => o.type === 'collectColor' && o.remaining > 0);
              if (t && targetObj && t.color === targetObj.color) { target = { r: rr, c: cc }; break outer2; }
            }
          }
          if (!target) target = { r: striped.r, c: striped.c };
          // Clear random orientation at target
          const useRow = Math.random() < 0.5;
          if (useRow) {
            for (let cc = 0; cc < BOARD_SIZE; cc++) comboClears.add(`${target.r},${cc}`);
          } else {
            for (let rr = 0; rr < BOARD_SIZE; rr++) comboClears.add(`${rr},${target.c}`);
          }
        }
        // Missile + Bomb: 5 rows + 5 columns crossburst
        else if ((isStriped(a.t.special) && b.t.special === 'wrapped') || (isStriped(b.t.special) && a.t.special === 'wrapped')) {
          const rowsCenter = [a.r, b.r];
          const colsCenter = [a.c, b.c];
          const rows: number[] = [];
          const cols: number[] = [];
          rowsCenter.forEach((rc) => { for (let d = -2; d <= 2; d++) { const rr = rc + d; if (rr >= 0 && rr < BOARD_SIZE) rows.push(rr); } });
          colsCenter.forEach((cc0) => { for (let d = -2; d <= 2; d++) { const cc = cc0 + d; if (cc >= 0 && cc < BOARD_SIZE) cols.push(cc); } });
          rows.forEach((rr) => { for (let cc = 0; cc < BOARD_SIZE; cc++) comboClears.add(`${rr},${cc}`); });
          cols.forEach((cc) => { for (let rr = 0; rr < BOARD_SIZE; rr++) comboClears.add(`${rr},${cc}`); });
        }
        // Bomb + Bomb: 7x7 nuke around min/max bounds
        else if (a.t.special === 'wrapped' && b.t.special === 'wrapped') {
          const minR = Math.max(0, Math.min(a.r, b.r) - 3);
          const maxR = Math.min(BOARD_SIZE - 1, Math.max(a.r, b.r) + 3);
          const minC = Math.max(0, Math.min(a.c, b.c) - 3);
          const maxC = Math.min(BOARD_SIZE - 1, Math.max(a.c, b.c) + 3);
          for (let rr = minR; rr <= maxR; rr++) for (let cc = minC; cc <= maxC; cc++) comboClears.add(`${rr},${cc}`);
        }
        // Butterfly + Butterfly: hit 8 neighbors, then remove three objective tiles
        else if (a.t.special === 'butterfly' && b.t.special === 'butterfly') {
          const neighbors = [a, b].flatMap((x) => (
            [
              { r: x.r, c: x.c },
              { r: x.r - 1, c: x.c },
              { r: x.r + 1, c: x.c },
              { r: x.r, c: x.c - 1 },
              { r: x.r, c: x.c + 1 },
              { r: x.r - 1, c: x.c - 1 },
              { r: x.r - 1, c: x.c + 1 },
              { r: x.r + 1, c: x.c - 1 },
              { r: x.r + 1, c: x.c + 1 },
            ]
          ));
          neighbors.forEach((p) => { if (inBounds(p.r, p.c)) comboClears.add(`${p.r},${p.c}`); });
          let removed = 0;
          outer3: for (let rr = 0; rr < BOARD_SIZE; rr++) {
            for (let cc = 0; cc < BOARD_SIZE; cc++) {
              const t = working[rr]?.[cc];
          const targetObj = objectives.find((o): o is Extract<Objective, { type: 'collectColor' }> => o.type === 'collectColor' && o.remaining > 0);
              if (t && targetObj && t.color === targetObj.color) { comboClears.add(`${rr},${cc}`); removed++; if (removed >= 3) break outer3; }
            }
          }
        }
        // Butterfly + Bomb: Butterfly hit, then a 3x3 at a targeted objective tile
        else if ((a.t.special === 'butterfly' && b.t.special === 'wrapped') || (b.t.special === 'butterfly' && a.t.special === 'wrapped')) {
          const butterfly = a.t.special === 'butterfly' ? a : b;
          const plus = [
            { r: butterfly.r, c: butterfly.c },
            { r: butterfly.r - 1, c: butterfly.c },
            { r: butterfly.r + 1, c: butterfly.c },
            { r: butterfly.r, c: butterfly.c - 1 },
            { r: butterfly.r, c: butterfly.c + 1 },
          ];
          plus.forEach((p) => { if (inBounds(p.r, p.c)) comboClears.add(`${p.r},${p.c}`); });
          let target: { r: number; c: number } | null = null;
          outer4: for (let rr = 0; rr < BOARD_SIZE; rr++) {
            for (let cc = 0; cc < BOARD_SIZE; cc++) {
              const t = working[rr]?.[cc];
              const targetObj = objectives.find((o): o is Extract<Objective, { type: 'collectColor' }> => o.type === 'collectColor' && o.remaining > 0);
              if (t && targetObj && t.color === targetObj.color) { target = { r: rr, c: cc }; break outer4; }
            }
          }
          if (!target) target = { r: butterfly.r, c: butterfly.c };
          for (let rr = target.r - 1; rr <= target.r + 1; rr++) {
            for (let cc = target.c - 1; cc <= target.c + 1; cc++) {
              if (inBounds(rr, cc)) comboClears.add(`${rr},${cc}`);
            }
          }
        }
        // Nova + X => convert a random color to X and launch all
        else if (a.t.special === 'colorBomb' || b.t.special === 'colorBomb') {
          const other = a.t.special === 'colorBomb' ? b : a;
          // Pick a random color present on board
          const colorsPresent = new Set<TileColor>();
          for (let rr = 0; rr < BOARD_SIZE; rr++) for (let cc = 0; cc < BOARD_SIZE; cc++) { const t = working[rr]?.[cc]; if (t) colorsPresent.add(t.color); }
          const colorsArr = Array.from(colorsPresent);
          const targetColor = colorsArr[Math.floor(Math.random() * colorsArr.length)] ?? other.t.color;
          // Map special type to convert: if other is striped, keep striped; if other is butterfly/wrapped, use that
          const convertedType: Special = other.t.special ?? 'stripedH';
          for (let rr = 0; rr < BOARD_SIZE; rr++) {
            for (let cc = 0; cc < BOARD_SIZE; cc++) {
              const t = working[rr]?.[cc];
              if (t && t.color === targetColor) {
                // For striped, mix orientations
                const s: Special = convertedType === 'stripedH' || convertedType === 'stripedV'
                  ? (Math.random() < 0.5 ? 'stripedH' : 'stripedV')
                  : convertedType;
                working[rr]![cc] = createTile(t.color, s);
                const area = getSpecialEffectArea(working, rr, cc, s);
                area.forEach((p) => comboClears.add(`${p.r},${p.c}`));
              }
            }
          }
        } else {
          // Default: detonate both areas
          const areaA = getSpecialEffectArea(working, a.r, a.c, a.t.special!, { color: a.t.color });
          const areaB = getSpecialEffectArea(working, b.r, b.c, b.t.special!, { color: b.t.color });
          [...areaA, ...areaB].forEach((p) => comboClears.add(`${p.r},${p.c}`));
        }
        // Apply combo, respecting acorn durability (specials reduce but do not clear via adjacency)
        comboClears.forEach((key) => {
          const [rs, cs] = key.split(',');
          const rr = Number(rs), cc = Number(cs);
          if (!inBounds(rr, cc)) return;
          const t = working[rr]?.[cc];
          if (t && t.pieceType === 'acorn') {
            // Require two hits: represented by turning it into a normal tile with same color on first hit
            working[rr]![cc] = createTile(t.color, null);
          } else {
            working[rr]![cc] = null;
          }
        });
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

      if (gravity === 'down') {
        for (let c = 0; c < BOARD_SIZE; c++) {
          let write = BOARD_SIZE - 1;
          for (let r = BOARD_SIZE - 1; r >= 0; r--) {
            const cell = working[r]?.[c] ?? null;
            if (cell !== null) {
              working[write]![c] = cell;
              if (write !== r) working[r]![c] = null;
              write--;
            }
          }
          for (let r = write; r >= 0; r--) {
            // Occasionally spawn a moving piece from the top during refill (demo probability)
            const roll = Math.random();
            if (roll < 0.02) {
              working[r]![c] = createPiece('bottledButterfly');
            } else if (roll < 0.03) {
              working[r]![c] = createPiece('toyBoxBlue');
            } else if (roll < 0.04) {
              working[r]![c] = createPiece('toyBoxPink');
            } else if (roll < 0.05) {
              working[r]![c] = createPiece('fortuneCookie');
            } else {
              working[r]![c] = createTile();
            }
          }
        }
      } else {
        for (let c = 0; c < BOARD_SIZE; c++) {
          let write = 0;
          for (let r = 0; r < BOARD_SIZE; r++) {
            const cell = working[r]?.[c] ?? null;
            if (cell !== null) {
              working[write]![c] = cell;
              if (write !== r) working[r]![c] = null;
              write++;
            }
          }
          for (let r = write; r < BOARD_SIZE; r++) {
            const roll = Math.random();
            if (roll < 0.02) {
              working[r]![c] = createPiece('bottledButterfly');
            } else if (roll < 0.03) {
              working[r]![c] = createPiece('toyBoxBlue');
            } else if (roll < 0.04) {
              working[r]![c] = createPiece('toyBoxPink');
            } else if (roll < 0.05) {
              working[r]![c] = createPiece('fortuneCookie');
            } else {
              working[r]![c] = createTile();
            }
          }
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
      afterPositions.forEach((pos, id) => {
        if (!prevIds.has(id)) spawned.push(id);
        // Track falling for gravity up as well
        const before = beforePositions.get(id);
        if (before && gravity === 'up' && pos.r < before.r) {
          falling.push(id);
          const deltaRows = before.r - pos.r;
          const ms = Math.max(320, Math.min(1100, 220 * deltaRows));
          durationUpdates.set(id, ms);
        }
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

      // Moving piece triggers after gravity settle (bottled butterfly, toy boxes, slips collected)
      // Bottled Butterfly: if at bottom row after settle, trigger a Butterfly hit at an objective tile
      for (let c = 0; c < BOARD_SIZE; c++) {
        const tBottom = working[BOARD_SIZE - 1]?.[c];
        if (tBottom && tBottom.pieceType === 'bottledButterfly') {
          // Remove the bottle and execute butterfly at targeted tile
          working[BOARD_SIZE - 1]![c] = null;
          let target: { r: number; c: number } | null = null;
          outerBF: for (let rr = 0; rr < BOARD_SIZE; rr++) {
            for (let cc = 0; cc < BOARD_SIZE; cc++) {
              const t = working[rr]?.[cc];
              const targetObj = objectives.find((o): o is Extract<Objective, { type: 'collectColor' }> => o.type === 'collectColor' && o.remaining > 0);
              if (t && targetObj && t.color === targetObj.color) { target = { r: rr, c: cc }; break outerBF; }
            }
          }
          if (!target) target = { r: BOARD_SIZE - 1, c };
          const area = getSpecialEffectArea(working, target.r, target.c, 'butterfly');
          area.forEach((p) => { if (inBounds(p.r, p.c)) working[p.r]![p.c] = null; });
          // update board immediately for next cascade step
          setBoard(working.map((row) => row.slice()));
        }
      }

      // Toy Boxes: if at bottom, repaint N tiles to its color hue (visual only for now)
      for (let c = 0; c < BOARD_SIZE; c++) {
        const tBottom = working[BOARD_SIZE - 1]?.[c];
        if (tBottom && (tBottom.pieceType === 'toyBoxBlue' || tBottom.pieceType === 'toyBoxPink')) {
          const repaintColor: TileColor = tBottom.pieceType === 'toyBoxBlue' ? '#3498db' as TileColor : '#9b59b6' as TileColor;
          const targets: Array<{ r: number; c: number }> = [];
          for (let rr = 0; rr < BOARD_SIZE; rr++) for (let cc = 0; cc < BOARD_SIZE; cc++) if (working[rr]?.[cc]?.matchable !== false) targets.push({ r: rr, c: cc });
          for (let i = 0; i < 6 && targets.length > 0; i++) {
            const idx = Math.floor(Math.random() * targets.length);
            const tPos = targets.splice(idx, 1)[0]!;
            const existing = working[tPos.r]?.[tPos.c];
            if (existing) {
              working[tPos.r]![tPos.c] = createTile(repaintColor, existing.special);
            }
          }
          // consume the toy box
          working[BOARD_SIZE - 1]![c] = null;
          setBoard(working.map((row) => row.slice()));
        }
      }

      // Fortune Slips: if a slip reaches bottom, count towards slip objective and clear it
      // Display temporary score reward
      for (let c = 0; c < BOARD_SIZE; c++) {
        const tBottom = working[BOARD_SIZE - 1]?.[c];
        if (tBottom && tBottom.pieceType === 'fortuneSlip') {
          working[BOARD_SIZE - 1]![c] = null;
          setScore((prev) => prev + 50);
          setObjectives((prev) => prev.map((o) => o.type === 'collectSlip' ? { ...o, remaining: Math.max(0, o.remaining - 1) } : o));
        }
      }
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
    };

    await resolveLoop(start);

    setIsResolving(false);
    setCascadeCount(0);

    // Win handling: if objectives complete, convert leftover moves to specials and fire
    const allDone = objectives.every((o) => o.remaining <= 0);
    if (allDone && !isFinishing && !gameOver) {
      setIsFinishing(true);
      setWinBanner('Objectives Complete! Converting leftover moves to fireworks...');
      (async () => {
        let snapshot = board.map((row) => row.slice());
        for (let i = 0; i < moves; i++) {
          const coords: Array<{ r: number; c: number }> = [];
          for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) if (snapshot[r]?.[c]) coords.push({ r, c });
          if (coords.length === 0) break;
          const pick = coords[Math.floor(Math.random() * coords.length)]!;
          const specials: Special[] = ['stripedH', 'stripedV', 'wrapped', 'colorBomb', 'butterfly'];
          const chosen = specials[Math.floor(Math.random() * specials.length)]!;
          const base = snapshot[pick.r]![pick.c]!;
          snapshot[pick.r]![pick.c] = { ...base, special: chosen };
          setBoard(snapshot.map((row) => row.slice()));
          setScore((prev) => prev + (chosen === 'colorBomb' ? 50 : chosen === 'wrapped' ? 20 : 10));
          // Coin payouts per special
          const coinPayout = chosen === 'colorBomb' ? 5 : chosen === 'wrapped' ? 2 : 1;
          void updateCoins(coinPayout);
          // eslint-disable-next-line no-await-in-loop
          await resolveLoop(snapshot.map((row) => row.slice()));
          setMoves((prev) => Math.max(0, prev - 1));
        }
        setGameOver(true);
        setIsFinishing(false);
        setWinBanner('Stage Clear!');
        window.setTimeout(() => setWinBanner(null), 1500);
      })();
    }
  }, [isResolving, tileSize, gravity, objectives, isFinishing, gameOver, board, moves, levelMode, updateCoins]);

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
    (a: Position, b: Position, opts?: { force?: boolean; consumeMove?: boolean }) => {
      if (!inBounds(a.row, a.col) || !inBounds(b.row, b.col)) return;
      if (!areAdjacent(a, b)) return;
      if (isResolving) { setHint('Resolving... please wait'); window.setTimeout(() => setHint(null), 700); return; }
      if (gameOver) return;

      // Pre-validation with feedback
      if (!opts?.force) {
        const preValid = isValidSwap(board, a, b);
        if (!preValid) {
          const aId0 = board[a.row]?.[a.col]?.id;
          const bId0 = board[b.row]?.[b.col]?.id;
          if (aId0 != null || bId0 != null) {
            setShakingIds((prev) => new Set([...(prev ?? new Set<number>()), ...(aId0 != null ? [aId0] : []), ...(bId0 != null ? [bId0] : [])]));
            window.setTimeout(() => setShakingIds(new Set()), 420);
          }
          const tA = board[a.row]?.[a.col];
          const tB = board[b.row]?.[b.col];
          if ((tA && tA.matchable === false) || (tB && tB.matchable === false)) {
            setHint('That piece doesn\'t match. Clear it by adjacency or specials.');
          } else {
            setHint('Swap must create a match');
          }
          window.setTimeout(() => setHint(null), 900);
          return;
        }
      }

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
        if (!opts?.force && !isValidSwap(next, a, b)) {
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
        if (opts?.consumeMove !== false) {
          setMoves((prev) => prev - 1);
          setTurns((t) => t + 1);
        }
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
      // Power-up handling (no move cost)
      if (activePowerup !== 'none') {
        const pos = { row, col };
        if (activePowerup === 'miniWand') {
          setBoard((prev) => {
            const next = prev.map((r) => r.slice());
            next[row]![col] = null;
            return next;
          });
          setActivePowerup('none');
          const snapshot = board.map((r) => r.slice());
          void processCascadesFrom(snapshot);
          return;
        }
        if (activePowerup === 'megaWand') {
          setBoard((prev) => {
            const next = prev.map((r) => r.slice());
            for (let c2 = 0; c2 < BOARD_SIZE; c2++) next[row]![c2] = null;
            for (let r2 = 0; r2 < BOARD_SIZE; r2++) next[r2]![col] = null;
            return next;
          });
          setActivePowerup('none');
          const snapshot = board.map((r) => r.slice());
          void processCascadesFrom(snapshot);
          return;
        }
        if (activePowerup === 'gloves') {
          if (!gloveFirstPickRef.current) {
            gloveFirstPickRef.current = pos;
          } else {
            const first = gloveFirstPickRef.current;
            gloveFirstPickRef.current = null;
            if (areAdjacent(first, pos)) {
              attemptSwap(first, pos, { force: true, consumeMove: false });
            }
            setActivePowerup('none');
          }
          return;
        }
        if (activePowerup === 'shuffle') {
          // Shuffle board tiles
          setBoard((prev) => {
            const tiles: Tile[] = [];
            prev.forEach((r) => r.forEach((cell) => { if (cell) tiles.push(cell); }));
            // Fisher-Yates
            for (let i = tiles.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [tiles[i], tiles[j]] = [tiles[j]!, tiles[i]!];
            }
            const next: Board = Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => null as Cell));
            let k = 0;
            for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) next[r]![c] = tiles[k++] ?? null;
            return next;
          });
          setActivePowerup('none');
          return;
        }
      }
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
    background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.08) 100%)',
    boxShadow: '0 10px 28px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.3)',
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

  // Version badge for easy verification in UI
  const PCRUSH_VERSION = 'PhraiCrush v0.3.0-mechanics-sync';
  const loadedAt = new Date().toLocaleTimeString();

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
          {cascadeCount > 0 && (
            <div className="combo-badge">Combo x{cascadeCount}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={buttonStyle} onClick={() => setShowLegend((v) => !v)}>Legend</button>
          <button style={buttonStyle} onClick={() => setShowSettings((v) => !v)}>⚙️</button>
          <button style={buttonStyle} onClick={handleNewGame}>New Game</button>
        </div>
      </div>

      {showSettings && (
        <div style={{
          width: 'min(520px, 95vw)',
          marginBottom: 12,
          color: '#fff',
          background: 'rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 12,
          padding: 12,
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <div style={statPill}>Gravity: {gravity === 'down' ? '↓' : '↑'}</div>
            <div style={statPill}>Mode: {levelMode === 'normal' ? 'Objectives' : 'Coin Vacuum'}</div>
            <div style={statPill}>Turn: {turns}</div>
            <div style={statPill} title={`Loaded: ${loadedAt}`}>Ver: {PCRUSH_VERSION}</div>
            <button style={buttonStyle} onClick={() => setLevelMode((m) => (m === 'normal' ? 'coinVacuum' : 'normal'))}>Toggle Mode</button>
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ marginBottom: 6, fontWeight: 800 }}>Pre-level Booster:</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={`powerup-button ${booster === 'colorBomb' ? '' : ''}`} title="Start with Nova Rod" onClick={() => setBooster('colorBomb')}>🪄💥</button>
              <button className={`powerup-button ${booster === 'striped' ? '' : ''}`} title="Start with Missile" onClick={() => setBooster('striped')}>🎯</button>
              <button className={`powerup-button ${booster === 'wrapped' ? '' : ''}`} title="Start with Bomb" onClick={() => setBooster('wrapped')}>💣</button>
              <button className={`powerup-button ${booster === null ? '' : ''}`} title="No Booster" onClick={() => setBooster(null)}>🚫</button>
            </div>
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={powerupsVisible} onChange={(e) => setPowerupsVisible(e.target.checked)} />
              Show Power-ups Bar
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={showDevTools} onChange={(e) => setShowDevTools(e.target.checked)} />
              Dev Tools
            </label>
          </div>
        </div>
      )}

      {/* Objectives */}
      <div style={{ marginBottom: 8, color: '#fff', fontWeight: 700 }}>
        {levelMode === 'normal' ? (
          <>
            Objectives:
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {objectives.map((o, i) => (
                <div key={i} className={`objective-pill ${objectivePulse && o.type === 'collectColor' && o.color === objectivePulse ? 'pulse' : ''}`}>
                  {o.type === 'collectColor' ? (
                    <>
                      <span style={{ width: 12, height: 12, borderRadius: 999, background: o.color as string, display: 'inline-block' }} />
                      <span>Collect</span>
                      <span style={{ color: o.color as string }}>{COLOR_NAMES[o.color]}</span>
                      <span>· {o.remaining}</span>
                    </>
                  ) : (
                    <>
                      <span>Fortune Slips · {o.remaining}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            Coin Vacuum: tiles cleared this turn add coins. Leftover-move fireworks still pay out.
          </>
        )}
      </div>

      <div style={boardStyle} className="crush-board" aria-label="Candy board" role="grid">
        {/* Grid overlay for cells */}
        <div style={gridOverlayStyle} className="crush-board-grid">
          {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, i) => (
            <div key={`grid-${i}`} className="crush-grid-cell" />
          ))}
          {rowFlashes.map((rf) => (
            <div key={`rf-${rf}`} className="row-flash" style={{ gridColumn: `1 / ${BOARD_SIZE + 1}`, gridRow: `${rf + 1} / ${rf + 2}` }} />
          ))}
          {colFlashes.map((cf) => (
            <div key={`cf-${cf}`} className="col-flash" style={{ gridRow: `1 / ${BOARD_SIZE + 1}`, gridColumn: `${cf + 1} / ${cf + 2}` }} />
          ))}
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
              shakingIds.has(cell.id) ? 'invalid-shake' : '',
            ].filter(Boolean).join(' ');
            const innerClasses = [
              'tile-inner',
              vanishingIds.has(cell.id) ? 'vanish' : '',
              spawningIds.has(cell.id) ? 'spawning' : '',
              fallingIds.has(cell.id) ? 'falling' : '',
              cell.special ? `special ${cell.special}` : '',
              cell.matchable === false ? 'nonmatchable' : '',
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
            const pieceType = cell.pieceType ?? null;
            let nonmatchBg: string | undefined;
            let pieceEmoji: string | null = null;
            let pieceLabel: string | null = null;
            if (cell.matchable === false && pieceType) {
              if (pieceType === 'fortuneCookie') {
                nonmatchBg = 'linear-gradient(135deg, #c97b2d 0%, #e0a96d 50%, #c97b2d 100%)';
                pieceEmoji = '🥠'; pieceLabel = 'Cookie';
              } else if (pieceType === 'fortuneSlip') {
                nonmatchBg = 'linear-gradient(135deg, #ffffff 0%, #e9eef5 100%)';
                pieceEmoji = '🧾'; pieceLabel = 'Slip';
              } else if (pieceType === 'bottledButterfly') {
                nonmatchBg = 'linear-gradient(135deg, rgba(135,206,235,0.8) 0%, rgba(173,216,230,0.95) 100%)';
                pieceEmoji = '🦋'; pieceLabel = 'Bottle';
              } else if (pieceType === 'toyBoxBlue') {
                nonmatchBg = 'repeating-linear-gradient(45deg, #2d6cdf, #2d6cdf 10px, #1e4fb7 10px, #1e4fb7 20px)';
                pieceEmoji = '📦'; pieceLabel = 'Toy';
              } else if (pieceType === 'toyBoxPink') {
                nonmatchBg = 'repeating-linear-gradient(45deg, #d164c1, #d164c1 10px, #b244a1 10px, #b244a1 20px)';
                pieceEmoji = '📦'; pieceLabel = 'Toy';
              } else if (pieceType === 'cookie') {
                nonmatchBg = 'radial-gradient(circle at 30% 30%, #7a4b2a, #5b371f 70%)';
                pieceEmoji = '⛔'; pieceLabel = 'Block';
              } else if (pieceType === 'acorn') {
                nonmatchBg = 'linear-gradient(135deg, #6ab04c 0%, #2ecc71 100%)';
                pieceEmoji = '🌰'; pieceLabel = 'Acorn';
              }
            }
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
                    background: nonmatchBg ?? (cell.color as string),
                    width: '100%',
                    height: '100%',
                    borderRadius: 10,
                    boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.15), inset 0 -2px 6px rgba(0,0,0,0.25)'
                  }}
                >
                  {pieceType && (
                    <div className={`piece-badge piece-${pieceType}`} title={pieceLabel ?? pieceType}>
                      <span className="piece-emoji">{pieceEmoji}</span>
                    </div>
                  )}
                </div>
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
      {showLegend && (
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
            <div className="legend-text">Bomb: 5×5 blast</div>
          </div>
          <div className="legend-item">
            <div className="legend-icon tile-inner special colorBomb" style={{ background: '#9b59b6' }} />
            <div className="legend-text">Color Bomb: clears all tiles of a color</div>
          </div>
          <div className="legend-item">
            <div className="legend-icon tile-inner special butterfly" style={{ background: '#f1c40f' }} />
            <div className="legend-text">Butterfly: plus hit + objective snipe</div>
          </div>
        </div>
      )}

      {winBanner && (
        <div className="zone-announcement" role="status" aria-live="polite">
          {winBanner}
        </div>
      )}

      {/* Power-ups */}
      {/* Power-ups */}
      {powerupsVisible && (
        <div className="powerup-menu">
          {hint && (
            <div className="combo-badge" style={{ position: 'static' }}>{hint}</div>
          )}
          <button className={`powerup-button ${activePowerup === 'miniWand' ? '' : ''}`} title="Mini Wand (delete one tile)" onClick={() => setActivePowerup('miniWand')}>🪄</button>
          <button className={`powerup-button ${activePowerup === 'megaWand' ? '' : ''}`} title="Mega Wand (row + column strike)" onClick={() => setActivePowerup('megaWand')}>🔮</button>
          <button className={`powerup-button ${activePowerup === 'gloves' ? '' : ''}`} title="Magic Gloves (force swap)" onClick={() => setActivePowerup('gloves')}>🧤</button>
          <button className={`powerup-button ${activePowerup === 'shuffle' ? '' : ''}`} title="Rainbow Negg (shuffle)" onClick={() => setActivePowerup('shuffle')}>🌈</button>
        </div>
      )}
      {!powerupsVisible && (
        <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)' }}>
          <button style={buttonStyle} onClick={() => setPowerupsVisible(true)}>Show Power-ups</button>
        </div>
      )}

      {/* Pre-level Booster selection (applies on New Game) */}
      <div className="powerup-menu" style={{ marginTop: 8 }}>
        <button className={`powerup-button ${booster === 'colorBomb' ? '' : ''}`} title="Start with Nova Rod" onClick={() => setBooster('colorBomb')}>🪄💥</button>
        <button className={`powerup-button ${booster === 'striped' ? '' : ''}`} title="Start with Missile" onClick={() => setBooster('striped')}>🎯</button>
        <button className={`powerup-button ${booster === 'wrapped' ? '' : ''}`} title="Start with Bomb" onClick={() => setBooster('wrapped')}>💣</button>
        <button className={`powerup-button ${booster === null ? '' : ''}`} title="No Booster" onClick={() => setBooster(null)}>🚫</button>
      </div>

      {/* Spawn test pieces (dev/demo) */}
      {showDevTools && (
      <div className="powerup-menu" style={{ marginTop: 8 }}>
        <button className="powerup-button" title="Spawn Bottled Butterfly" onClick={() => {
          setBoard((prev) => {
            const next = prev.map((r) => r.slice());
            const coords: Array<{ r: number; c: number }> = [];
            for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) coords.push({ r, c });
            const pick = coords[Math.floor(Math.random() * coords.length)]!;
            next[pick.r]![pick.c] = createPiece('bottledButterfly');
            return next;
          });
        }}>🦋</button>
        <button className="powerup-button" title="Spawn Toy Box (Blue)" onClick={() => {
          setBoard((prev) => {
            const next = prev.map((r) => r.slice());
            const coords: Array<{ r: number; c: number }> = [];
            for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) coords.push({ r, c });
            const pick = coords[Math.floor(Math.random() * coords.length)]!;
            next[pick.r]![pick.c] = createPiece('toyBoxBlue');
            return next;
          });
        }}>📦🔵</button>
        <button className="powerup-button" title="Spawn Toy Box (Pink)" onClick={() => {
          setBoard((prev) => {
            const next = prev.map((r) => r.slice());
            const coords: Array<{ r: number; c: number }> = [];
            for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) coords.push({ r, c });
            const pick = coords[Math.floor(Math.random() * coords.length)]!;
            next[pick.r]![pick.c] = createPiece('toyBoxPink');
            return next;
          });
        }}>📦🩷</button>
        <button className="powerup-button" title="Spawn Fortune Cookie" onClick={() => {
          setBoard((prev) => {
            const next = prev.map((r) => r.slice());
            const coords: Array<{ r: number; c: number }> = [];
            for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) coords.push({ r, c });
            const pick = coords[Math.floor(Math.random() * coords.length)]!;
            next[pick.r]![pick.c] = createPiece('fortuneCookie');
            return next;
          });
        }}>🥠</button>
        <button className="powerup-button" title="Spawn Acorn" onClick={() => {
          setBoard((prev) => {
            const next = prev.map((r) => r.slice());
            const coords: Array<{ r: number; c: number }> = [];
            for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) coords.push({ r, c });
            const pick = coords[Math.floor(Math.random() * coords.length)]!;
            next[pick.r]![pick.c] = createPiece('acorn');
            return next;
          });
        }}>🌰</button>
      </div>
      )}

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


