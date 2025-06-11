import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './PhraiCrush.css';

// Game constants
const BOARD_SIZE = 8;
const MATCH_MIN = 3;
const COMBO_MULTIPLIERS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5];

// Zone-themed candies from Phraijump
type CandyType = 
  | 'land_crystal' | 'land_flower' | 'land_root'
  | 'sky_cloud' | 'sky_lightning' | 'sky_wind'  
  | 'atmosphere_fire' | 'atmosphere_metal' | 'atmosphere_lava'
  | 'space_star' | 'space_planet' | 'space_nebula'
  | 'deepspace_void' | 'deepspace_crystal' | 'deepspace_energy'
  | 'blackhole_matter' | 'blackhole_gravity' | 'blackhole_singularity'
  | 'rainbow_magic' | 'rainbow_sparkle' | 'rainbow_wish';

type SpecialCandyType = 
  | 'none' 
  | 'horizontal_blast' | 'vertical_blast' 
  | 'bomb' | 'rainbow_burst' 
  | 'zone_clearer' | 'mega_blast';

type GameMode = 'classic' | 'pvp' | 'tournament' | 'endless' | 'challenge';

interface Candy {
  type: CandyType;
  special: SpecialCandyType;
  zone: string;
  id: string;
  row: number;
  col: number;
  falling: boolean;
  fallDistance: number;
  matched: boolean;
  animationTimer: number;
  glowIntensity: number;
  pulsePhase: number;
}

interface Match {
  candies: Candy[];
  pattern: 'line' | 'L' | 'T' | '+' | 'square';
  combo: number;
  zoneBonus: boolean;
}

interface Player {
  id: string;
  name: string;
  score: number;
  moves: number;
  level: number;
  board: Candy[][];
  zone: string;
  powerUps: PowerUp[];
  comboStreak: number;
  specialMeter: number;
}

interface PowerUp {
  type: 'hammer' | 'swap' | 'shuffle' | 'zone_blast' | 'time_freeze' | 'double_score';
  uses: number;
  zone: string;
}

interface Tournament {
  id: string;
  name: string;
  players: Player[];
  duration: number;
  startTime: number;
  prizes: string[];
  theme: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  progress: number;
  target: number;
  completed: boolean;
  reward: string;
}

