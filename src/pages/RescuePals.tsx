import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RescuePals.css';

type Tile = 'empty' | 'water' | 'tree' | 'net' | 'catnip' | 'bridge';
type Animal = 'fish' | 'bird' | 'dog';
type Hero = 'duck' | 'cat';

interface Cell {
  tile: Tile;
  animal?: Animal;
}

interface Level {
  id: number;
  width: number;
  height: number;
  board: Cell[];
  startHero: Hero;
  targets: number; // number of animals to rescue
  tip?: string;
}

const makeBoard = (w: number, h: number, fill: Partial<Cell> = {}): Cell[] =>
  Array.from({ length: w * h }, () => ({ tile: 'empty', ...fill }));

const LEVELS: Level[] = [
  {
    id: 1,
    width: 6,
    height: 5,
    startHero: 'duck',
    targets: 1,
    tip: 'Drag water next to fish to rescue it! Duck excels near water.',
    board: (() => {
      const w = 6, h = 5;
      const b = makeBoard(w, h);
      // place fish
      b[2 + 2 * w] = { tile: 'empty', animal: 'fish' };
      // a few land cells (implicit empty)
      // starter water tile in palette only
      return b;
    })(),
  },
  {
    id: 2,
    width: 7,
    height: 5,
    startHero: 'cat',
    targets: 2,
    tip: 'Birds like trees; cats handle land obstacles.',
    board: (() => {
      const w = 7, h = 5;
      const b = makeBoard(w, h);
      b[1 + 2 * w] = { tile: 'empty', animal: 'bird' };
      b[5 + 3 * w] = { tile: 'empty', animal: 'fish' };
      return b;
    })(),
  },
];

const paletteTiles: { key: Tile; label: string; emoji: string }[] = [
  { key: 'water', label: 'Water', emoji: '💧' },
  { key: 'tree', label: 'Tree', emoji: '🌳' },
  { key: 'net', label: 'Fishnet', emoji: '🪤' },
  { key: 'catnip', label: 'Catnip', emoji: '🌿' },
  { key: 'bridge', label: 'Bridge', emoji: '🌉' },
];