export default function PhraiCrush() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | undefined>(undefined);
  const navigate = useNavigate();

  // Game state
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  
  // Player state
  const [player, setPlayer] = useState<Player>({
    id: 'player1',
    name: 'Player',
    score: 0,
    moves: 30,
    level: 1,
    board: [],
    zone: 'LAND',
    powerUps: [],
    comboStreak: 0,
    specialMeter: 0
  });

  // UI state
  const [selectedCandy, setSelectedCandy] = useState<{row: number, col: number} | null>(null);
  const [validMoves, setValidMoves] = useState<{row: number, col: number}[]>([]);
  const [currentZone, setCurrentZone] = useState('LAND');
  const [zoneProgress, setZoneProgress] = useState(0);
  const [showPowerUpMenu, setShowPowerUpMenu] = useState(false);
  const [animations, setAnimations] = useState<any[]>([]);
  const [particles, setParticles] = useState<any[]>([]);
  
  // Multiplayer state
  const [opponent, setOpponent] = useState<Player | null>(null);
  const [matchmaking, setMatchmaking] = useState(false);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  
  // Screen dimensions and dynamic sizing
  const [canvasDimensions, setCanvasDimensions] = useState({ 
    width: window.innerWidth, 
    height: window.innerHeight
  });
  
  // Calculate candy size dynamically to fill screen
  const getCandySize = () => {
    const padding = 40; // Padding around board
    const availableWidth = canvasDimensions.width - padding;
    const availableHeight = canvasDimensions.height - 120; // Space for UI
    const maxSize = Math.min(availableWidth / BOARD_SIZE, availableHeight / BOARD_SIZE);
    return Math.floor(maxSize);
  };
  
  const CANDY_SIZE = getCandySize();

  // Zone definitions from Phraijump
  const ZONES = {
    LAND: { colors: ['#8B4513', '#228B22', '#FFD700'], name: 'Mystic Lands' },
    SKY: { colors: ['#87CEEB', '#FFFFFF', '#FFE4B5'], name: 'Cloud Kingdom' },
    ATMOSPHERE: { colors: ['#FF6347', '#FF8C00', '#DC143C'], name: 'Molten Forge' },
    SPACE: { colors: ['#191970', '#4169E1', '#00CED1'], name: 'Stellar Nexus' },
    DEEP_SPACE: { colors: ['#4B0082', '#8A2BE2', '#9932CC'], name: 'Cosmic Depths' },
    BLACK_HOLE: { colors: ['#000000', '#8A2BE2', '#FF1493'], name: 'Event Horizon' },
    RAINBOW: { colors: ['#FF0000', '#00FF00', '#0000FF'], name: 'Rainbow Realm' }
  };

  // Add body class for full-screen game
  useEffect(() => {
    document.body.classList.add('phraicrush-active');
    return () => {
      document.body.classList.remove('phraicrush-active');
    };
  }, []);

  // Initialize game and setup high DPI canvas
  useEffect(() => {
    const handleResize = () => {
      setCanvasDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    // Setup high DPI canvas
    const setupCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Get device pixel ratio for crisp graphics
      const dpr = window.devicePixelRatio || 1;
      
      // Set actual canvas size in pixels
      canvas.width = canvasDimensions.width * dpr;
      canvas.height = canvasDimensions.height * dpr;
      
      // Scale canvas back down using CSS
      canvas.style.width = canvasDimensions.width + 'px';
      canvas.style.height = canvasDimensions.height + 'px';
      
      // Scale the drawing context to match device pixel ratio
      ctx.scale(dpr, dpr);
      
      // Enable crisp pixel rendering
      ctx.imageSmoothingEnabled = false;
    };

    window.addEventListener('resize', handleResize);
    
    // Setup canvas first
    setupCanvas();
    
    // Initialize game
    initializeGame();
    
    return () => window.removeEventListener('resize', handleResize);
  }, [canvasDimensions.width, canvasDimensions.height]);

  const initializeGame = useCallback(() => {
    console.log('Initializing PhraiCrush game...');
    
    // Reset all states
    setGameOver(false);
    setPaused(false);
    setSelectedCandy(null);
    setValidMoves([]);
    setParticles([]);
    setGameStarted(false);
    
    try {
      const newBoard = generateBoard();
      console.log('Generated board with', newBoard.length, 'rows');
      
      setPlayer({
        id: 'player1',
        name: 'Player',
        score: 0,
        moves: 30,
        level: 1,
        board: newBoard,
        zone: 'LAND',
        powerUps: [],
        comboStreak: 0,
        specialMeter: 0
      });
      
      // Start game after board is set
      setTimeout(() => {
        setGameStarted(true);
        console.log('Game started successfully');
      }, 100);
      
    } catch (error) {
      console.error('Failed to initialize game:', error);
    }
  }, []);

  const generateBoard = (): Candy[][] => {
    const board: Candy[][] = [];
    
    for (let row = 0; row < BOARD_SIZE; row++) {
      board[row] = [];
      for (let col = 0; col < BOARD_SIZE; col++) {
        board[row][col] = generateCandy(row, col);
      }
    }
    
    // Ensure no initial matches
    removeInitialMatches(board);
    
    return board;
  };

  const generateCandy = (row: number, col: number): Candy => {
    const zone = getCurrentZone(row);
    const candyTypes = getCandyTypesForZone(zone);
    const type = candyTypes[Math.floor(Math.random() * candyTypes.length)];
    
    return {
      type,
      special: 'none',
      zone,
      id: `${row}-${col}-${Date.now()}`,
      row,
      col,
      falling: false,
      fallDistance: 0,
      matched: false,
      animationTimer: 0,
      glowIntensity: 0,
      pulsePhase: Math.random() * Math.PI * 2
    };
  };

  const getCurrentZone = (row: number): string => {
    const progress = row / BOARD_SIZE;
    if (progress < 0.15) return 'LAND';
    if (progress < 0.3) return 'SKY';
    if (progress < 0.45) return 'ATMOSPHERE';
    if (progress < 0.6) return 'SPACE';
    if (progress < 0.75) return 'DEEP_SPACE';
    if (progress < 0.9) return 'BLACK_HOLE';
    return 'RAINBOW';
  };

  const getCandyTypesForZone = (zone: string): CandyType[] => {
    switch (zone) {
      case 'LAND':
        return ['land_crystal', 'land_flower', 'land_root'];
      case 'SKY':
        return ['sky_cloud', 'sky_lightning', 'sky_wind'];
      case 'ATMOSPHERE':
        return ['atmosphere_fire', 'atmosphere_metal', 'atmosphere_lava'];
      case 'SPACE':
        return ['space_star', 'space_planet', 'space_nebula'];
      case 'DEEP_SPACE':
        return ['deepspace_void', 'deepspace_crystal', 'deepspace_energy'];
      case 'BLACK_HOLE':
        return ['blackhole_matter', 'blackhole_gravity', 'blackhole_singularity'];
      case 'RAINBOW':
        return ['rainbow_magic', 'rainbow_sparkle', 'rainbow_wish'];
      default:
        return ['land_crystal', 'land_flower', 'land_root'];
    }
  };

  const removeInitialMatches = (board: Candy[][]) => {
    let hasMatches = true;
    let attempts = 0;
    
    while (hasMatches && attempts < 100) {
      hasMatches = false;
      attempts++;
      
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          if (hasMatchAt(board, row, col)) {
            board[row][col] = generateCandy(row, col);
            hasMatches = true;
          }
        }
      }
    }
  };

  const hasMatchAt = (board: Candy[][], row: number, col: number): boolean => {
    const candy = board[row][col];
    
    // Check horizontal match
    let horizontalCount = 1;
    for (let c = col - 1; c >= 0 && board[row][c].type === candy.type; c--) {
      horizontalCount++;
    }
    for (let c = col + 1; c < BOARD_SIZE && board[row][c].type === candy.type; c++) {
      horizontalCount++;
    }
    
    // Check vertical match
    let verticalCount = 1;
    for (let r = row - 1; r >= 0 && board[r][col].type === candy.type; r--) {
      verticalCount++;
    }
    for (let r = row + 1; r < BOARD_SIZE && board[r][col].type === candy.type; r++) {
      verticalCount++;
    }
    
    return horizontalCount >= MATCH_MIN || verticalCount >= MATCH_MIN;
  };

  const handleCandyClick = (row: number, col: number) => {
    if (!gameStarted || gameOver || paused) return;
    
    if (!selectedCandy) {
      // First selection
      setSelectedCandy({ row, col });
      setValidMoves(getValidMoves(row, col));
    } else if (selectedCandy.row === row && selectedCandy.col === col) {
      // Deselect
      setSelectedCandy(null);
      setValidMoves([]);
    } else if (isValidMove(selectedCandy, { row, col })) {
      // Valid swap
      performSwap(selectedCandy, { row, col });
      setSelectedCandy(null);
      setValidMoves([]);
    } else {
      // New selection
      setSelectedCandy({ row, col });
      setValidMoves(getValidMoves(row, col));
    }
  };

  const getValidMoves = (row: number, col: number): {row: number, col: number}[] => {
    const moves = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    
    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;
      
      if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
        if (isValidMove({ row, col }, { row: newRow, col: newCol })) {
          moves.push({ row: newRow, col: newCol });
        }
      }
    }
    
    return moves;
  };

  const isValidMove = (from: {row: number, col: number}, to: {row: number, col: number}): boolean => {
    // Check if adjacent
    const rowDiff = Math.abs(from.row - to.row);
    const colDiff = Math.abs(from.col - to.col);
    if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
      // Simulate swap and check for matches
      const tempBoard = player.board.map(row => [...row]);
      [tempBoard[from.row][from.col], tempBoard[to.row][to.col]] = 
      [tempBoard[to.row][to.col], tempBoard[from.row][from.col]];
      
      return hasMatchAt(tempBoard, from.row, from.col) || hasMatchAt(tempBoard, to.row, to.col);
    }
    return false;
  };

  const performSwap = (from: {row: number, col: number}, to: {row: number, col: number}) => {
    setPlayer(prev => {
      const newBoard = prev.board.map(row => [...row]);
      [newBoard[from.row][from.col], newBoard[to.row][to.col]] = 
      [newBoard[to.row][to.col], newBoard[from.row][from.col]];
      
      // Update positions
      newBoard[from.row][from.col].row = from.row;
      newBoard[from.row][from.col].col = from.col;
      newBoard[to.row][to.col].row = to.row;
      newBoard[to.row][to.col].col = to.col;
      
      return {
        ...prev,
        board: newBoard,
        moves: prev.moves - 1
      };
    });
    
    // Process matches after swap
    setTimeout(() => processMatches(), 300);
  };

  const processMatches = () => {
    const matches = findMatches();
    
    if (matches.length > 0) {
      // Mark matched candies
      matches.forEach(match => {
        match.candies.forEach(candy => {
          candy.matched = true;
          candy.animationTimer = Date.now();
        });
      });
      
      // Calculate score
      const scoreGain = calculateScore(matches);
      setPlayer(prev => ({ 
        ...prev, 
        score: prev.score + scoreGain,
        comboStreak: prev.comboStreak + 1,
        specialMeter: Math.min(100, prev.specialMeter + matches.length * 5)
      }));
      
      // Add particles
      matches.forEach(match => {
        match.candies.forEach(candy => {
          addMatchParticles(candy);
        });
      });
      
      // Remove matched candies and drop new ones
      setTimeout(() => {
        removeMatchedCandies();
        dropCandies();
        setTimeout(() => processMatches(), 500); // Check for cascade matches
      }, 500);
    } else {
      // Reset combo if no matches
      setPlayer(prev => ({ ...prev, comboStreak: 0 }));
      
      // Check for game over
      if (player.moves <= 0 && !hasValidMoves()) {
        setGameOver(true);
      }
    }
  };

  const findMatches = (): Match[] => {
    const matches: Match[] = [];
    const board = player.board;
    
    // Find horizontal matches
    for (let row = 0; row < BOARD_SIZE; row++) {
      let currentMatch: Candy[] = [board[row][0]];
      
      for (let col = 1; col < BOARD_SIZE; col++) {
        if (board[row][col].type === currentMatch[0].type && !board[row][col].matched) {
          currentMatch.push(board[row][col]);
        } else {
          if (currentMatch.length >= MATCH_MIN) {
            matches.push({
              candies: currentMatch,
              pattern: 'line',
              combo: player.comboStreak,
              zoneBonus: currentMatch.every(c => c.zone === currentMatch[0].zone)
            });
          }
          currentMatch = [board[row][col]];
        }
      }
      
      if (currentMatch.length >= MATCH_MIN) {
        matches.push({
          candies: currentMatch,
          pattern: 'line',
          combo: player.comboStreak,
          zoneBonus: currentMatch.every(c => c.zone === currentMatch[0].zone)
        });
      }
    }
    
    // Find vertical matches
    for (let col = 0; col < BOARD_SIZE; col++) {
      let currentMatch: Candy[] = [board[0][col]];
      
      for (let row = 1; row < BOARD_SIZE; row++) {
        if (board[row][col].type === currentMatch[0].type && !board[row][col].matched) {
          currentMatch.push(board[row][col]);
        } else {
          if (currentMatch.length >= MATCH_MIN) {
            matches.push({
              candies: currentMatch,
              pattern: 'line',
              combo: player.comboStreak,
              zoneBonus: currentMatch.every(c => c.zone === currentMatch[0].zone)
            });
          }
          currentMatch = [board[row][col]];
        }
      }
      
      if (currentMatch.length >= MATCH_MIN) {
        matches.push({
          candies: currentMatch,
          pattern: 'line',
          combo: player.comboStreak,
          zoneBonus: currentMatch.every(c => c.zone === currentMatch[0].zone)
        });
      }
    }
    
    return matches;
  };

  const calculateScore = (matches: Match[]): number => {
    let score = 0;
    
    matches.forEach(match => {
      let baseScore = match.candies.length * 100;
      
      // Combo multiplier
      const comboMultiplier = COMBO_MULTIPLIERS[Math.min(match.combo, COMBO_MULTIPLIERS.length - 1)];
      baseScore *= comboMultiplier;
      
      // Zone bonus
      if (match.zoneBonus) {
        baseScore *= 1.5;
      }
      
      // Special pattern bonus
      if (match.pattern !== 'line') {
        baseScore *= 2;
      }
      
      score += baseScore;
    });
    
    return Math.floor(score);
  };

  const addMatchParticles = (candy: Candy) => {
    const zoneColors = ZONES[candy.zone as keyof typeof ZONES]?.colors || ['#FFD700'];
    const centerX = candy.col * CANDY_SIZE + CANDY_SIZE / 2;
    const centerY = candy.row * CANDY_SIZE + CANDY_SIZE / 2;
    
    for (let i = 0; i < 8; i++) {
      setParticles(prev => [...prev, {
        x: centerX,
        y: centerY,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        color: zoneColors[Math.floor(Math.random() * zoneColors.length)],
        size: Math.random() * 6 + 2,
        life: 1,
        decay: 0.02,
        type: 'sparkle'
      }]);
    }
  };

  const removeMatchedCandies = () => {
    setPlayer(prev => {
      const newBoard = prev.board.map(row => [...row]);
      
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          if (newBoard[row][col].matched) {
            newBoard[row][col] = generateCandy(row, col);
            newBoard[row][col].falling = true;
            newBoard[row][col].fallDistance = row * CANDY_SIZE;
          }
        }
      }
      
      return { ...prev, board: newBoard };
    });
  };

  const dropCandies = () => {
    // Implement gravity for falling candies
    setPlayer(prev => {
      const newBoard = prev.board.map(row => [...row]);
      
      for (let col = 0; col < BOARD_SIZE; col++) {
        let writeRow = BOARD_SIZE - 1;
        
        for (let readRow = BOARD_SIZE - 1; readRow >= 0; readRow--) {
          if (!newBoard[readRow][col].matched) {
            if (writeRow !== readRow) {
              newBoard[writeRow][col] = { ...newBoard[readRow][col] };
              newBoard[writeRow][col].row = writeRow;
              newBoard[writeRow][col].falling = true;
              newBoard[readRow][col] = generateCandy(readRow, col);
            }
            writeRow--;
          }
        }
        
        // Fill empty spaces with new candies
        for (let row = writeRow; row >= 0; row--) {
          newBoard[row][col] = generateCandy(row, col);
          newBoard[row][col].falling = true;
          newBoard[row][col].fallDistance = (writeRow - row + 1) * CANDY_SIZE;
        }
      }
      
      return { ...prev, board: newBoard };
    });
  };

  const hasValidMoves = (): boolean => {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (getValidMoves(row, col).length > 0) {
          return true;
        }
      }
    }
    return false;
  };

  const startGameLoop = useCallback(() => {
    console.log('Starting game loop...');
    
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
    
    const gameLoop = (timestamp: number) => {
      try {
        updateGame(timestamp);
        renderGame(timestamp);
        
        if (gameStarted && !gameOver && !paused) {
          gameLoopRef.current = requestAnimationFrame(gameLoop);
        }
      } catch (error) {
        console.error('Game loop error:', error);
      }
    };
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameStarted, gameOver, paused]);

  const updateGame = (timestamp: number) => {
    // Update falling candies
    setPlayer(prev => {
      const newBoard = prev.board.map(row => [...row]);
      let needsUpdate = false;
      
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          const candy = newBoard[row][col];
          
          if (candy.falling && candy.fallDistance > 0) {
            candy.fallDistance = Math.max(0, candy.fallDistance - 8);
            needsUpdate = true;
            
            if (candy.fallDistance === 0) {
              candy.falling = false;
            }
          }
          
          // Update animations (simplified)
          candy.pulsePhase += 0.05;
        }
      }
      
      return needsUpdate ? { ...prev, board: newBoard } : prev;
    });
    
    // Update particles
    setParticles(prev => 
      prev.map(particle => ({
        ...particle,
        x: particle.x + particle.vx,
        y: particle.y + particle.vy,
        life: particle.life - particle.decay,
        size: particle.size * 0.98
      })).filter(particle => particle.life > 0)
    );
  };

  const renderGame = (timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Render zone background
    renderZoneBackground(ctx, timestamp);
    
    // Render board
    renderBoard(ctx);
    
    // Render UI
    renderUI(ctx);
    
    // Render particles
    renderParticles(ctx);
  };

  const renderZoneBackground = (ctx: CanvasRenderingContext2D, timestamp: number) => {
    const currentZoneData = ZONES[currentZone as keyof typeof ZONES];
    if (!currentZoneData) return;
    
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasDimensions.height);
    currentZoneData.colors.forEach((color, index) => {
      gradient.addColorStop(index / (currentZoneData.colors.length - 1), color);
    });
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasDimensions.width, canvasDimensions.height);
    
    // Add animated effects based on zone
    renderZoneEffects(ctx, timestamp);
  };

  const renderZoneEffects = (ctx: CanvasRenderingContext2D, timestamp: number) => {
    const time = timestamp * 0.001;
    
    switch (currentZone) {
      case 'SKY':
        // Floating clouds
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < 5; i++) {
          const x = (time * 20 + i * 100) % (canvasDimensions.width + 100) - 50;
          const y = 100 + Math.sin(time + i) * 20;
          ctx.beginPath();
          ctx.arc(x, y, 30, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        break;
        
      case 'SPACE':
        // Twinkling stars
        ctx.save();
        for (let i = 0; i < 20; i++) {
          const x = (i * 47) % canvasDimensions.width;
          const y = (i * 73) % canvasDimensions.height;
          const alpha = Math.sin(time * 2 + i) * 0.5 + 0.5;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(x, y, 2, 2);
        }
        ctx.restore();
        break;
    }
  };

  const renderBoard = (ctx: CanvasRenderingContext2D) => {
    const boardOffsetX = (canvasDimensions.width - BOARD_SIZE * CANDY_SIZE) / 2;
    const boardOffsetY = (canvasDimensions.height - BOARD_SIZE * CANDY_SIZE) / 2;
    
    ctx.save();
    ctx.translate(boardOffsetX, boardOffsetY);
    
    // Render candies - add safety check
    if (player.board && player.board.length > 0) {
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          if (player.board[row] && player.board[row][col]) {
            const candy = player.board[row][col];
            renderCandy(ctx, candy, col * CANDY_SIZE, row * CANDY_SIZE);
          }
        }
      }
    } else {
      // Debug: Show that board is empty
      ctx.fillStyle = 'white';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Loading board...', BOARD_SIZE * CANDY_SIZE / 2, BOARD_SIZE * CANDY_SIZE / 2);
    }
    
    // Render selection and valid moves
    if (selectedCandy) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.strokeRect(
        selectedCandy.col * CANDY_SIZE, 
        selectedCandy.row * CANDY_SIZE, 
        CANDY_SIZE, 
        CANDY_SIZE
      );
    }
    
    validMoves.forEach(move => {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(move.col * CANDY_SIZE, move.row * CANDY_SIZE, CANDY_SIZE, CANDY_SIZE);
      ctx.restore();
    });
    
    ctx.restore();
  };

  const renderCandy = (ctx: CanvasRenderingContext2D, candy: Candy, x: number, y: number) => {
    if (!candy) return;
    
    const adjustedY = y - (candy.fallDistance || 0);
    
    ctx.save();
    ctx.translate(x + CANDY_SIZE / 2, adjustedY + CANDY_SIZE / 2);
    
    // Special candy subtle pulsing effect only
    if (candy.special !== 'none') {
      const pulseScale = 1 + Math.sin(candy.pulsePhase) * 0.03;
      ctx.scale(pulseScale, pulseScale);
    }
    
    // Main candy with crisp rendering
    ctx.fillStyle = getCandyColor(candy.type);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1.5;
    
    drawCandyShape(ctx, candy.type, -CANDY_SIZE / 2 + 2, -CANDY_SIZE / 2 + 2, CANDY_SIZE - 4);
    
    // Fill and stroke
    ctx.fill();
    ctx.stroke();
    
    // Add subtle inner highlight for depth
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    drawCandyShape(ctx, candy.type, -CANDY_SIZE / 2 + 4, -CANDY_SIZE / 2 + 4, CANDY_SIZE - 8);
    ctx.fill();
    
    // Special candy indicators (toned down)
    if (candy.special && candy.special !== 'none') {
      renderSpecialCandyEffect(ctx, candy.special);
    }
    
    // Match animation
    if (candy.matched) {
      const elapsed = Date.now() - candy.animationTimer;
      const progress = Math.min(elapsed / 500, 1);
      ctx.globalAlpha = 1 - progress;
      ctx.scale(1 + progress * 0.3, 1 + progress * 0.3);
    }
    
    ctx.restore();
  };

  const getCandyColor = (type: CandyType): string => {
    const colorMap: { [key in CandyType]: string } = {
      // Land zone
      'land_crystal': '#8B4513',
      'land_flower': '#FFD700',
      'land_root': '#228B22',
      
      // Sky zone
      'sky_cloud': '#FFFFFF',
      'sky_lightning': '#FFE4B5',
      'sky_wind': '#87CEEB',
      
      // Atmosphere zone
      'atmosphere_fire': '#FF6347',
      'atmosphere_metal': '#DC143C',
      'atmosphere_lava': '#FF8C00',
      
      // Space zone
      'space_star': '#00CED1',
      'space_planet': '#4169E1',
      'space_nebula': '#191970',
      
      // Deep space zone
      'deepspace_void': '#4B0082',
      'deepspace_crystal': '#9932CC',
      'deepspace_energy': '#8A2BE2',
      
      // Black hole zone
      'blackhole_matter': '#000000',
      'blackhole_gravity': '#8A2BE2',
      'blackhole_singularity': '#FF1493',
      
      // Rainbow zone
      'rainbow_magic': '#FF0000',
      'rainbow_sparkle': '#00FF00',
      'rainbow_wish': '#0000FF'
    };
    
    return colorMap[type] || '#FFD700';
  };

  const drawCandyShape = (ctx: CanvasRenderingContext2D, type: CandyType, x: number, y: number, size: number) => {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const radius = size * 0.35;
    
    ctx.beginPath();
    
    if (type.includes('crystal')) {
      // Diamond shape for crystals
      ctx.moveTo(centerX, centerY - radius);
      ctx.lineTo(centerX + radius, centerY);
      ctx.lineTo(centerX, centerY + radius);
      ctx.lineTo(centerX - radius, centerY);
      ctx.closePath();
    } else if (type.includes('star')) {
      // Star shape
      drawStar(ctx, centerX, centerY, 5, radius, radius * 0.5);
    } else if (type.includes('cloud')) {
      // Fluffy cloud shape - draw main body first
      ctx.arc(centerX, centerY, radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
      
      // Add smaller puffs
      ctx.beginPath();
      ctx.arc(centerX - radius * 0.4, centerY - radius * 0.3, radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(centerX + radius * 0.4, centerY - radius * 0.3, radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
      
      return; // Skip the main fill since we already filled
    } else if (type.includes('flower')) {
      // Flower shape - multiple petals
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6;
        const petalX = centerX + Math.cos(angle) * radius * 0.7;
        const petalY = centerY + Math.sin(angle) * radius * 0.7;
        ctx.beginPath();
        ctx.arc(petalX, petalY, radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      // Center
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.3, 0, Math.PI * 2);
    } else {
      // Default circle
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    }
    
    ctx.fill();
  };

  const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  };

  const renderSpecialCandyEffect = (ctx: CanvasRenderingContext2D, special: SpecialCandyType) => {
    ctx.save();
    
    switch (special) {
      case 'horizontal_blast':
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-CANDY_SIZE / 3, 0);
        ctx.lineTo(CANDY_SIZE / 3, 0);
        ctx.stroke();
        break;
        
      case 'vertical_blast':
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -CANDY_SIZE / 3);
        ctx.lineTo(0, CANDY_SIZE / 3);
        ctx.stroke();
        break;
        
      case 'bomb':
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(0, 0, CANDY_SIZE / 6, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
    
    ctx.restore();
  };

  const renderUI = (ctx: CanvasRenderingContext2D) => {
    const boardTop = (canvasDimensions.height - BOARD_SIZE * CANDY_SIZE) / 2;
    const boardBottom = boardTop + (BOARD_SIZE * CANDY_SIZE);
    
    // Score (top left)
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(`Score: ${player.score.toLocaleString()}`, 20, 40);
    
    // Moves (top left, below score)
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`Moves: ${player.moves}`, 20, 70);
    
    // Level (top right)
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Level: ${player.level}`, canvasDimensions.width - 20, 40);
    
    // Zone (top center, above board)
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${ZONES[currentZone as keyof typeof ZONES]?.name || currentZone}`, canvasDimensions.width / 2, boardTop - 20);
    
    // Combo streak (center of screen when active)
    if (player.comboStreak > 0) {
      ctx.font = 'bold 32px Arial';
      ctx.fillStyle = '#FFD700';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 6;
      ctx.fillText(`${player.comboStreak}x COMBO!`, canvasDimensions.width / 2, canvasDimensions.height / 2 - 50);
    }
    
    // Instructions (bottom center, below board)
    ctx.font = '16px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 2;
    ctx.fillText('Tap candies to select and swap', canvasDimensions.width / 2, boardBottom + 30);
    
    // Special meter
    renderSpecialMeter(ctx);
  };

  const renderSpecialMeter = (ctx: CanvasRenderingContext2D) => {
    const meterX = canvasDimensions.width - 40;
    const meterY = 100;
    const meterWidth = 20;
    const meterHeight = 200;
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(meterX, meterY, meterWidth, meterHeight);
    
    // Fill
    const fillHeight = (player.specialMeter / 100) * meterHeight;
    const gradient = ctx.createLinearGradient(0, meterY + meterHeight, 0, meterY);
    gradient.addColorStop(0, '#FF0000');
    gradient.addColorStop(0.5, '#FFD700');
    gradient.addColorStop(1, '#00FF00');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(meterX, meterY + meterHeight - fillHeight, meterWidth, fillHeight);
    
    // Border
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(meterX, meterY, meterWidth, meterHeight);
  };

  const renderParticles = (ctx: CanvasRenderingContext2D) => {
    particles.forEach(particle => {
      ctx.save();
      ctx.globalAlpha = particle.life;
      ctx.fillStyle = particle.color;
      
      if (particle.type === 'sparkle') {
        drawStar(ctx, particle.x, particle.y, 4, particle.size, particle.size * 0.5);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    });
  };

  // Enhanced Touch/Click handlers for full responsiveness
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleInteraction = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!gameStarted || gameOver || paused) {
        console.log('Game not ready for interaction');
        return;
      }
      
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      const x = (clientX - rect.left) * (canvas.width / rect.width);
      const y = (clientY - rect.top) * (canvas.height / rect.height);
      
      const boardOffsetX = (canvasDimensions.width - BOARD_SIZE * CANDY_SIZE) / 2;
      const boardOffsetY = (canvasDimensions.height - BOARD_SIZE * CANDY_SIZE) / 2;
      
      console.log('Interaction at:', { x, y, boardOffsetX, boardOffsetY });
      
      if (x >= boardOffsetX && y >= boardOffsetY && 
          x < boardOffsetX + BOARD_SIZE * CANDY_SIZE && 
          y < boardOffsetY + BOARD_SIZE * CANDY_SIZE) {
        
        const col = Math.floor((x - boardOffsetX) / CANDY_SIZE);
        const row = Math.floor((y - boardOffsetY) / CANDY_SIZE);
        
        console.log('Clicked candy at:', { row, col });
        
        if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
          handleCandyClick(row, col);
        }
      }
    };

    // Add multiple event types for maximum responsiveness
    canvas.addEventListener('click', handleInteraction, { passive: false });
    canvas.addEventListener('touchstart', handleInteraction, { passive: false });
    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, { passive: false });
    
    return () => {
      canvas.removeEventListener('click', handleInteraction);
      canvas.removeEventListener('touchstart', handleInteraction);
      canvas.removeEventListener('touchend', handleInteraction);
      canvas.removeEventListener('touchmove', handleInteraction);
    };
  }, [gameStarted, gameOver, paused, canvasDimensions, handleCandyClick]);

  // Game loop management - start immediately when game is ready
  useEffect(() => {
    console.log('Game state:', { gameStarted, gameOver, paused, boardLength: player.board.length });
    
    if (gameStarted && !gameOver && !paused && player.board.length > 0) {
      console.log('Starting game loop now...');
      startGameLoop();
    }
    
    return () => {
      if (gameLoopRef.current) {
        console.log('Stopping game loop...');
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameStarted, gameOver, paused, startGameLoop, player.board.length]);

  return (
    <div className="phraicrush-container">
      <canvas
        ref={canvasRef}
        width={canvasDimensions.width}
        height={canvasDimensions.height}
        className="phraicrush-canvas"
      />
      
      {/* Loading indicator */}
      {(!gameStarted || player.board.length === 0) && (
        <div className="loading-spinner"></div>
      )}
      
      {gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-content">
            <h2>Game Over!</h2>
            <p>Final Score: {player.score.toLocaleString()}</p>
            <button onClick={() => navigate('/play')}>Back to Games</button>
            <button onClick={() => {
              setGameOver(false);
              setGameStarted(false);
              initializeGame();
            }}>Play Again</button>
          </div>
        </div>
      )}
      
      <div className="phraicrush-ui">
        <button 
          className="back-button"
          onClick={() => navigate('/play')}
        >
          ← Back
        </button>
        
        <button 
          className="pause-button"
          onClick={() => setPaused(!paused)}
        >
          {paused ? '▶' : '⏸'}
        </button>
      </div>
    </div>
  );
}