export default function RescuePals() {
  const navigate = useNavigate();
  const [levelIndex, setLevelIndex] = useState(0);
  const level = LEVELS[levelIndex];
  const [board, setBoard] = useState<Cell[]>(() => level.board.map(c => ({ ...c })));
  const [heldTile, setHeldTile] = useState<Tile | null>(null);
  const [hero, setHero] = useState<Hero>(level.startHero);
  const [rescued, setRescued] = useState(0);
  const [showTutorial, setShowTutorial] = useState<boolean>(level.id === 1);
  const [_tutorialAck, setTutorialAck] = useState<boolean>(false);
  const [showComplete, setShowComplete] = useState(false);

  const w = level.width;
  const h = level.height;

  // Neighbor helper declared early (hoisted) to avoid TDZ in hooks below
  function neighbors(idx: number): number[] {
    const x = idx % w, y = Math.floor(idx / w);
    const ns: number[] = [];
    if (x > 0) ns.push(idx - 1);
    if (x < w - 1) ns.push(idx + 1);
    if (y > 0) ns.push(idx - w);
    if (y < h - 1) ns.push(idx + w);
    return ns;
  }

  // Tutorial helpers (Level 1): highlight valid neighbor cells around the fish
  const fishIndex = useMemo(() => board.findIndex(c => c.animal === 'fish'), [board]);
  const tutorialTargets = useMemo(() => {
    if (!showTutorial || fishIndex < 0) return new Set<number>();
    return new Set(neighbors(fishIndex));
  }, [showTutorial, fishIndex]);

  // Preselect water and restrict palette on Level 1
  React.useEffect(() => {
    setShowTutorial(level.id === 1);
    setTutorialAck(false);
    if (level.id === 1) setHeldTile('water'); else setHeldTile(null);
    setShowComplete(false);
  }, [level.id]);

  const canPlace = useCallback((idx: number, tile: Tile): boolean => {
    const c = board[idx];
    if (!c) return false;
    if (c.animal) {
      // allow placing environment on same cell? require adjacency instead
      return false;
    }
    // basic rule: cannot overwrite existing special tile
    if (c.tile !== 'empty' && tile !== 'bridge') return false;
    return true;
  }, [board]);

  function tryRescueAround(idx: number) {
    const toCheck = [idx, ...neighbors(idx)];
    setBoard(prev => {
      const next = prev.map(c => ({ ...c }));
      let localGained = 0;
      for (const i of toCheck) {
        const c = next[i];
        if (!c || !c.animal) continue;
        if (c.animal === 'fish') {
          const ok = neighbors(i).some(n => next[n]?.tile === 'water' || next[n]?.tile === 'net');
          if (ok) {
            c.animal = undefined;
            localGained += 1;
          }
        } else if (c.animal === 'bird') {
          const ok = neighbors(i).some(n => next[n]?.tile === 'tree');
          if (ok) {
            c.animal = undefined;
            localGained += 1;
          }
        } else if (c.animal === 'dog') {
          const ok = neighbors(i).some(n => next[n]?.tile === 'bridge' || next[n]?.tile === 'catnip');
          if (ok) {
            c.animal = undefined;
            localGained += 1;
          }
        }
      }
      if (localGained > 0) {
        setRescued(r => r + localGained);
        if (level.id === 1) {
          setShowTutorial(false);
          setTutorialAck(true);
        }
      }
      return next;
    });
  }

  // Simple hazard: water flood converts adjacent empties (Level 2+)
  function _floodStep() {
    if (level.id < 2) return;
    setBoard(prev => {
      const next = prev.map(c => ({ ...c }));
      const toWater: number[] = [];
      next.forEach((c, i) => {
        if (c.tile === 'water') {
          neighbors(i).forEach(n => {
            if (next[n] && next[n]!.tile === 'empty' && !next[n]!.animal) toWater.push(n);
          });
        }
      });
      toWater.forEach(i => { next[i].tile = 'water'; });
      return next;
    });
  }

  const handleDrop = useCallback((idx: number) => {
    if (showComplete) return;
    if (!heldTile) return;
    if (!canPlace(idx, heldTile)) return;
    setBoard(prev => {
      const next = prev.map(c => ({ ...c }));
      next[idx].tile = heldTile;
      return next;
    });
    setHeldTile(null);
    tryRescueAround(idx);
    // Flood after placement on Level 2+
    if (level.id >= 2) {
      setBoard(prev => {
        const next = prev.map(c => ({ ...c }));
        const toWater: number[] = [];
        next.forEach((c, i) => {
          if (c.tile === 'water') {
            neighbors(i).forEach(n => {
              if (next[n] && next[n]!.tile === 'empty' && !next[n]!.animal) toWater.push(n);
            });
          }
        });
        toWater.forEach(i => { next[i].tile = 'water'; });
        return next;
      });
    }
  }, [heldTile, canPlace, tryRescueAround, showComplete, level.id, neighbors]);

  // Hero abilities (MVP): provide small placement buffs or effects
  const ability = useMemo(() => hero === 'duck' ? 'Fly' : 'Purr', [hero]);
  const useAbility = useCallback(() => {
    if (hero === 'duck') {
      // Duck: allow placing one extra water tile per use anywhere (ignore canPlace tile overwrite once)
      const firstEmpty = board.findIndex(c => c.tile === 'empty' && !c.animal);
      if (firstEmpty >= 0) {
        setBoard(prev => prev.map((c, i) => i === firstEmpty ? { ...c, tile: 'water' } : c));
        tryRescueAround(firstEmpty);
      }
    } else {
      // Cat: calm nearby animals (adjacent animals are rescued if any valid tile is around)
      const idxs = board.map((_, i) => i);
      let any = false;
      setBoard(prev => {
        const next = prev.map(c => ({ ...c }));
        for (const i of idxs) {
          const c = next[i];
          if (!c.animal) continue;
          const ok = neighbors(i).some(n => next[n]?.tile && next[n]?.tile !== 'empty');
          if (ok) {
            c.animal = undefined;
            any = true;
          }
        }
        return next;
      });
      if (any) setRescued(r => r + 1); // minimal scoring boost
    }
  }, [hero, board, neighbors, tryRescueAround]);

  const remaining = useMemo(() => Math.max(0, level.targets - rescued), [level.targets, rescued]);
  
  // Define nextLevel before any effects that reference it
  const nextLevel = useCallback(() => {
    const ni = Math.min(LEVELS.length - 1, levelIndex + 1);
    const nl = LEVELS[ni];
    setLevelIndex(ni);
    setBoard(nl.board.map(c => ({ ...c })));
    setHero(nl.startHero);
    setRescued(0);
  }, [levelIndex]);

  // Completion overlay and optional auto-advance
  React.useEffect(() => {
    if (remaining === 0) {
      setShowComplete(true);
      if (levelIndex < LEVELS.length - 1) {
        const t = window.setTimeout(() => {
          nextLevel();
          setShowComplete(false);
        }, 900);
        return () => window.clearTimeout(t);
      }
    } else {
      setShowComplete(false);
    }
    return undefined;
  }, [remaining, levelIndex, nextLevel]);

  

  

  return (
    <div className="rescuepals-container">
      <div className="topbar" style={{ marginTop: '8px' }}>
        <button onClick={() => { void navigate('/play'); }}>← Back</button>
        <div className="title">Rescue Pals</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setHero(h => h === 'duck' ? 'cat' : 'duck')}>{hero === 'duck' ? 'Switch to Cat' : 'Switch to Duck'}</button>
          {level.id > 1 && <button onClick={useAbility}>{ability}</button>}
        </div>
      </div>

      <div className="hud">
        <div>Level {level.id}</div>
        <div>Rescued: {rescued}/{level.targets}</div>
        {level.tip && <div className="tip">{level.tip}</div>}
        {showTutorial && (
          <div className="tip" style={{ color: '#2f6', fontWeight: 600 }}>
            Step 1: Water rescues fish. Tap a highlighted cell next to the fish.
          </div>
        )}
      </div>

      <div className="board" style={{ gridTemplateColumns: `repeat(${w}, 1fr)`, aspectRatio: `${w} / ${h}` }}>
        {board.map((cell, idx) => {
          const tileEmoji = cell.tile === 'water' ? '💧' : cell.tile === 'tree' ? '🌳' : cell.tile === 'net' ? '🪤' : cell.tile === 'catnip' ? '🌿' : cell.tile === 'bridge' ? '🌉' : '';
          const animalEmoji = cell.animal === 'fish' ? '🐟' : cell.animal === 'bird' ? '🐦' : cell.animal === 'dog' ? '🐕' : '';
          return (
            <button key={idx} className={`cell ${tutorialTargets.has(idx) ? 'highlight' : ''}`} onClick={() => handleDrop(idx)}>
              <div className="tile">{tileEmoji}</div>
              <div className="animal">{animalEmoji}</div>
            </button>
          );
        })}
      </div>

      <div className="palette">
        {(level.id === 1 ? paletteTiles.filter(p => p.key === 'water') : paletteTiles).map(p => (
          <button key={p.key} className={`palette-item ${heldTile === p.key ? 'held' : ''}`} onClick={() => setHeldTile(t => t === p.key ? null : p.key)}>
            <span className="emoji">{p.emoji}</span>
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      {showComplete && (
        <div className="level-complete-overlay" role="dialog" aria-modal>
          <div className="level-complete-card">
            <div style={{ fontWeight: 800, fontSize: 18 }}>Rescue complete!</div>
            {levelIndex < LEVELS.length - 1 ? (
              <button onClick={() => { setShowComplete(false); nextLevel(); }}>Next Level</button>
            ) : (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button onClick={() => { setLevelIndex(0); setBoard(LEVELS[0].board.map(c => ({ ...c }))); setHero(LEVELS[0].startHero); setRescued(0); setShowComplete(false); }}>Restart</button>
                <button onClick={() => { void navigate('/play'); }}>Back to Games</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


