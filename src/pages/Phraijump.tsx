import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { petService } from '../services/firebase';
import { getPetEmotionImage } from "../utils/petImageSelector";
import './Phraijump.css';

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  zoneType: string; // Zone where platform was created - doesn't change
  isMoving?: boolean;
  moveSpeed?: number;
  moveDirection?: number;
  moveRange?: number;
  originalX?: number;
  originalY?: number;
  // Animation states
  wiggleTimer?: number;
  wiggleIntensity?: number;
  fadeAlpha?: number;
  fadeDirection?: number;
  rotationAngle?: number;
  rotationSpeed?: number;
  // Whimsical bounce and weight effects
  bounceTimer?: number;
  bounceIntensity?: number;
  tiltAngle?: number;
  tiltTimer?: number;
  squishScale?: number;
  squishTimer?: number;
  glowIntensity?: number;
  glowTimer?: number;
  // New special platform properties
  specialType?: 'bouncy' | 'crumbling' | 'sticky' | 'wind' | 'ice' | 'teleporter' | 'gravity' | 'magnetic' | 'phase' | 'rainbow';
  specialState?: number; // Used for timing, health, charge, etc.
  specialData?: any; // Zone-specific data
  crumbleTimer?: number;
  teleportPartner?: Platform;
  lastPlayerContact?: number;
}

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityX: number;
  velocityY: number;
  grounded: boolean;
  // Power-up effects
  activePowerUps: PowerUp[];
  jumpMultiplier: number;
  speedMultiplier: number;
  magnetRange: number;
  shieldActive: boolean;
  doubleJumpAvailable: boolean;
  lastGroundTime: number;
  // Advanced platformer mechanics
  coyoteTime: number; // Time since left platform (for coyote time)
  jumpBufferTime: number; // Time since jump was pressed (for jump buffering)
  lastJumpInput: number; // Timestamp of last jump input
  isJumpHeld: boolean; // Whether jump is currently held
  framesSinceGrounded: number; // Frames since leaving ground
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'basic' | 'flying' | 'spiky';
  speedX: number;
  speedY: number;
  range: number;
  originalX: number;
  originalY: number;
  zoneType: string;
  dead?: boolean;
  rotation?: number;
}

interface Collectible {
  x: number;
  y: number;
  type: 'coin' | 'crystal' | 'powerup';
  collected: boolean;
  pulsePhase: number;
  zoneType: string;
  powerUpType?: PowerUpType;
}

// New Power-up System
interface PowerUp {
  id: string;
  type: PowerUpType;
  duration: number;
  startTime: number;
  strength: number;
  zoneType: string;
}

type PowerUpType = 
  // Land Zone - Basic mobility
  | 'jump_boost' | 'speed_boost' | 'coin_magnet'
  // Sky Zone - Aerial mastery  
  | 'double_jump' | 'wind_glide' | 'cloud_dash'
  // Atmosphere Zone - Environmental protection
  | 'shield' | 'slow_motion' | 'heat_protection'
  // Space Zone - Zero gravity effects
  | 'anti_gravity' | 'rocket_boost' | 'magnetic_boots'
  // Deep Space Zone - Advanced tech
  | 'phase_walk' | 'time_dilation' | 'energy_burst'
  // Black Hole Zone - Reality bending
  | 'gravity_control' | 'dimension_shift' | 'singularity_shield'
  // Rainbow Zone - Pure magic
  | 'rainbow_bridge' | 'wish_fulfillment' | 'miracle_jump';

interface Achievement {
  id: string;
  name: string;
  description: string;
  target: number;
  current: number;
  completed: boolean;
  type: 'height' | 'jumps' | 'coins' | 'platforms' | 'tricks' | 'zones' | 'powerups';
  reward?: string;
}

interface GameStats {
  totalJumps: number;
  totalCoins: number;
  maxHeight: number;
  platformsLanded: number;
  tricksPerformed: number;
  zonesReached: Set<string>;
  totalDistance: number;
  playtime: number;
  gamesPlayed: number;
  powerUpsUsed: number;
  specialPlatformsUsed: number;
}

export default function Phraijump() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | undefined>(undefined);
  const keysRef = useRef<Set<string>>(new Set());
  const navigate = useNavigate();

  // Add body class for full-screen game
  useEffect(() => {
    document.body.classList.add('phraijump-active');
    return () => {
      document.body.classList.remove('phraijump-active');
    };
  }, []);
  
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const pausedRef = useRef<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [highScore, setHighScore] = useState<number>(() => {
    const v = localStorage.getItem('phraijump_highscore');
    return v ? Number(v) || 0 : 0;
  });
  const [canvasDimensions, setCanvasDimensions] = useState({ 
    width: window.innerWidth, 
    height: window.innerHeight - 52 - 56 // Account for header and navbar only
  });
  
  // New progression system states
  const [coins, setCoins] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [gameStats, setGameStats] = useState<GameStats>({
    totalJumps: 0,
    totalCoins: 0,
    maxHeight: 0,
    platformsLanded: 0,
    tricksPerformed: 0,
    zonesReached: new Set(),
    totalDistance: 0,
    playtime: 0,
    gamesPlayed: 0,
    powerUpsUsed: 0,
    specialPlatformsUsed: 0
  });

  // Touch control state
  const touchActiveRef = useRef<boolean>(false);
  const touchStartXRef = useRef<number>(0);
  const touchDirRef = useRef<-1 | 0 | 1>(0);
  
  
  // Game constants - these will be scaled based on screen size
  const BASE_WIDTH = 400;
  const BASE_HEIGHT = 600;
  const GRAVITY = 0.45; // Slightly reduced again for better float
  const JUMP_FORCE = -13.5; // Matched to gravity
  const BOUNCE_MULTIPLIER = 0.8; // dampen platform bounce to feel less springy
  const PLAYER_SPEED = 4.5; // Reduced from 5.5 for better control
  const PLATFORM_WIDTH = 100; // wider default platforms
  const PLATFORM_HEIGHT = 15;
  
  // Initialize achievements system
  const initializeAchievements = (): Achievement[] => [
    // Height-based achievements
    { id: 'first_jump', name: 'Getting Started', description: 'Jump on your first platform', target: 1, current: 0, completed: false, type: 'platforms', reward: '10 coins' },
    { id: 'sky_high', name: 'Sky High', description: 'Reach the Sky zone', target: 1, current: 0, completed: false, type: 'zones', reward: 'Character unlock' },
    { id: 'space_explorer', name: 'Space Explorer', description: 'Reach the Space zone', target: 1, current: 0, completed: false, type: 'zones', reward: 'New effects' },
    { id: 'cosmic_wanderer', name: 'Cosmic Wanderer', description: 'Reach the Deep Space zone', target: 1, current: 0, completed: false, type: 'zones', reward: 'Star trail' },
    
    // Coin-based achievements  
    { id: 'coin_collector', name: 'Coin Collector', description: 'Collect 100 coins total', target: 100, current: 0, completed: false, type: 'coins', reward: '50 bonus coins' },
    { id: 'treasure_hunter', name: 'Treasure Hunter', description: 'Collect 500 coins total', target: 500, current: 0, completed: false, type: 'coins', reward: 'Coin magnet' },
    { id: 'golden_touch', name: 'Golden Touch', description: 'Collect 1000 coins total', target: 1000, current: 0, completed: false, type: 'coins', reward: 'Golden character' },
    
    // Platform-based achievements
    { id: 'platform_hopper', name: 'Platform Hopper', description: 'Land on 50 platforms', target: 50, current: 0, completed: false, type: 'platforms', reward: 'Platform particles' },
    { id: 'precision_jumper', name: 'Precision Jumper', description: 'Land on 200 platforms', target: 200, current: 0, completed: false, type: 'platforms', reward: 'Perfect landing effects' },
    
    // Jump-based achievements
    { id: 'hopeful', name: 'Hopeful', description: 'Make 100 jumps', target: 100, current: 0, completed: false, type: 'jumps', reward: 'Jump boost' },
    { id: 'leap_of_faith', name: 'Leap of Faith', description: 'Make 500 jumps', target: 500, current: 0, completed: false, type: 'jumps', reward: 'Double jump unlock' },
    
    // Height achievements
    { id: 'rising_star', name: 'Rising Star', description: 'Reach height of 100m', target: 100, current: 0, completed: false, type: 'height', reward: 'Height multiplier' },
    { id: 'sky_scraper', name: 'Sky Scraper', description: 'Reach height of 500m', target: 500, current: 0, completed: false, type: 'height', reward: 'Cloud surfing' },
    { id: 'stratosphere', name: 'Stratosphere', description: 'Reach height of 1000m', target: 1000, current: 0, completed: false, type: 'height', reward: 'Atmosphere glow' },
    { id: 'reality-bender', name: 'Reality Bender', description: 'Reach the BLACK_HOLE zone', target: 1, current: 0, completed: false, type: 'zones', reward: '100 coins' },
    
    // Power-up and special platform achievements
    { id: 'power-user', name: 'Power User', description: 'Use 10 power-ups', target: 10, current: 0, completed: false, type: 'powerups', reward: '50 coins' },
    { id: 'super-charged', name: 'Super Charged', description: 'Use 50 power-ups', target: 50, current: 0, completed: false, type: 'powerups', reward: '200 coins' },
    { id: 'platform-master', name: 'Platform Master', description: 'Use 25 special platforms', target: 25, current: 0, completed: false, type: 'platforms', reward: '150 coins' },
    { id: 'gravity-defier', name: 'Gravity Defier', description: 'Use anti-gravity power-up 5 times', target: 5, current: 0, completed: false, type: 'powerups', reward: '75 coins' },
    { id: 'speed-demon', name: 'Speed Demon', description: 'Use speed boost power-up 10 times', target: 10, current: 0, completed: false, type: 'powerups', reward: '100 coins' },
    { id: 'double-trouble', name: 'Double Trouble', description: 'Perform 20 double jumps', target: 20, current: 0, completed: false, type: 'tricks', reward: '125 coins' },
    { id: 'magnetic-personality', name: 'Magnetic Personality', description: 'Collect 100 coins with magnet power-up', target: 100, current: 0, completed: false, type: 'coins', reward: '200 coins' },
    { id: 'rainbow-warrior', name: 'Rainbow Warrior', description: 'Use rainbow platform 10 times', target: 10, current: 0, completed: false, type: 'platforms', reward: '150 coins' },
    { id: 'teleporter', name: 'Teleporter', description: 'Use teleporter platforms 5 times', target: 5, current: 0, completed: false, type: 'platforms', reward: '100 coins' },
    { id: 'ice-breaker', name: 'Ice Breaker', description: 'Land on ice platforms 15 times', target: 15, current: 0, completed: false, type: 'platforms', reward: '75 coins' }
  ];

  // Initialize achievements on component mount
  useEffect(() => {
    const savedAchievements = localStorage.getItem('phraijump-achievements');
    const savedStats = localStorage.getItem('phraijump-stats');
    
    if (savedAchievements) {
      setAchievements(JSON.parse(savedAchievements));
    } else {
      setAchievements(initializeAchievements());
    }
    
    if (savedStats) {
      const stats = JSON.parse(savedStats);
      setGameStats({
        ...stats,
        zonesReached: new Set(stats.zonesReached || [])
      });
      setTotalCoins(stats.totalCoins || 0);
    }
  }, []);

  // Save achievements and stats to localStorage
  const saveProgress = useCallback(() => {
    localStorage.setItem('phraijump-achievements', JSON.stringify(achievements));
    localStorage.setItem('phraijump-stats', JSON.stringify({
      ...gameStats,
      zonesReached: Array.from(gameStats.zonesReached)
    }));
  }, [achievements, gameStats]);

  // Update achievement progress
  const updateAchievements = useCallback((type: string, value: number, context?: any) => {
    setAchievements(prev => {
      const updated = prev.map(achievement => {
        if (achievement.type === type && !achievement.completed) {
          const newCurrent = type === 'zones' ? (gameStats.zonesReached.has(context) ? 1 : 0) : 
                            Math.max(achievement.current, value);
          
          if (newCurrent >= achievement.target && !achievement.completed) {
            // Achievement completed!
            setNewAchievements(current => [...current, { ...achievement, completed: true }]);
            
            // Award rewards
            if (achievement.reward?.includes('coins')) {
              const coinAmount = parseInt(achievement.reward.match(/\d+/)?.[0] || '0');
              setTotalCoins(current => current + coinAmount);
              setCoins(current => current + coinAmount);
            }
            
            return { ...achievement, current: newCurrent, completed: true };
          }
          
          return { ...achievement, current: newCurrent };
        }
        return achievement;
      });
      
      return updated;
    });
  }, [gameStats.zonesReached]);

  // Display new achievements
  useEffect(() => {
    if (newAchievements.length > 0) {
      const timer = setTimeout(() => {
        setNewAchievements([]);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [newAchievements]);

  // Save progress periodically
  useEffect(() => {
    const interval = setInterval(saveProgress, 5000);
    return () => clearInterval(interval);
  }, [saveProgress]);
  
  // Zone thresholds based on height - new theme progression
  const ZONE_THRESHOLDS = {
    LAND: 0,              // Starting on land
    SKY: -2500,           // Up in the sky with clouds
    ATMOSPHERE: -5000,    // Upper atmosphere - orange to dark blue
    SPACE: -7500,         // Space with metal platforms and moon
    DEEP_SPACE: -10000,   // Deep space with twinkling stars
    BLACK_HOLE: -12500,   // Black hole with warped distortions
    RAINBOW: -15000       // Final rainbow dimension
  };
  
  // Get current zone and transition progress
  const getZoneInfo = (cameraY: number) => {
    let currentZone = 'LAND';
    let nextZone = 'SKY';
    let progress = 0;
    
    if (cameraY <= ZONE_THRESHOLDS.RAINBOW) {
      currentZone = 'RAINBOW';
      nextZone = 'RAINBOW';
      progress = 1;
    } else if (cameraY <= ZONE_THRESHOLDS.BLACK_HOLE) {
      currentZone = 'BLACK_HOLE';
      nextZone = 'RAINBOW';
      progress = (ZONE_THRESHOLDS.BLACK_HOLE - cameraY) / (ZONE_THRESHOLDS.BLACK_HOLE - ZONE_THRESHOLDS.RAINBOW);
    } else if (cameraY <= ZONE_THRESHOLDS.DEEP_SPACE) {
      currentZone = 'DEEP_SPACE';
      nextZone = 'BLACK_HOLE';
      progress = (ZONE_THRESHOLDS.DEEP_SPACE - cameraY) / (ZONE_THRESHOLDS.DEEP_SPACE - ZONE_THRESHOLDS.BLACK_HOLE);
    } else if (cameraY <= ZONE_THRESHOLDS.SPACE) {
      currentZone = 'SPACE';
      nextZone = 'DEEP_SPACE';
      progress = (ZONE_THRESHOLDS.SPACE - cameraY) / (ZONE_THRESHOLDS.SPACE - ZONE_THRESHOLDS.DEEP_SPACE);
    } else if (cameraY <= ZONE_THRESHOLDS.ATMOSPHERE) {
      currentZone = 'ATMOSPHERE';
      nextZone = 'SPACE';
      progress = (ZONE_THRESHOLDS.ATMOSPHERE - cameraY) / (ZONE_THRESHOLDS.ATMOSPHERE - ZONE_THRESHOLDS.SPACE);
    } else if (cameraY <= ZONE_THRESHOLDS.SKY) {
      currentZone = 'SKY';
      nextZone = 'ATMOSPHERE';
      progress = (ZONE_THRESHOLDS.SKY - cameraY) / (ZONE_THRESHOLDS.SKY - ZONE_THRESHOLDS.ATMOSPHERE);
    } else if (cameraY <= ZONE_THRESHOLDS.LAND) {
      currentZone = 'LAND';
      nextZone = 'SKY';
      progress = (ZONE_THRESHOLDS.LAND - cameraY) / (ZONE_THRESHOLDS.LAND - ZONE_THRESHOLDS.SKY);
    }
    
    return { currentZone, nextZone, progress: Math.max(0, Math.min(1, progress)) };
  };
  
  // Interpolate between two colors
  const lerpColor = (color1: string, color2: string, t: number) => {
    // Simple interpolation for hex colors
    if (color1.startsWith('#') && color2.startsWith('#')) {
      const hex1 = parseInt(color1.slice(1), 16);
      const hex2 = parseInt(color2.slice(1), 16);
      
      const r1 = (hex1 >> 16) & 255;
      const g1 = (hex1 >> 8) & 255;
      const b1 = hex1 & 255;
      
      const r2 = (hex2 >> 16) & 255;
      const g2 = (hex2 >> 8) & 255;
      const b2 = hex2 & 255;
      
      const r = Math.round(r1 + (r2 - r1) * t);
      const g = Math.round(g1 + (g2 - g1) * t);
      const b = Math.round(b1 + (b2 - b1) * t);
      
      return `rgb(${r}, ${g}, ${b})`;
    }
    return t < 0.5 ? color1 : color2;
  };
  
  // Zone color schemes with smooth transitions
  const getZoneColors = (currentZone: string, nextZone: string, progress: number, time: number) => {
    const zones = {
      LAND: {
        background: '#87CEEB', // Light blue background
        platforms: { fill: '#228B22', stroke: '#8B4513' }, // Green on top, brown on bottom
        player: { fill: '#FF6B6B', stroke: '#FF4444' }
      },
      SKY: {
        background: '#4A90E2', // Gradient blue background
        platforms: { fill: '#FFFFFF', stroke: '#CCCCCC' }, // White on top, grey on bottom
        player: { fill: '#FF6B6B', stroke: '#FF4444' }
      },
      ATMOSPHERE: {
        background: 'linear-gradient(to bottom, #FF7F00, #1a1a2e)', // Orange to dark blue gradient
        platforms: { fill: 'rgba(255, 255, 255, 0.2)', stroke: 'rgba(255, 255, 255, 0.1)' }, // Glass effect - clear with transparent white
        player: { fill: '#00FFFF', stroke: '#0080FF' }
      },
      SPACE: {
        background: '#000000', // Black background
        platforms: { fill: '#4A4A4A', stroke: '#666666' }, // Metal/satellite material
        player: { fill: '#FFFFFF', stroke: '#CCCCCC' }
      },
      DEEP_SPACE: {
        background: '#000000', // Still black background
        platforms: { fill: '#4A4A4A', stroke: '#666666' }, // Metal material continues
        player: { fill: '#FFFF00', stroke: '#FFCC00' }
      },
      BLACK_HOLE: {
        background: '#1A0D2E', // Dark purple/black warped background
        platforms: { 
          fill: `hsl(${(time * 0.02 + 280) % 360}, 60%, 30%)`, // Swirling purple platforms
          stroke: `hsl(${(time * 0.02 + 280) % 360}, 80%, 20%)` 
        },
        player: { 
          fill: `hsl(${(time * 0.03 + 300) % 360}, 70%, 60%)`, // Warped purple player
          stroke: `hsl(${(time * 0.03 + 300) % 360}, 90%, 40%)` 
        }
      },
      RAINBOW: {
        background: `hsl(${(time * 0.05) % 360}, 70%, 60%)`, // Changing rainbow colors
        platforms: { 
          fill: `hsl(${((time * 0.05) + 180) % 360}, 80%, 70%)`, 
          stroke: `hsl(${((time * 0.05) + 180) % 360}, 90%, 40%)` 
        },
        player: { 
          fill: `hsl(${(time * 0.05) % 360}, 90%, 70%)`, 
          stroke: `hsl(${(time * 0.05) % 360}, 90%, 40%)` 
        }
      }
    };
    
    const current = zones[currentZone as keyof typeof zones];
    const next = zones[nextZone as keyof typeof zones];
    
    if (currentZone === nextZone || progress === 0) {
      return current;
    }
    
    // Smooth interpolation between zones
    return {
      background: lerpColor(current.background, next.background, progress),
      platforms: {
        fill: lerpColor(current.platforms.fill, next.platforms.fill, progress),
        stroke: lerpColor(current.platforms.stroke, next.platforms.stroke, progress)
      },
      player: {
        fill: lerpColor(current.player.fill, next.player.fill, progress),
        stroke: lerpColor(current.player.stroke, next.player.stroke, progress)
      }
    };
  };
  
  // Cute 3D sphere character with realistic physics
  const renderPlayer = (ctx: CanvasRenderingContext2D, player: Player, screenY: number, zoneColors: any, time: number, platforms: Platform[]) => {
    const centerX = player.x + player.width / 2;
    const centerY = screenY + player.height / 2;
    let radius = player.width / 2;
    
    // Update squish animation
    const squishAnim = squishAnimationRef.current;
    if (squishAnim.active) {
      squishAnim.timer--;
      if (squishAnim.timer <= 0) {
        squishAnim.active = false;
      }
    }
    
    // Ultra-smooth, adorable squish effect (redesigned for silky smoothness)
    let squishFactorY = 1; // Vertical squish
    let squishFactorX = 1; // Horizontal expansion
    let squishOffsetY = 0; // Vertical position adjustment
    
    if (squishAnim.active) {
      const progress = 1 - (squishAnim.timer / squishAnim.maxTimer); // 0 to 1 (inverted for easier math)
      
      // Super smooth easing using sine waves for natural, organic movement
      const smoothStep = (t: number) => t * t * (3 - 2 * t); // Hermite interpolation
      const smootherStep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10); // Even smoother
      
      // Create a gentle bounce using sine functions for perfect smoothness
      const createSmoothBounce = (t: number, intensity: number, frequency: number) => {
        const decay = Math.exp(-t * 4); // Exponential decay
        const bounce = Math.sin(t * Math.PI * frequency) * decay;
        return bounce * intensity;
      };
      
      if (progress <= 0.05) {
        // VERY BRIEF Impact phase - like real physics (0 to 0.05 = ~3 frames)
        const impactT = progress / 0.05;
        const smoothT = smootherStep(impactT);
        
        squishFactorY = 1.0 - (0.45 * smoothT); // Squish to 55% height - dramatic but brief
        squishFactorX = 1.0 + (0.6 * smoothT); // Expand to 160% width - wide but not crazy
        squishOffsetY = radius * 0.2 * smoothT; // Subtle downward movement
        
      } else if (progress <= 0.25) {
        // QUICK Recovery phase - snappy bounce back (0.05 to 0.25 = ~12 frames)
        const recoveryT = (progress - 0.05) / 0.2;
        const smoothT = smoothStep(recoveryT);
        
        // Create gentle overshoot using sine wave - feels natural
        const overshoot = Math.sin(recoveryT * Math.PI) * 0.12; // Noticeable but not extreme
        
        squishFactorY = 0.55 + (0.45 * smoothT) + overshoot; // Quick return to normal + overshoot
        squishFactorX = 1.6 - (0.6 * smoothT) - (overshoot * 0.6); // Quick return to normal
        squishOffsetY = radius * 0.2 * (1 - smoothT); // Move back up quickly
        
      } else {
        // Long settle phase - gentle micro-bounces (0.25 to 1.0 = ~45 frames)
        const settleT = (progress - 0.25) / 0.75;
        
        // Create subtle micro-bounces that fade out naturally
        const microBounce = createSmoothBounce(settleT, 0.04, 3); // Gentle bounces
        
        squishFactorY = 1.0 + microBounce;
        squishFactorX = 1.0 - (microBounce * 0.4);
        squishOffsetY = 0; // No offset in settle phase
      }
      
      // Ensure values stay within dramatic but reasonable bounds
      squishFactorY = Math.max(0.4, Math.min(1.25, squishFactorY)); // Allow much more extreme squish
      squishFactorX = Math.max(0.8, Math.min(2.0, squishFactorX)); // Allow much wider expansion
    }
    
    const finalCenterY = centerY + squishOffsetY;
    const radiusX = radius * squishFactorX;
    const radiusY = radius * squishFactorY;
    
    // Find the nearest platform below for realistic shadow positioning
    let shadowY = centerY + 200; // Default far below
    let shadowDistance = 200;
    
    for (const platform of platforms) {
      const platformScreenY = platform.y - (player.y - screenY); // Convert to screen coordinates
      if (platformScreenY > centerY && // Platform is below player
          centerX >= platform.x - 20 && centerX <= platform.x + platform.width + 20) { // Horizontally aligned
        const distance = platformScreenY - centerY;
        if (distance < shadowDistance) {
          shadowDistance = distance;
          shadowY = platformScreenY;
        }
      }
    }
    
    // Realistic shadow that gets smaller and fainter with distance
    const shadowSize = Math.max(0.2, 1 - (shadowDistance / 150));
    const shadowAlpha = Math.max(0.1, 0.4 - (shadowDistance / 300));
    
    ctx.save();
    ctx.globalAlpha = shadowAlpha;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(centerX, shadowY, radiusX * 0.8 * shadowSize, radiusY * 0.2 * shadowSize, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    ctx.save();
    ctx.translate(centerX, finalCenterY);
    ctx.scale(squishFactorX, squishFactorY);

    if (petImageRef.current) {
      // Draw pet image
      ctx.drawImage(petImageRef.current, -radius, -radius, radius * 2, radius * 2);
      
      // Add some shine/gloss to the pet image
      const gloss = ctx.createRadialGradient(-radius * 0.3, -radius * 0.4, 0, 0, 0, radius * 0.8);
      gloss.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
      gloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gloss;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Fallback: Simple gradient circle
      const bodyGradient = ctx.createRadialGradient(-radius * 0.3, -radius * 0.4, 0, 0, 0, radius * 1.2);
      bodyGradient.addColorStop(0, '#FFFFFF');
      bodyGradient.addColorStop(0.5, '#FF6B9D');
      bodyGradient.addColorStop(1, '#8E1538');
      
      ctx.fillStyle = bodyGradient;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Simple eyes
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-radius * 0.4, -6, 5, 0, Math.PI * 2);
      ctx.arc(radius * 0.4, -6, 5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-radius * 0.4, -6, 2, 0, Math.PI * 2);
      ctx.arc(radius * 0.4, -6, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };
  
  // Enhanced platform rendering with zone-specific designs and animations
  const renderPlatform = (ctx: CanvasRenderingContext2D, platform: Platform, screenY: number, zoneColors: any, currentZone: string, time: number) => {
    const x = platform.x;
    const y = screenY;
    let width = platform.width;
    let height = platform.height;
    
    // **WHIMSICAL ANIMATION SYSTEM**
    let renderX = x;
    let renderY = y;
    let scaleX = 1;
    let scaleY = 1;
    let glowEffect = 0;
    let rotation = 0;
    
    // **WHIMSICAL BOUNCE WITH ZONE PERSONALITY**
    if (platform.bounceTimer && platform.bounceTimer > 0) {
      const maxBounceTimer = platform.zoneType === 'RAINBOW' ? 30 : 
                           platform.zoneType === 'SKY' ? 25 : 
                           platform.zoneType === 'BLACK_HOLE' ? 22 : 20;
      const bounceProgress = platform.bounceTimer / maxBounceTimer;
      
      let bounceEase;
      if (platform.zoneType === 'SKY') {
        // Fluffy cloud bounce - gentle and soft
        bounceEase = Math.sin(bounceProgress * Math.PI) * Math.exp(-bounceProgress * 1.5);
      } else if (platform.zoneType === 'RAINBOW') {
        // Magical bounce - extra bouncy with sparkle
        bounceEase = Math.sin(bounceProgress * Math.PI * 1.5) * Math.exp(-bounceProgress * 1.2);
      } else if (platform.zoneType === 'SPACE') {
        // Tech platform - precise mechanical response
        bounceEase = Math.sin(bounceProgress * Math.PI) * Math.exp(-bounceProgress * 3);
      } else {
        // Standard bounce curve
        bounceEase = Math.sin(bounceProgress * Math.PI) * Math.exp(-bounceProgress * 2);
      }
      
      renderY -= (platform.bounceIntensity || 0) * bounceEase;
      platform.bounceTimer--;
    }
    
    // **WEIGHT TILT WITH MATERIAL RESPONSE**
    if (platform.tiltTimer && platform.tiltTimer > 0) {
      const maxTiltTimer = platform.tiltTimer;
      const progress = (maxTiltTimer - platform.tiltTimer) / maxTiltTimer;
      
      let tiltEase;
      if (platform.zoneType === 'SKY') {
        // Clouds barely tilt - just gentle sway
        tiltEase = Math.sin(progress * Math.PI * 1.5) * Math.exp(-progress * 2) * 0.3;
      } else if (platform.zoneType === 'LAND') {
        // Earth platforms settle gradually
        tiltEase = Math.sin(progress * Math.PI) * Math.exp(-progress * 4) * 0.7;
      } else if (platform.zoneType === 'BLACK_HOLE') {
        // Void platforms warp reality
        tiltEase = Math.sin(progress * Math.PI * 2) * Math.exp(-progress * 1.5) * 1.2;
      } else {
        // Standard damped oscillation
        tiltEase = Math.sin(progress * Math.PI * 2) * Math.exp(-progress * 3);
      }
      
      platform.tiltAngle = tiltEase * 0.15; // Max tilt angle
      rotation += platform.tiltAngle;
      platform.tiltTimer--;
    }
    
    // **SQUISH EFFECT WITH MATERIAL PROPERTIES**
    if (platform.squishTimer && platform.squishTimer > 0) {
      const maxSquishTimer = platform.zoneType === 'RAINBOW' ? 25 : 
                           platform.zoneType === 'SKY' ? 20 : 15;
      const progress = (maxSquishTimer - platform.squishTimer) / maxSquishTimer;
      
      let squishEase;
      if (platform.zoneType === 'SKY') {
        // Clouds squish and expand dramatically
        squishEase = Math.sin(progress * Math.PI) * 1.5;
        scaleX = 1 + squishEase * 0.15; // More horizontal stretch
        scaleY = 1 - squishEase * 0.25; // More vertical squish
      } else if (platform.zoneType === 'RAINBOW') {
        // Magical platforms have exaggerated cartoon squish
        squishEase = Math.sin(progress * Math.PI * 1.2);
        scaleX = 1 + squishEase * 0.2;
        scaleY = 1 - squishEase * 0.3;
      } else {
        // Standard squish for solid materials
        squishEase = Math.sin(progress * Math.PI);
        scaleX = 1 + squishEase * 0.1;
        scaleY = 1 - squishEase * 0.15;
      }
      
      platform.squishTimer--;
    }
    
    // Glow effect
    if (platform.glowTimer && platform.glowTimer > 0) {
      const progress = platform.glowTimer / 30;
      glowEffect = (platform.glowIntensity || 0) * progress;
      platform.glowTimer--;
    }
    
    // Enhanced wiggle with zone-specific personality
    if (platform.wiggleTimer && platform.wiggleTimer > 0) {
      const wiggleAmount = (platform.wiggleIntensity || 0) * (platform.wiggleTimer / 30);
      
      if (platform.zoneType === 'SKY') {
        // Gentle cloud-like floating
        renderX += Math.sin(time * 0.01 + platform.x * 0.01) * wiggleAmount * 0.5;
        renderY += Math.cos(time * 0.008 + platform.x * 0.008) * wiggleAmount * 0.3;
      } else if (platform.zoneType === 'RAINBOW') {
        // Magical sparkly motion
        renderX += Math.sin(time * 0.02) * wiggleAmount;
        renderY += Math.cos(time * 0.025) * wiggleAmount * 0.7;
        rotation += Math.sin(time * 0.03) * 0.05;
      } else if (platform.zoneType === 'SPACE') {
        // Zero-g floating
        renderX += Math.sin(time * 0.005 + platform.y * 0.01) * wiggleAmount * 0.3;
        renderY += Math.cos(time * 0.007 + platform.y * 0.008) * wiggleAmount * 0.8;
      } else {
        // Standard jittery wiggle
        renderX += (Math.random() - 0.5) * wiggleAmount;
        renderY += (Math.random() - 0.5) * wiggleAmount * 0.5;
      }
      platform.wiggleTimer--;
    }
    
    // Apply rotation for special platforms
    if (platform.rotationSpeed) {
      platform.rotationAngle = (platform.rotationAngle || 0) + platform.rotationSpeed;
      rotation += platform.rotationAngle;
    }
    
    ctx.save();
    
    // Apply platform fade effect
    if (platform.fadeAlpha !== undefined && platform.fadeAlpha < 1) {
      ctx.globalAlpha = Math.max(0.3, platform.fadeAlpha);
      
      // Update fade effect
      if (platform.fadeDirection) {
        platform.fadeAlpha += platform.fadeDirection * 0.01;
        if (platform.fadeAlpha >= 1 || platform.fadeAlpha <= 0.3) {
          platform.fadeDirection *= -1;
        }
      }
    }
    
    // Apply transformations (rotation, scale, position)
    ctx.translate(renderX + width/2, renderY + height/2);
    if (rotation !== 0) {
      ctx.rotate(rotation);
    }
    if (scaleX !== 1 || scaleY !== 1) {
      ctx.scale(scaleX, scaleY);
      width *= scaleX;
      height *= scaleY;
    }
    renderX = -width/2;
    renderY = -height/2;
    
    // Add glow effect if active
    if (glowEffect > 0) {
      ctx.shadowColor = platform.zoneType === 'RAINBOW' ? '#FFD700' : 
                       platform.zoneType === 'SPACE' ? '#00BFFF' :
                       platform.zoneType === 'SKY' ? '#87CEEB' : '#FFFFFF';
      ctx.shadowBlur = glowEffect * 20;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // **COMPLETELY NEW ZONE-THEMED PLATFORM DESIGNS**
    
    switch (platform.zoneType) {
      case 'LAND':
        // 🌍 FLOATING ISLAND PLATFORMS
        ctx.shadowBlur = 0;
        
        // Underground root system
        ctx.fillStyle = '#8B4513';
          ctx.beginPath();
        ctx.ellipse(renderX + width/2, renderY + height, width * 0.3, height * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Main earth platform with organic shape
        const earthGrad = ctx.createLinearGradient(renderX, renderY, renderX, renderY + height);
        earthGrad.addColorStop(0, '#90EE90'); // Grass top
        earthGrad.addColorStop(0.3, '#8FBC8F');
        earthGrad.addColorStop(0.7, '#DEB887'); // Dirt middle
        earthGrad.addColorStop(1, '#8B4513'); // Deep earth
        ctx.fillStyle = earthGrad;
        ctx.beginPath();
        // Organic bumpy top
        ctx.moveTo(renderX, renderY + height * 0.3);
        for (let i = 0; i <= width; i += 8) {
          const grassHeight = Math.sin((i + time * 0.01) * 0.5) * 2;
          ctx.lineTo(renderX + i, renderY + grassHeight);
        }
        ctx.lineTo(renderX + width, renderY + height);
        ctx.lineTo(renderX, renderY + height);
        ctx.closePath();
        ctx.fill();
        
        // Animated grass blades that sway
        ctx.strokeStyle = '#228B22';
        ctx.lineWidth = 2;
        for (let i = 5; i < width; i += 12) {
          const swayPhase = time * 0.005 + i * 0.1;
          const grassSway = Math.sin(swayPhase) * 0.5;
          const grassHeight = 3 + Math.sin((i + time * 0.02) * 0.3) * 2;
          ctx.beginPath();
          ctx.moveTo(renderX + i, renderY);
          ctx.lineTo(renderX + i + grassSway, renderY - grassHeight);
          ctx.stroke();
        }
        
        // Blooming flowers that pulse
        ctx.fillStyle = '#FF69B4';
        for (let i = 8; i < width; i += 20) {
          if (Math.sin(i * 0.1) > 0.5) {
            const flowerPulse = 1 + Math.sin(time * 0.01 + i * 0.2) * 0.3;
            ctx.beginPath();
            ctx.arc(renderX + i, renderY - 2, 1.5 * flowerPulse, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        
        // Tiny butterflies occasionally
        if (Math.sin(time * 0.003 + platform.x * 0.01) > 0.8) {
          ctx.fillStyle = '#FFD700';
          const butterflyX = renderX + width * 0.7 + Math.sin(time * 0.02) * 10;
          const butterflyY = renderY - 8 + Math.cos(time * 0.03) * 3;
          ctx.fillRect(butterflyX - 1, butterflyY - 1, 2, 2);
        }
        break;
        
      case 'SKY':
        // ☁️ FLUFFY CLOUD PLATFORMS
        ctx.shadowBlur = 0;
        
        // Multiple cloud puffs for fluffy effect
        const cloudOpacity = 0.9 + Math.sin(time * 0.005) * 0.1;
        ctx.globalAlpha *= cloudOpacity;
        
        const puffs = [
          {x: 0, y: 0.3, size: 0.5},
          {x: 0.3, y: 0, size: 0.6},
          {x: 0.7, y: 0.2, size: 0.4},
          {x: 1, y: 0.4, size: 0.3}
        ];
        
        puffs.forEach(puff => {
          const puffGrad = ctx.createRadialGradient(
            renderX + width * puff.x, renderY + height * puff.y, 0,
            renderX + width * puff.x, renderY + height * puff.y, width * puff.size
          );
          puffGrad.addColorStop(0, '#FFFFFF');
          puffGrad.addColorStop(0.6, '#F0F8FF');
          puffGrad.addColorStop(1, 'rgba(176, 224, 230, 0.3)');
          
          ctx.fillStyle = puffGrad;
        ctx.beginPath();
          ctx.ellipse(
            renderX + width * puff.x, 
            renderY + height * puff.y, 
            width * puff.size * 0.8, 
            height * puff.size * 0.6, 
            0, 0, Math.PI * 2
          );
        ctx.fill();
        });
        
        // Wispy cloud trails that drift
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
          const wispY = renderY + height * (0.2 + i * 0.3);
          const driftSpeed = 0.01 + i * 0.005;
          ctx.beginPath();
          ctx.moveTo(renderX - 5, wispY);
          for (let x = 0; x < width + 10; x += 5) {
            const wispOffset = Math.sin((x + time * driftSpeed + i * 20) * 0.1) * 2;
            ctx.lineTo(renderX + x, wispY + wispOffset);
          }
          ctx.stroke();
        }
        
        // Tiny rain droplets occasionally
        if (platform.bounceTimer && platform.bounceTimer > 15) {
          ctx.fillStyle = 'rgba(135, 206, 235, 0.6)';
          for (let i = 0; i < 3; i++) {
            const dropX = renderX + width * (0.2 + i * 0.3);
            const dropY = renderY + height + 2 + i * 2;
            ctx.beginPath();
            ctx.arc(dropX, dropY, 1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
        
      case 'ATMOSPHERE':
        // 🔥 MOLTEN METAL FORGE PLATFORMS
        ctx.shadowBlur = 0;
        
        // Molten core with heat shimmer
        const heatShimmer = Math.sin(time * 0.05) * 2;
        const moltenGrad = ctx.createRadialGradient(
          renderX + width/2, renderY + height/2 + heatShimmer, 0,
          renderX + width/2, renderY + height/2, width * 0.8
        );
        moltenGrad.addColorStop(0, '#FFFF00'); // Hot white core
        moltenGrad.addColorStop(0.3, '#FF4500'); // Orange
        moltenGrad.addColorStop(0.7, '#DC143C'); // Red
        moltenGrad.addColorStop(1, '#8B0000'); // Dark red edges
        
        ctx.fillStyle = moltenGrad;
        ctx.beginPath();
        ctx.roundRect(renderX, renderY, width, height, 4);
        ctx.fill();
        
        // Lava bubbles
        ctx.fillStyle = '#FFFF99';
        for (let i = 0; i < 4; i++) {
          const bubblePhase = (time * 0.03 + i * 0.7) % (Math.PI * 2);
          const bubbleSize = 2 + Math.sin(bubblePhase) * 1.5;
          const bubbleX = renderX + width * (0.2 + i * 0.2);
          const bubbleY = renderY + height * 0.5;
          if (bubbleSize > 1) {
            ctx.beginPath();
            ctx.arc(bubbleX, bubbleY, bubbleSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        
        // Heat waves
        ctx.strokeStyle = 'rgba(255, 165, 0, 0.6)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const waveY = renderY - 8 - i * 4;
        ctx.beginPath();
          ctx.moveTo(renderX, waveY);
          for (let x = 0; x < width; x += 4) {
            const waveHeight = Math.sin((x + time * 0.1 + i * 30) * 0.3) * 2;
            ctx.lineTo(renderX + x, waveY + waveHeight);
          }
        ctx.stroke();
        }
        break;
        
      case 'SPACE':
        // 🌌 HIGH-TECH SPACE STATION PLATFORMS
        ctx.shadowBlur = 0;
        
        // Base tech platform
        const techGrad = ctx.createLinearGradient(renderX, renderY, renderX, renderY + height);
        techGrad.addColorStop(0, '#00CED1');
        techGrad.addColorStop(0.5, '#008B8B');
        techGrad.addColorStop(1, '#006666');
        ctx.fillStyle = techGrad;
        ctx.fillRect(renderX, renderY, width, height);
        
        // Glowing tech lines
        const glowPulse = 0.5 + Math.sin(time * 0.02) * 0.3;
        ctx.strokeStyle = `rgba(0, 191, 255, ${glowPulse})`;
        ctx.lineWidth = 2;
        
        // Horizontal power lines
        for (let i = 1; i < 3; i++) {
          const lineY = renderY + (height / 3) * i;
          ctx.beginPath();
          ctx.moveTo(renderX + 2, lineY);
          ctx.lineTo(renderX + width - 2, lineY);
          ctx.stroke();
        }
        
        // Vertical power lines
        for (let i = 1; i < 4; i++) {
          const lineX = renderX + (width / 4) * i;
          ctx.beginPath();
          ctx.moveTo(lineX, renderY + 2);
          ctx.lineTo(lineX, renderY + height - 2);
          ctx.stroke();
        }
        
        // Pulsing energy cores
        ctx.fillStyle = `rgba(0, 255, 255, ${glowPulse})`;
        const corePositions = [[0.25, 0.5], [0.75, 0.5]];
        corePositions.forEach(([px, py]) => {
          ctx.beginPath();
          ctx.arc(renderX + width * px, renderY + height * py, 3, 0, Math.PI * 2);
          ctx.fill();
        });
        
        // Holographic edge
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(renderX, renderY, width, height);
        break;
        
      case 'DEEP_SPACE':
        // ✨ ALIEN CRYSTAL FORMATIONS
        ctx.shadowBlur = 0;
        
        // Crystal base with faceted appearance
        const crystalGrad = ctx.createLinearGradient(renderX, renderY, renderX + width, renderY + height);
        const crystalHue = (time * 0.02) % 360;
        crystalGrad.addColorStop(0, `hsl(${crystalHue}, 70%, 80%)`);
        crystalGrad.addColorStop(0.5, `hsl(${crystalHue + 60}, 70%, 60%)`);
        crystalGrad.addColorStop(1, `hsl(${crystalHue + 120}, 70%, 40%)`);
        
        ctx.fillStyle = crystalGrad;
        
        // Crystal shape with faceted edges
        ctx.beginPath();
        ctx.moveTo(renderX + width * 0.1, renderY + height);
        ctx.lineTo(renderX + width * 0.2, renderY);
        ctx.lineTo(renderX + width * 0.8, renderY);
        ctx.lineTo(renderX + width * 0.9, renderY + height);
        ctx.closePath();
        ctx.fill();
        
        // Internal crystal facets
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(renderX + width * 0.3, renderY);
        ctx.lineTo(renderX + width * 0.7, renderY + height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(renderX + width * 0.7, renderY);
        ctx.lineTo(renderX + width * 0.3, renderY + height);
        ctx.stroke();
        
        // Glowing crystal energy
        const energyPulse = 0.3 + Math.sin(time * 0.03) * 0.2;
        ctx.fillStyle = `rgba(255, 255, 255, ${energyPulse})`;
        for (let i = 0; i < 3; i++) {
          const sparkleX = renderX + width * (0.25 + i * 0.25);
          const sparkleY = renderY + height * 0.5;
          ctx.fillRect(sparkleX - 1, sparkleY - 1, 2, 2);
        }
        
        // Crystal growth spikes
        ctx.fillStyle = crystalGrad;
        for (let i = 0; i < 2; i++) {
          const spikeX = renderX + width * (0.3 + i * 0.4);
          ctx.beginPath();
          ctx.moveTo(spikeX - 3, renderY);
          ctx.lineTo(spikeX, renderY - 6);
          ctx.lineTo(spikeX + 3, renderY);
          ctx.closePath();
          ctx.fill();
        }
        break;
        
      case 'BLACK_HOLE':
        // 🕳️ DARK ENERGY VOID PLATFORMS
        ctx.shadowBlur = 0;
        
        // Void distortion effect
        const voidPulse = Math.sin(time * 0.04) * 0.3;
        
        // Dark energy base
        const voidGrad = ctx.createRadialGradient(
          renderX + width/2, renderY + height/2, 0,
          renderX + width/2, renderY + height/2, width * 0.8
        );
        voidGrad.addColorStop(0, '#1a0033'); // Dark center
        voidGrad.addColorStop(0.6, '#4B0082');
        voidGrad.addColorStop(1, '#8A2BE2');
        
        ctx.fillStyle = voidGrad;
        ctx.beginPath();
        ctx.ellipse(renderX + width/2, renderY + height/2, width/2, height/2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Event horizon ring
        ctx.strokeStyle = `rgba(138, 43, 226, ${0.8 + voidPulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(renderX + width/2, renderY + height/2, width/2 - 2, height/2 - 2, 0, 0, Math.PI * 2);
        ctx.stroke();
        
        // Gravity distortion lines
        ctx.strokeStyle = 'rgba(75, 0, 130, 0.6)';
        ctx.lineWidth = 1;
        const centerX = renderX + width/2;
        const centerY = renderY + height/2;
        
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + time * 0.01;
          const radius = 15 + Math.sin(time * 0.02 + i) * 5;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, angle, angle + Math.PI/3);
          ctx.stroke();
        }
        
        // Dark matter particles
        ctx.fillStyle = 'rgba(138, 43, 226, 0.8)';
        for (let i = 0; i < 4; i++) {
          const particleAngle = (time * 0.02 + i) % (Math.PI * 2);
          const particleRadius = 12 + i * 3;
          const particleX = centerX + Math.cos(particleAngle) * particleRadius;
          const particleY = centerY + Math.sin(particleAngle) * particleRadius;
          ctx.beginPath();
          ctx.arc(particleX, particleY, 1, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
        
      case 'RAINBOW':
        // 🌈 MAGICAL RAINBOW BRIDGE PLATFORMS
        ctx.shadowBlur = 0;
        
        // Rainbow gradient that shifts over time
        const rainbowGrad = ctx.createLinearGradient(renderX, renderY, renderX + width, renderY);
        const hueShift = (time * 0.02) % 360;
        
        for (let i = 0; i < 7; i++) {
          const stopPos = i / 6;
          const hue = (hueShift + i * 51) % 360; // 360/7 ≈ 51
          rainbowGrad.addColorStop(stopPos, `hsl(${hue}, 90%, 70%)`);
        }
        
        ctx.fillStyle = rainbowGrad;
        ctx.fillRect(renderX, renderY, width, height);
        
        // Magical shimmer overlay
        const shimmerGrad = ctx.createLinearGradient(renderX, renderY, renderX + width, renderY);
        const shimmerPos = (time * 0.05) % 1;
        shimmerGrad.addColorStop(Math.max(0, shimmerPos - 0.3), 'rgba(255, 255, 255, 0)');
        shimmerGrad.addColorStop(shimmerPos, 'rgba(255, 255, 255, 0.8)');
        shimmerGrad.addColorStop(Math.min(1, shimmerPos + 0.3), 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = shimmerGrad;
        ctx.fillRect(renderX, renderY, width, height);
        
        // Floating magical sparkles
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        for (let i = 0; i < 6; i++) {
          const sparklePhase = (time * 0.03 + i * 0.5) % (Math.PI * 2);
          const sparkleSize = 1 + Math.sin(sparklePhase) * 1;
          const sparkleX = renderX + width * ((i * 0.15 + time * 0.01) % 1);
          const sparkleY = renderY + height * 0.3 + Math.sin(sparklePhase + i) * height * 0.2;
          
          if (sparkleSize > 0.5) {
            // Draw 4-pointed star
            ctx.save();
            ctx.translate(sparkleX, sparkleY);
            ctx.rotate(sparklePhase);
          ctx.beginPath();
            ctx.moveTo(0, -sparkleSize);
            ctx.lineTo(sparkleSize * 0.3, 0);
            ctx.lineTo(sparkleSize, 0);
            ctx.lineTo(sparkleSize * 0.3, 0);
            ctx.lineTo(0, sparkleSize);
            ctx.lineTo(-sparkleSize * 0.3, 0);
            ctx.lineTo(-sparkleSize, 0);
            ctx.lineTo(-sparkleSize * 0.3, 0);
            ctx.closePath();
          ctx.fill();
            ctx.restore();
          }
        }
        
        // Magic glow border with pulsing intensity
        const magicGlowPulse = 0.4 + Math.sin(time * 0.02) * 0.2;
        ctx.strokeStyle = `rgba(255, 255, 255, ${magicGlowPulse})`;
        ctx.lineWidth = 1 + Math.sin(time * 0.03) * 0.5;
        ctx.strokeRect(renderX, renderY, width, height);
        
        // Musical notes occasionally float up
        if (Math.sin(time * 0.004 + platform.x * 0.01) > 0.7) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          const noteX = renderX + width * 0.8;
          const noteY = renderY - 15 + Math.sin(time * 0.02) * 5;
          ctx.font = '12px Arial';
          ctx.fillText('♪', noteX, noteY);
        }
        break;
        
      default:
        // Fallback to LAND style
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#8FBC8F';
        ctx.fillRect(renderX, renderY, width, height);
        break;
    }

    // Special platform overlay effects
    if (platform.specialType === 'bouncy') {
      // Golden bouncy effect overlay
      const bounceGlow = ctx.createRadialGradient(
        renderX + width/2, renderY + height/2, 0,
        renderX + width/2, renderY + height/2, width * 0.6
      );
      bounceGlow.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
      bounceGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = bounceGlow;
      ctx.fillRect(renderX - 5, renderY - 5, width + 10, height + 10);
    }
    
    ctx.restore();
  };
  
  // Clean, modern moon for SPACE zone
  const renderMoon = (ctx: CanvasRenderingContext2D, cameraY: number) => {
    const MOON_Y = -8500; // Halfway through SPACE zone (-7500 to -10000)
    const moonScreenY = MOON_Y - cameraY;
    
    if (moonScreenY > -200 && moonScreenY < BASE_HEIGHT + 200) {
      const moonX = BASE_WIDTH * 0.75;
      const moonRadius = 60;
      
      // Simple clean moon with flat design
      ctx.fillStyle = '#F5F5F5';
      ctx.beginPath();
      ctx.arc(moonX, moonScreenY, moonRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Clean border
      ctx.strokeStyle = '#E0E0E0';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Simple geometric craters
      const craters = [
        { x: -12, y: -8, size: 4 },
        { x: 8, y: 12, size: 3 },
        { x: -3, y: 15, size: 2 },
        { x: 15, y: -15, size: 3 }
      ];
      
      craters.forEach(crater => {
        ctx.fillStyle = '#EEEEEE';
        ctx.beginPath();
        ctx.arc(moonX + crater.x, moonScreenY + crater.y, crater.size, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  };
  
  // Enhanced star rendering for different space zones
  const renderStars = (ctx: CanvasRenderingContext2D, cameraY: number, time: number, zone: string) => {
    ctx.fillStyle = 'white';
    
    let starConfig = {
      layers: [
        { count: 30, parallax: 0.3, size: 0.8, alpha: 0.6 },
        { count: 20, parallax: 0.6, size: 1.2, alpha: 0.8 },
        { count: 15, parallax: 1.0, size: 1.5, alpha: 1.0 }
      ]
    };
    
    // Different star configurations for different zones
    if (zone === 'DEEP_SPACE') {
      // Dense star field with medium density
      starConfig = {
        layers: [
          { count: 100, parallax: 0.2, size: 0.5, alpha: 0.5 },
          { count: 70, parallax: 0.4, size: 0.8, alpha: 0.7 },
          { count: 50, parallax: 0.7, size: 1.2, alpha: 0.9 },
          { count: 30, parallax: 1.0, size: 1.5, alpha: 1.0 }
        ]
      };
    } else if (zone === 'SPACE') {
      // Sparse stars starting to appear
      starConfig = {
        layers: [
          { count: 25, parallax: 0.3, size: 0.6, alpha: 0.4 },
          { count: 15, parallax: 0.6, size: 1.0, alpha: 0.6 },
          { count: 10, parallax: 1.0, size: 1.3, alpha: 0.8 }
        ]
      };
    } else if (zone === 'BLACK_HOLE') {
      // Fewer stars, some warped/distorted
      starConfig = {
        layers: [
          { count: 15, parallax: 0.4, size: 0.8, alpha: 0.3 },
          { count: 8, parallax: 0.8, size: 1.1, alpha: 0.5 }
        ]
      };
    }
    
    starConfig.layers.forEach((layer, layerIndex) => {
      for (let i = 0; i < layer.count; i++) {
        const x = ((i + layerIndex * 100) * 31) % BASE_WIDTH;
        const parallaxY = cameraY * layer.parallax;
        const y = (((i + layerIndex * 100) * 47) % 2000) - (Math.floor(parallaxY / 200) * 200);
        
        if (y > -10 && y < BASE_HEIGHT + 10) {
          const twinkle = Math.sin(time * 0.01 + i + layerIndex) * 0.5 + 0.5;
          ctx.globalAlpha = (twinkle * 0.8 + 0.2) * layer.alpha;
          ctx.beginPath();
          ctx.arc(x, y - parallaxY + cameraY, layer.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
    
    ctx.globalAlpha = 1;
  };
  
  // Render aurora borealis effect
  const renderAurora = (ctx: CanvasRenderingContext2D, cameraY: number, time: number) => {
    const auroraLayers = [
      { color: [0, 255, 150], alpha: 0.3, wave: 0.02, speed: 0.01 },
      { color: [100, 150, 255], alpha: 0.25, wave: 0.03, speed: 0.015 },
      { color: [255, 100, 200], alpha: 0.2, wave: 0.025, speed: 0.008 }
    ];
    
    auroraLayers.forEach((layer, layerIndex) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
      gradient.addColorStop(0, `rgba(${layer.color.join(',')}, 0)`);
      gradient.addColorStop(0.3, `rgba(${layer.color.join(',')}, ${layer.alpha})`);
      gradient.addColorStop(0.7, `rgba(${layer.color.join(',')}, ${layer.alpha * 0.5})`);
      gradient.addColorStop(1, `rgba(${layer.color.join(',')}, 0)`);
      
      ctx.fillStyle = gradient;
      
      ctx.beginPath();
      ctx.moveTo(0, BASE_HEIGHT);
      
      for (let x = 0; x <= BASE_WIDTH; x += 10) {
        const wave1 = Math.sin((x + time * layer.speed * 1000) * layer.wave) * 30;
        const wave2 = Math.sin((x + time * layer.speed * 1500) * layer.wave * 1.3) * 20;
        const y = BASE_HEIGHT * 0.3 + wave1 + wave2;
        ctx.lineTo(x, y);
      }
      
      ctx.lineTo(BASE_WIDTH, BASE_HEIGHT);
      ctx.lineTo(0, BASE_HEIGHT);
      ctx.closePath();
      ctx.fill();
    });
  };
  
  // Helper: draw a soft, multi-lobed cloud with lighting and soft edges
  const drawSoftCloud = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    baseSize: number,
    alpha: number,
    timeMs: number
  ) => {
    const t = timeMs * 0.001;
    const lobes = 4 + ((Math.abs(Math.floor(x + y)) % 3)); // 4-6 lobes
    const wind = Math.sin(t * 0.2 + (x + y) * 0.0005) * 6; // gentle wobble

    // Subtle shadow underneath
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha * 0.35);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(x + 6, y + baseSize * 0.28, baseSize * 1.0, baseSize * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Build cloud body with radial gradients per lobe
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < lobes; i++) {
      const angle = (Math.PI * 2 * i) / lobes;
      const lx = x + Math.cos(angle) * baseSize * (0.25 + 0.25 * Math.sin(i * 1.7 + t));
      const ly = y + Math.sin(angle) * baseSize * (0.18 + 0.22 * Math.cos(i * 1.3 + t)) + wind * 0.1;
      const r = baseSize * (0.42 + 0.18 * Math.sin(i * 2.1 + t * 0.8));

      const grad = ctx.createRadialGradient(lx - r * 0.25, ly - r * 0.35, r * 0.1, lx, ly, r);
      grad.addColorStop(0, `rgba(255,255,255, ${alpha * 0.95})`);
      grad.addColorStop(0.6, `rgba(255,255,255, ${alpha * 0.7})`);
      grad.addColorStop(1, `rgba(255,255,255, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(lx, ly, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Soft rim light on top-left
    ctx.save();
    ctx.globalAlpha = alpha * 0.6;
    const rim = ctx.createRadialGradient(x - baseSize * 0.4, y - baseSize * 0.5, baseSize * 0.2, x, y, baseSize * 1.2);
    rim.addColorStop(0, 'rgba(255,255,255,0.5)');
    rim.addColorStop(0.4, 'rgba(255,255,255,0.25)');
    rim.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.ellipse(x, y, baseSize * 1.4, baseSize * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Render clouds for sky zone with proper atmospheric layering
  const renderClouds = (ctx: CanvasRenderingContext2D, cameraY: number, time: number) => {
    // Define cloud layer altitude ranges
    const CLOUD_LAYER_TOP = -1000;    // Clouds start appearing
    const CLOUD_LAYER_THICK = -1500;  // Dense cloud layer
    const CLOUD_LAYER_BOTTOM = -2500; // Clouds end
    
    // Calculate player's position relative to cloud layer
    const playerY = cameraY + (BASE_HEIGHT / 2);
    
    // Don't render clouds if we're way above or below them
    if (playerY < CLOUD_LAYER_BOTTOM - 500 || playerY > CLOUD_LAYER_TOP + 500) {
      return;
    }
    
    // Create multiple cloud sub-layers for depth
    const cloudSubLayers = [
      { 
        yOffset: -100, 
        alpha: 0.3, 
        scale: 1.8, 
        density: 0.6,
        parallax: 0.1 // Very slight parallax for far clouds
      },
      { 
        yOffset: -50, 
        alpha: 0.5, 
        scale: 1.4, 
        density: 0.8,
        parallax: 0.05
      },
      { 
        yOffset: 0, 
        alpha: 0.7, 
        scale: 1.2, 
        density: 1.0,
        parallax: 0.02
      },
      { 
        yOffset: 50, 
        alpha: 0.8, 
        scale: 1.0, 
        density: 1.0,
        parallax: 0.01
      }
    ];
    
    cloudSubLayers.forEach((layer, layerIndex) => {
      // Calculate alpha based on distance from cloud layer
      let layerAlpha = layer.alpha;
      
      // Fade clouds in/out based on vertical position
      if (playerY > CLOUD_LAYER_TOP) {
        // Above clouds - fade out
        const fadeDistance = 300;
        const fade = Math.max(0, 1 - (playerY - CLOUD_LAYER_TOP) / fadeDistance);
        layerAlpha *= fade;
      } else if (playerY < CLOUD_LAYER_BOTTOM) {
        // Below clouds - fade in
        const fadeDistance = 300;
        const fade = Math.max(0, 1 - (CLOUD_LAYER_BOTTOM - playerY) / fadeDistance);
        layerAlpha *= fade;
      }
      
      if (layerAlpha <= 0.01) return; // Skip invisible layers
      
      // Generate clouds at fixed positions in the world
      const cloudsInLayer = Math.floor(40 * layer.density);
      
      for (let i = 0; i < cloudsInLayer; i++) {
        // Use layer-specific seeds for different cloud patterns
        const seedX = (i + layerIndex * 100) * 73 + 17;
        const seedY = (i + layerIndex * 100) * 127 + 43;
        const seedSize = (i + layerIndex * 100) * 89 + 31;
        
        // Fixed world positions - clouds don't move relative to world
        const worldX = ((seedX * 31) % (BASE_WIDTH * 4)) - BASE_WIDTH * 2;
        const worldY = CLOUD_LAYER_TOP + ((seedY * 47) % (CLOUD_LAYER_TOP - CLOUD_LAYER_BOTTOM)) + layer.yOffset;
        
        // Very subtle parallax effect (clouds barely move relative to camera)
        const parallaxOffset = cameraY * layer.parallax;
        const drift = Math.sin((time * 0.0003) + (worldY * 0.001)) * (10 + layerIndex * 6); // subtle horizontal drift
        const screenX = worldX + drift;
        const screenY = worldY - cameraY + parallaxOffset;
        
        // Only render visible clouds
        if (screenY > -150 && screenY < BASE_HEIGHT + 150 && 
            screenX > -200 && screenX < BASE_WIDTH + 200) {
          
          const sizeMultiplier = (0.85 + ((seedSize % 40) / 90)) * layer.scale;
          const cloudSize = 30 * sizeMultiplier;

          const cloudAlpha = layerAlpha * (0.9 - layerIndex * 0.12);
          drawSoftCloud(ctx, screenX, screenY, cloudSize, Math.max(0, cloudAlpha), time);
        }
      }
    });
  };
  
  // Black hole distortion effects
  const renderBlackHoleDistortion = (ctx: CanvasRenderingContext2D, cameraY: number, time: number) => {
    // Create swirling purple vortex effect
    const centerX = BASE_WIDTH * 0.5;
    const centerY = BASE_HEIGHT * 0.3;
    
    // Multiple swirling layers
    for (let layer = 0; layer < 3; layer++) {
      const radius = 100 + layer * 40;
      const spiralSpeed = (time * 0.02 + layer * 0.5) % (Math.PI * 2);
      
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, `rgba(147, 39, 143, ${0.3 - layer * 0.1})`);
      gradient.addColorStop(0.5, `rgba(74, 20, 140, ${0.2 - layer * 0.05})`);
      gradient.addColorStop(1, 'rgba(74, 20, 140, 0)');
      
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(spiralSpeed);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    // Add swirling particle streams
    for (let i = 0; i < 8; i++) {
      const angle = (time * 0.01 + i * Math.PI / 4) % (Math.PI * 2);
      const distance = 80 + Math.sin(time * 0.005 + i) * 20;
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      
      ctx.save();
      ctx.globalAlpha = 0.6 + Math.sin(time * 0.008 + i) * 0.3;
      ctx.fillStyle = `hsl(${280 + i * 10}, 70%, 60%)`;
      ctx.beginPath();
      ctx.arc(x, y, 2 + Math.sin(time * 0.01 + i) * 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };
  
    // Enhanced game state with advanced effects
  const playerRef = useRef<Player>({
    x: BASE_WIDTH / 2 - 15,
    y: BASE_HEIGHT - 150,
    width: 30,
    height: 30,
    velocityX: 0,
    velocityY: 0,
    grounded: false,
    activePowerUps: [],
    jumpMultiplier: 1,
    speedMultiplier: 1,
    magnetRange: 100,
    shieldActive: false,
    doubleJumpAvailable: false,
    lastGroundTime: Date.now(),
    // Advanced platformer mechanics
    coyoteTime: 0,
    jumpBufferTime: 0,
    lastJumpInput: 0,
    isJumpHeld: false,
    framesSinceGrounded: 0
  });
  
  const platformsRef = useRef<Platform[]>([]);
  const collectiblesRef = useRef<Collectible[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const [petImage, setPetImage] = useState<string>('/pet/Neutral.png');
  const petImageRef = useRef<HTMLImageElement | null>(null);

  // Load pet image
  useEffect(() => {
    const unsubscribe = petService.subscribeToPet((pet) => {
      if (pet) {
        setPetImage(getPetEmotionImage(pet));
      } else {
        setPetImage('/pet/Neutral.png');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = petImage;
    img.onload = () => {
      if (import.meta.env.DEV) console.log("Pet image loaded:", img.src);
      petImageRef.current = img;
    };
    img.onerror = (e) => {
      if (import.meta.env.DEV) console.error("Failed to load pet image:", img.src, e);
    };
    
    // Also try loading relative path if absolute fails
    if (petImage.startsWith('/')) {
      const relativeImg = new Image();
      relativeImg.src = `.${petImage}`;
      relativeImg.onload = () => {
        if (!petImageRef.current) {
           if (import.meta.env.DEV) console.log("Relative pet image loaded:", relativeImg.src);
           petImageRef.current = relativeImg;
        }
      };
    }
  }, [petImage]);
  const cameraYRef = useRef(0);
  const smoothCameraYRef = useRef(0); // For smooth camera movement
  const highestYRef = useRef(BASE_HEIGHT - 150);
  const scaleRef = useRef(1);
  const playerTrailRef = useRef<Array<{x: number, y: number, alpha: number}>>([]);
  const particlesRef = useRef<Array<{x: number, y: number, vx: number, vy: number, life: number, maxLife: number, color: string, size?: number, gravity?: number, rotation?: number, rotationSpeed?: number, opacity?: number, blendMode?: string}>>([]);
  const squishAnimationRef = useRef({ active: false, timer: 0, maxTimer: 60 });
  const sessionStatsRef = useRef({
    jumps: 0,
    coinsCollected: 0,
    platformsLanded: 0,
    maxHeight: 0,
    startTime: Date.now()
  });
  
  // Advanced particle system with impressive visual effects
  const addParticles = (x: number, y: number, color: string, count: number = 8, type: 'impact' | 'jump' | 'sparkle' | 'magic' | 'trail' | 'explosion' | 'energy' = 'impact') => {
    for (let i = 0; i < count; i++) {
      let particle: any = {
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 15,
        life: 60,
        maxLife: 60,
        color: color,
        size: Math.random() * 2 + 1,
        gravity: 0.2,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        opacity: 1,
        blendMode: 'normal'
      };

      switch (type) {
        case 'explosion':
          particle.vx = (Math.random() - 0.5) * 12;
          particle.vy = (Math.random() - 0.5) * 12;
          particle.life = 80;
          particle.maxLife = 80;
          particle.size = Math.random() * 4 + 2;
          particle.gravity = 0.1;
          particle.blendMode = 'screen';
          break;
        
        case 'energy':
          particle.vx = (Math.random() - 0.5) * 8;
          particle.vy = Math.random() * -8 - 4;
          particle.life = 100;
          particle.maxLife = 100;
          particle.size = Math.random() * 3 + 1.5;
          particle.gravity = -0.05; // Float upward
          particle.blendMode = 'screen';
          particle.rotationSpeed = (Math.random() - 0.5) * 0.3;
          break;
        
        case 'trail':
          particle.vx = (Math.random() - 0.5) * 4;
          particle.vy = (Math.random() - 0.5) * 4;
          particle.life = 40;
          particle.maxLife = 40;
          particle.size = Math.random() * 2 + 0.5;
          particle.gravity = 0;
          particle.blendMode = 'overlay';
          break;
        
        case 'magic':
          particle.vx = (Math.random() - 0.5) * 6;
          particle.vy = Math.random() * -4 - 2;
          particle.life = 120;
          particle.maxLife = 120;
          particle.size = Math.random() * 4 + 2;
          particle.gravity = 0.05;
          particle.blendMode = 'screen';
          particle.rotationSpeed = (Math.random() - 0.5) * 0.4;
          break;
        
        case 'sparkle':
          particle.vx = (Math.random() - 0.5) * 3;
          particle.vy = Math.random() * -3 - 1;
          particle.life = 90;
          particle.maxLife = 90;
          particle.size = Math.random() * 2.5 + 1;
          particle.gravity = 0.03;
          particle.blendMode = 'lighten';
          break;
        
        case 'jump':
          particle.vx = (Math.random() - 0.5) * 8;
          particle.vy = Math.random() * -8 - 4;
          particle.life = 70;
          particle.maxLife = 70;
          particle.size = Math.random() * 3 + 1.5;
          particle.gravity = 0.15;
          particle.blendMode = 'overlay';
          break;
        
        default: // impact
          particle.vx = (Math.random() - 0.5) * 6;
          particle.vy = Math.random() * -6 - 2;
          particle.life = 60;
          particle.maxLife = 60;
          particle.size = Math.random() * 2 + 1.5;
          particle.gravity = 0.2;
          particle.blendMode = 'normal';
      }
      
      particlesRef.current.push(particle);
    }
  };

  // Collectible management functions
  const generateCollectible = (x: number, y: number, zone: string): Collectible => {
    const random = Math.random();
    let type: 'coin' | 'crystal' | 'powerup';
    let powerUpType: PowerUpType | undefined;

    // Zone-based spawn rates and power-up types
    if (zone === 'LAND') {
      if (random < 0.7) type = 'coin';
      else if (random < 0.9) type = 'crystal';
      else {
        type = 'powerup';
        powerUpType = Math.random() < 0.5 ? 'jump_boost' : 'speed_boost';
      }
    } else if (zone === 'SKY') {
      if (random < 0.6) type = 'coin';
      else if (random < 0.85) type = 'crystal';
      else {
        type = 'powerup';
        const skyPowerUps: PowerUpType[] = ['double_jump', 'wind_glide', 'cloud_dash'];
        powerUpType = skyPowerUps[Math.floor(Math.random() * skyPowerUps.length)];
      }
    } else if (zone === 'ATMOSPHERE') {
      if (random < 0.5) type = 'coin';
      else if (random < 0.8) type = 'crystal';
      else {
        type = 'powerup';
        const atmoPowerUps: PowerUpType[] = ['shield', 'slow_motion', 'heat_protection'];
        powerUpType = atmoPowerUps[Math.floor(Math.random() * atmoPowerUps.length)];
      }
    } else if (zone === 'SPACE') {
      if (random < 0.4) type = 'coin';
      else if (random < 0.75) type = 'crystal';
      else {
        type = 'powerup';
        const spacePowerUps: PowerUpType[] = ['anti_gravity', 'rocket_boost', 'magnetic_boots'];
        powerUpType = spacePowerUps[Math.floor(Math.random() * spacePowerUps.length)];
      }
    } else if (zone === 'DEEP_SPACE') {
      if (random < 0.3) type = 'coin';
      else if (random < 0.7) type = 'crystal';
      else {
        type = 'powerup';
        const deepSpacePowerUps: PowerUpType[] = ['phase_walk', 'time_dilation', 'energy_burst'];
        powerUpType = deepSpacePowerUps[Math.floor(Math.random() * deepSpacePowerUps.length)];
      }
    } else if (zone === 'BLACK_HOLE') {
      if (random < 0.2) type = 'coin';
      else if (random < 0.6) type = 'crystal';
      else {
        type = 'powerup';
        const blackHolePowerUps: PowerUpType[] = ['gravity_control', 'dimension_shift', 'singularity_shield'];
        powerUpType = blackHolePowerUps[Math.floor(Math.random() * blackHolePowerUps.length)];
      }
    } else { // RAINBOW
      if (random < 0.1) type = 'coin';
      else if (random < 0.5) type = 'crystal';
      else {
        type = 'powerup';
        const rainbowPowerUps: PowerUpType[] = ['rainbow_bridge', 'wish_fulfillment', 'miracle_jump'];
        powerUpType = rainbowPowerUps[Math.floor(Math.random() * rainbowPowerUps.length)];
      }
    }

    return {
      x: x - 15,
      y: y - 30,
      type,
      collected: false,
      pulsePhase: 0,
      zoneType: zone,
      powerUpType
    };
  };

  const renderCollectible = (ctx: CanvasRenderingContext2D, collectible: Collectible, screenY: number, time: number) => {
    if (collectible.collected) return;

    const x = collectible.x;
    const y = screenY;
    
    // Calculate pulsing and floating effect
    collectible.pulsePhase += 0.15;
    const pulse = Math.sin(collectible.pulsePhase) * 0.3 + 1;
    const floatOffset = Math.sin(time * 0.003 + x * 0.01) * 3;
    
    const finalY = y + floatOffset;
    
    ctx.save();
    
    if (collectible.type === 'coin') {
      // Golden coin with contained glow
      const glowSize = 18;
      const gradient = ctx.createRadialGradient(x + 15, finalY + 15, 0, x + 15, finalY + 15, glowSize);
      gradient.addColorStop(0, '#FFD700');
      gradient.addColorStop(0.7, '#FFA500');
      gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x - 3, finalY - 3, 36, 36);
      
      // Coin body
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(x + 15, finalY + 15, 12 * pulse, 0, Math.PI * 2);
      ctx.fill();
      
      // Coin highlight
      ctx.fillStyle = '#FFFF99';
      ctx.beginPath();
      ctx.arc(x + 10, finalY + 10, 4 * pulse, 0, Math.PI * 2);
      ctx.fill();
      
    } else if (collectible.type === 'crystal') {
      // Blue crystal with contained sparkle
      const glowSize = 20;
      const gradient = ctx.createRadialGradient(x + 15, finalY + 15, 0, x + 15, finalY + 15, glowSize);
      gradient.addColorStop(0, '#00BFFF');
      gradient.addColorStop(0.6, '#0080FF');
      gradient.addColorStop(1, 'rgba(0, 191, 255, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x - 5, finalY - 5, 40, 40);
      
      // Crystal body (diamond shape)
      ctx.fillStyle = '#00BFFF';
      ctx.beginPath();
      ctx.moveTo(x + 15, finalY + 5);
      ctx.lineTo(x + 25, finalY + 15);
      ctx.lineTo(x + 15, finalY + 25);
      ctx.lineTo(x + 5, finalY + 15);
      ctx.closePath();
      ctx.fill();
      
      // Crystal highlight  
      ctx.fillStyle = '#87CEEB';
      ctx.beginPath();
      ctx.moveTo(x + 15, finalY + 8);
      ctx.lineTo(x + 22, finalY + 15);
      ctx.lineTo(x + 15, finalY + 12);
      ctx.closePath();
      ctx.fill();
      
    } else if (collectible.type === 'powerup' && collectible.powerUpType) {
      // Power-up with unique visual design based on type
      const powerUpType = collectible.powerUpType;
      
      // Zone-based colors
      let primaryColor = '#9370DB';
      let secondaryColor = '#6A5ACD';
      if (collectible.zoneType === 'LAND') { primaryColor = '#90EE90'; secondaryColor = '#228B22'; }
      else if (collectible.zoneType === 'SKY') { primaryColor = '#87CEEB'; secondaryColor = '#4682B4'; }
      else if (collectible.zoneType === 'ATMOSPHERE') { primaryColor = '#FFA500'; secondaryColor = '#FF4500'; }
      else if (collectible.zoneType === 'SPACE') { primaryColor = '#9370DB'; secondaryColor = '#4B0082'; }
      else if (collectible.zoneType === 'DEEP_SPACE') { primaryColor = '#00CED1'; secondaryColor = '#008B8B'; }
      else if (collectible.zoneType === 'BLACK_HOLE') { primaryColor = '#8B0000'; secondaryColor = '#DC143C'; }
      else if (collectible.zoneType === 'RAINBOW') { 
        const hue = (time * 0.1) % 360;
        primaryColor = `hsl(${hue}, 100%, 50%)`;
        secondaryColor = `hsl(${(hue + 60) % 360}, 80%, 40%)`;
      }
      
      // Create contained glow effect (smaller bounds) to prevent cutoff
      const glowSize = 16;
      const gradient = ctx.createRadialGradient(x + 15, finalY + 15, 0, x + 15, finalY + 15, glowSize);
      gradient.addColorStop(0, primaryColor + '60');
      gradient.addColorStop(0.7, primaryColor + '30');
      gradient.addColorStop(1, primaryColor + '00');
      
      // Draw contained glow
      ctx.fillStyle = gradient;
      ctx.fillRect(x - 1, finalY - 1, 32, 32);
      
      // Draw power-up based on type with custom shapes
      ctx.save();
      
      if (powerUpType.includes('jump') || powerUpType.includes('rocket')) {
        // Arrow/rocket shape
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.moveTo(x + 15, finalY + 5);
        ctx.lineTo(x + 20, finalY + 15);
        ctx.lineTo(x + 17, finalY + 15);
        ctx.lineTo(x + 17, finalY + 25);
        ctx.lineTo(x + 13, finalY + 25);
        ctx.lineTo(x + 13, finalY + 15);
        ctx.lineTo(x + 10, finalY + 15);
        ctx.closePath();
        ctx.fill();
        
        // Inner highlight
        ctx.fillStyle = secondaryColor;
        ctx.beginPath();
        ctx.moveTo(x + 15, finalY + 8);
        ctx.lineTo(x + 17, finalY + 15);
        ctx.lineTo(x + 15, finalY + 12);
        ctx.lineTo(x + 13, finalY + 15);
        ctx.closePath();
        ctx.fill();
        
      } else if (powerUpType.includes('speed') || powerUpType.includes('dash') || powerUpType.includes('wind')) {
        // Speed lines
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(x + 5, finalY + 10 + i * 5);
          ctx.lineTo(x + 25, finalY + 8 + i * 5);
          ctx.stroke();
        }
        
        // Speed symbol
        ctx.fillStyle = secondaryColor;
        ctx.beginPath();
        ctx.moveTo(x + 20, finalY + 8);
        ctx.lineTo(x + 25, finalY + 15);
        ctx.lineTo(x + 20, finalY + 22);
        ctx.lineTo(x + 22, finalY + 15);
        ctx.closePath();
        ctx.fill();
        
      } else if (powerUpType.includes('magnet') || powerUpType.includes('magnetic')) {
        // Horseshoe magnet
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x + 15, finalY + 18, 10, Math.PI, 0, false);
        ctx.stroke();
        
        // Magnet poles
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(x + 8, finalY + 15, 3, 8);
        ctx.fillStyle = '#0000FF';
        ctx.fillRect(x + 19, finalY + 15, 3, 8);
        
      } else if (powerUpType.includes('shield') || powerUpType.includes('protection')) {
        // Shield shape
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.moveTo(x + 15, finalY + 5);
        ctx.lineTo(x + 8, finalY + 12);
        ctx.lineTo(x + 8, finalY + 20);
        ctx.lineTo(x + 15, finalY + 25);
        ctx.lineTo(x + 22, finalY + 20);
        ctx.lineTo(x + 22, finalY + 12);
        ctx.closePath();
        ctx.fill();
        
        // Shield detail
        ctx.strokeStyle = secondaryColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        
      } else if (powerUpType.includes('gravity') || powerUpType.includes('anti')) {
        // Swirl/vortex
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
          const radius = 6 + i * 3;
          const offset = time * 0.01 + i * Math.PI / 3;
          ctx.beginPath();
          ctx.arc(x + 15, finalY + 15, radius, offset, offset + Math.PI * 1.5);
          ctx.stroke();
        }
        
      } else if (powerUpType.includes('time') || powerUpType.includes('slow')) {
        // Clock/hourglass
        ctx.fillStyle = primaryColor;
        ctx.fillRect(x + 10, finalY + 8, 10, 2);
        ctx.fillRect(x + 10, finalY + 20, 10, 2);
        ctx.beginPath();
        ctx.moveTo(x + 10, finalY + 10);
        ctx.lineTo(x + 15, finalY + 15);
        ctx.lineTo(x + 10, finalY + 20);
        ctx.lineTo(x + 20, finalY + 20);
        ctx.lineTo(x + 15, finalY + 15);
        ctx.lineTo(x + 20, finalY + 10);
        ctx.closePath();
        ctx.fill();
        
      } else if (powerUpType.includes('rainbow') || powerUpType.includes('wish') || powerUpType.includes('miracle')) {
        // Star shape
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
          const outerRadius = 10;
          const innerRadius = 4;
          
          const outerX = x + 15 + Math.cos(angle) * outerRadius;
          const outerY = finalY + 15 + Math.sin(angle) * outerRadius;
          const innerAngle = angle + Math.PI / 5;
          const innerX = x + 15 + Math.cos(innerAngle) * innerRadius;
          const innerY = finalY + 15 + Math.sin(innerAngle) * innerRadius;
          
          if (i === 0) ctx.moveTo(outerX, outerY);
          else ctx.lineTo(outerX, outerY);
          ctx.lineTo(innerX, innerY);
        }
        ctx.closePath();
        ctx.fill();
        
      } else if (powerUpType.includes('phase') || powerUpType.includes('dimension')) {
        // Phase/portal effect
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          ctx.globalAlpha = 0.7 - i * 0.2;
          ctx.beginPath();
          ctx.arc(x + 15, finalY + 15, 5 + i * 3, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        
      } else {
        // Default energy orb
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.arc(x + 15, finalY + 15, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = secondaryColor;
        ctx.beginPath();
        ctx.arc(x + 12, finalY + 12, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
      
      // Subtle rotation effect for all power-ups (smaller radius to stay contained)
      const rotationRadius = 18;
      for (let i = 0; i < 4; i++) {
        const angle = (time * 0.008 + i * Math.PI / 2) % (Math.PI * 2);
        const sparkleX = x + 15 + Math.cos(angle) * rotationRadius;
        const sparkleY = finalY + 15 + Math.sin(angle) * rotationRadius;
        
        ctx.fillStyle = primaryColor + '40';
        ctx.beginPath();
        ctx.arc(sparkleX, sparkleY, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.restore();
  };

  const checkCollectibleCollision = (player: Player, collectible: Collectible): boolean => {
    if (collectible.collected) return false;
    
    const dx = player.x + player.width/2 - collectible.x;
    const dy = player.y + player.height/2 - collectible.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance < 20; // Collection radius
  };

  const collectItem = (collectible: Collectible) => {
    if (collectible.collected) return;
    
    collectible.collected = true;
    
    if (collectible.type === 'coin') {
      setCoins(prev => prev + 1);
      setCurrentStreak(prev => prev + 1);
      setScore(prev => prev + 10);
      
      // Update session stats
      sessionStatsRef.current.coinsCollected += 1;
      
      // Coin collect effect
      addParticles(collectible.x + 15, collectible.y + 15, '#FFD700', 6, 'sparkle');
      
    } else if (collectible.type === 'crystal') {
      setCoins(prev => prev + 5);
      setCurrentStreak(prev => prev + 3);
      setScore(prev => prev + 50);
      
      // Update session stats  
      sessionStatsRef.current.coinsCollected += 5;
      
      // Crystal collect effect
      addParticles(collectible.x + 15, collectible.y + 15, '#00BFFF', 8, 'sparkle');
      
    } else if (collectible.type === 'powerup' && collectible.powerUpType) {
      setCoins(prev => prev + 10);
      setScore(prev => prev + 100);
      
      // Apply the power-up to the player
      applyPowerUp(playerRef.current, collectible.powerUpType, collectible.zoneType);
      
      // Power-up collect effect
      addParticles(collectible.x + 15, collectible.y + 15, '#9370DB', 12, 'magic');
      
      // Show power-up notification
      // This could be enhanced with a UI notification system
    }
    
    // Check for streak achievements
    updateAchievements('coins', coins + 1);
  };


  
  // Advanced particle system with impressive visual effects
  const updateAndRenderParticles = (ctx: CanvasRenderingContext2D, cameraY: number) => {
    const particles = particlesRef.current;
    
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      
      // Update particle physics
      particle.x += particle.vx || 0;
      particle.y += particle.vy || 0;
      particle.vy = (particle.vy || 0) + (particle.gravity || 0.2);
      particle.life--;
      
      // Update rotation and opacity
      particle.rotation = (particle.rotation || 0) + (particle.rotationSpeed || 0);
      particle.opacity = particle.life / particle.maxLife;
      
      // Apply physics drag for some particle types
      if (particle.blendMode === 'trail' || particle.blendMode === 'overlay') {
        particle.vx = (particle.vx || 0) * 0.95;
        particle.vy = (particle.vy || 0) * 0.95;
      }
      
              // Advanced floating motion for energy particles
        if (particle.blendMode === 'screen' && (particle.gravity || 0) < 0) {
          particle.x += Math.sin(Date.now() * 0.003 + i * 0.5) * 0.8;
          particle.y += Math.cos(Date.now() * 0.002 + i * 0.7) * 0.5;
        }
      
      // Remove dead particles
      if (particle.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      
      // Advanced particle rendering with blend modes
      const screenY = particle.y - cameraY;
      if (screenY > -50 && screenY < BASE_HEIGHT + 50) {
        const alpha = particle.opacity || (particle.life / particle.maxLife);
        const baseSize = particle.size || 2;
        
        ctx.save();
        
        // Set blend mode for advanced visual effects
        if (particle.blendMode && particle.blendMode !== 'normal') {
          ctx.globalCompositeOperation = particle.blendMode as GlobalCompositeOperation;
        }
        
        // Apply rotation for spinning particles
        if (particle.rotation) {
          ctx.translate(particle.x, screenY);
          ctx.rotate(particle.rotation);
          ctx.translate(-particle.x, -screenY);
        }
        
        // Different rendering styles based on particle type
        if (particle.blendMode === 'screen' || particle.blendMode === 'lighten') {
          // Glowing energy particles with radial gradients
          const gradient = ctx.createRadialGradient(
            particle.x, screenY, 0,
            particle.x, screenY, baseSize * 4
          );
          
          const colorMatch = particle.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
          if (colorMatch) {
            const r = parseInt(colorMatch[1]);
            const g = parseInt(colorMatch[2]);
            const b = parseInt(colorMatch[3]);
            
            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
            gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${alpha * 0.8})`);
            gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${alpha * 0.3})`);
            gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
          } else {
            gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
            gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
          }
          
          ctx.fillStyle = gradient;
        ctx.beginPath();
          ctx.arc(particle.x, screenY, baseSize * 4, 0, Math.PI * 2);
        ctx.fill();
          
          // Ultra bright core
          ctx.globalAlpha = alpha * 0.9;
          ctx.fillStyle = particle.color;
          ctx.beginPath();
          ctx.arc(particle.x, screenY, baseSize, 0, Math.PI * 2);
          ctx.fill();
          
        } else if (particle.blendMode === 'overlay') {
          // Soft trail particles with layered effects
          const gradient = ctx.createRadialGradient(
            particle.x, screenY, 0,
            particle.x, screenY, baseSize * 2.5
          );
          
          const colorMatch = particle.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
          if (colorMatch) {
            const r = parseInt(colorMatch[1]);
            const g = parseInt(colorMatch[2]);
            const b = parseInt(colorMatch[3]);
            
            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.8})`);
            gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${alpha * 0.4})`);
            gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
          }
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(particle.x, screenY, baseSize * 2.5, 0, Math.PI * 2);
          ctx.fill();
          
        } else {
          // Standard particles with enhanced glow and sparkle effects
          const pulseEffect = 1 + Math.sin(Date.now() * 0.008 + i * 0.3) * 0.2;
          const size = baseSize * pulseEffect;
          
          // Outer glow
          const outerGradient = ctx.createRadialGradient(
            particle.x, screenY, 0,
            particle.x, screenY, size * 3
          );
          
          const colorMatch = particle.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
          if (colorMatch) {
            const r = parseInt(colorMatch[1]);
            const g = parseInt(colorMatch[2]);
            const b = parseInt(colorMatch[3]);
            
            outerGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.6})`);
            outerGradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${alpha * 0.3})`);
            outerGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
          } else {
            outerGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.6})`);
            outerGradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
          }
          
          ctx.fillStyle = outerGradient;
          ctx.beginPath();
          ctx.arc(particle.x, screenY, size * 3, 0, Math.PI * 2);
          ctx.fill();
          
          // Bright core
          ctx.globalAlpha = alpha;
          ctx.fillStyle = particle.color;
          ctx.beginPath();
          ctx.arc(particle.x, screenY, size, 0, Math.PI * 2);
          ctx.fill();
          
          // Sparkle cross effect for magical particles
          if (baseSize > 2.5 && Math.random() < 0.4) {
            ctx.strokeStyle = particle.color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = alpha * 0.8;
            ctx.beginPath();
            ctx.moveTo(particle.x - size * 2, screenY);
            ctx.lineTo(particle.x + size * 2, screenY);
            ctx.moveTo(particle.x, screenY - size * 2);
            ctx.lineTo(particle.x, screenY + size * 2);
            ctx.stroke();
          }
        }
        
        ctx.restore();
      }
    }
    
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };



  // Disabled trail effect to prevent ghosting
  const updatePlayerTrail = (player: Player) => {
    // Disabled to prevent ghosting/lag feeling
    playerTrailRef.current = [];
  };

  // Minimal player trail to prevent ghosting
  const renderPlayerTrail = (ctx: CanvasRenderingContext2D, cameraY: number, zoneColors: any) => {
    // Disabled to prevent ghosting/lag feeling
    return;
  };
  
  // Enhanced background rendering with better gradients
  const renderZoneBackground = (ctx: CanvasRenderingContext2D, currentZone: string, nextZone: string, progress: number, time: number) => {
    const width = BASE_WIDTH;
    const height = BASE_HEIGHT;
    
    switch (currentZone) {
      case 'GROUND':
        const groundGradient = ctx.createLinearGradient(0, 0, 0, height);
        groundGradient.addColorStop(0, '#87CEEB');
        groundGradient.addColorStop(0.6, '#98D8E8');
        groundGradient.addColorStop(1, '#B8E6B8');
        ctx.fillStyle = groundGradient;
        ctx.fillRect(0, 0, width, height);
        break;
        
      case 'SKY':
        const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
        skyGradient.addColorStop(0, '#4A90E2');
        skyGradient.addColorStop(0.5, '#74B9FF');
        skyGradient.addColorStop(1, '#81ECEC');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, width, height);
        break;
        
      case 'ATMOSPHERE':
        const atmosphereGradient = ctx.createLinearGradient(0, 0, 0, height);
        atmosphereGradient.addColorStop(0, '#1a1a2e');
        atmosphereGradient.addColorStop(0.5, '#16213e');
        atmosphereGradient.addColorStop(1, '#0f3460');
        ctx.fillStyle = atmosphereGradient;
        ctx.fillRect(0, 0, width, height);
        break;
        
      case 'DARK_SPACE':
        const spaceGradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height));
        spaceGradient.addColorStop(0, '#1a1a1a');
        spaceGradient.addColorStop(0.5, '#0c0c0c');
        spaceGradient.addColorStop(1, '#000000');
        ctx.fillStyle = spaceGradient;
        ctx.fillRect(0, 0, width, height);
        break;
        
      case 'MOON':
        const moonBgGradient = ctx.createLinearGradient(0, 0, 0, height);
        moonBgGradient.addColorStop(0, '#2c2c2c');
        moonBgGradient.addColorStop(0.5, '#1a1a1a');
        moonBgGradient.addColorStop(1, '#0d0d0d');
        ctx.fillStyle = moonBgGradient;
        ctx.fillRect(0, 0, width, height);
        break;
        
      case 'STAR_FIELD':
        const starFieldGradient = ctx.createRadialGradient(width/2, height/4, 0, width/2, height/2, height);
        starFieldGradient.addColorStop(0, '#000428');
        starFieldGradient.addColorStop(0.5, '#004e92');
        starFieldGradient.addColorStop(1, '#000000');
        ctx.fillStyle = starFieldGradient;
        ctx.fillRect(0, 0, width, height);
        break;
        
      case 'AURORA':
        const auroraGradient = ctx.createLinearGradient(0, 0, 0, height);
        const auroraHue1 = (time * 0.02) % 360;
        const auroraHue2 = (time * 0.02 + 120) % 360;
        auroraGradient.addColorStop(0, `hsl(${auroraHue1}, 40%, 10%)`);
        auroraGradient.addColorStop(0.5, `hsl(${auroraHue2}, 30%, 8%)`);
        auroraGradient.addColorStop(1, '#001122');
        ctx.fillStyle = auroraGradient;
        ctx.fillRect(0, 0, width, height);
        break;
        
      case 'RAINBOW':
        const rainbowBgGradient = ctx.createLinearGradient(0, 0, width, height);
        const rainbowTime = time * 0.003;
        for (let i = 0; i <= 1; i += 0.1) {
          const hue = ((rainbowTime + i) * 360) % 360;
          rainbowBgGradient.addColorStop(i, `hsl(${hue}, 70%, 60%)`);
        }
        ctx.fillStyle = rainbowBgGradient;
        ctx.fillRect(0, 0, width, height);
        break;
        
      default:
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, width, height);
    }
  };
  
  // Full-screen background rendering that covers entire canvas with smooth transitions
  const renderFullScreenBackground = (ctx: CanvasRenderingContext2D, currentZone: string, nextZone: string, progress: number, time: number, canvasWidth: number, canvasHeight: number) => {
    
    // Helper function to create zone backgrounds
    const createZoneBackground = (zone: string) => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasWidth;
      tempCanvas.height = canvasHeight;
      const tempCtx = tempCanvas.getContext('2d')!;
      
             switch (zone) {
          case 'LAND':
            // Light blue background
            const landGradient = tempCtx.createLinearGradient(0, 0, 0, canvasHeight);
            landGradient.addColorStop(0, '#87CEEB');
            landGradient.addColorStop(0.6, '#98D8E8');
            landGradient.addColorStop(1, '#B8E6B8');
            tempCtx.fillStyle = landGradient;
            tempCtx.fillRect(0, 0, canvasWidth, canvasHeight);
        break;
        
      case 'SKY':
            // Gradient blue background with clouds
            const skyGradient = tempCtx.createLinearGradient(0, 0, 0, canvasHeight);
        skyGradient.addColorStop(0, '#4A90E2');
        skyGradient.addColorStop(0.5, '#74B9FF');
        skyGradient.addColorStop(1, '#81ECEC');
            tempCtx.fillStyle = skyGradient;
            tempCtx.fillRect(0, 0, canvasWidth, canvasHeight);
        break;
        
      case 'ATMOSPHERE':
            // Orange to dark blue gradient
            const atmosphereGradient = tempCtx.createLinearGradient(0, 0, 0, canvasHeight);
            atmosphereGradient.addColorStop(0, '#FF7F00'); // Orange
            atmosphereGradient.addColorStop(0.5, '#FF4500'); // Red-orange
            atmosphereGradient.addColorStop(1, '#1a1a2e'); // Dark blue
            tempCtx.fillStyle = atmosphereGradient;
            tempCtx.fillRect(0, 0, canvasWidth, canvasHeight);
        break;
        
          case 'SPACE':
            // Black background with moon
            tempCtx.fillStyle = '#000000';
            tempCtx.fillRect(0, 0, canvasWidth, canvasHeight);
        break;
        
          case 'DEEP_SPACE':
            // Still black background but with twinkling stars
            tempCtx.fillStyle = '#000000';
            tempCtx.fillRect(0, 0, canvasWidth, canvasHeight);
        break;
        
          case 'BLACK_HOLE':
            // Dark purple/black warped background
            const blackHoleGradient = tempCtx.createRadialGradient(canvasWidth/2, canvasHeight/3, 0, canvasWidth/2, canvasHeight/3, Math.max(canvasWidth, canvasHeight));
            blackHoleGradient.addColorStop(0, '#2D1B69'); // Purple center
            blackHoleGradient.addColorStop(0.5, '#1A0D2E'); // Dark purple
            blackHoleGradient.addColorStop(1, '#000000'); // Black edges
            tempCtx.fillStyle = blackHoleGradient;
            tempCtx.fillRect(0, 0, canvasWidth, canvasHeight);
        break;
        
      case 'RAINBOW':
            const rainbowBgGradient = tempCtx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
        const rainbowTime = time * 0.003;
        for (let i = 0; i <= 1; i += 0.1) {
          const hue = ((rainbowTime + i) * 360) % 360;
          rainbowBgGradient.addColorStop(i, `hsl(${hue}, 70%, 60%)`);
        }
            tempCtx.fillStyle = rainbowBgGradient;
            tempCtx.fillRect(0, 0, canvasWidth, canvasHeight);
        break;
        
      default:
            tempCtx.fillStyle = '#87CEEB';
            tempCtx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
        return tempCanvas;
      };
      
      // If no transition, just render current zone
      if (currentZone === nextZone || progress === 0) {
        const currentBg = createZoneBackground(currentZone);
        ctx.drawImage(currentBg, 0, 0);
        return;
      }
      
      // Create both backgrounds
      const currentBg = createZoneBackground(currentZone);
      const nextBg = createZoneBackground(nextZone);
      
      // Draw current background
      ctx.drawImage(currentBg, 0, 0);
      
      // Draw next background with fade-in opacity
      ctx.save();
      ctx.globalAlpha = progress;
      ctx.drawImage(nextBg, 0, 0);
      ctx.restore();
  };
  
  // Update canvas dimensions when window resizes
  const updateCanvasDimensions = useCallback(() => {
    const width = window.innerWidth;
    const headerHeight = 52; // Height of main app header
    const navHeight = 56; // Height of navbar
    const availableHeight = window.innerHeight - headerHeight - navHeight;
    
    // Calculate scale to maintain aspect ratio
    const scaleX = width / BASE_WIDTH;
    const scaleY = availableHeight / BASE_HEIGHT;
    const scale = Math.min(scaleX, scaleY);
    
    scaleRef.current = scale;
    setCanvasDimensions({ width, height: availableHeight });
  }, []);
  
  useEffect(() => {
    updateCanvasDimensions();
    window.addEventListener('resize', updateCanvasDimensions);
    return () => window.removeEventListener('resize', updateCanvasDimensions);
  }, [updateCanvasDimensions]);

  // Pause / resume
  const togglePause = useCallback(() => {
    pausedRef.current = !pausedRef.current;
    setIsPaused(pausedRef.current);
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        pausedRef.current = true;
        setIsPaused(true);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const generateEnemy = (x: number, y: number, zone: string): Enemy => {
    const types: Enemy['type'][] = ['basic', 'flying', 'spiky'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let width = 40;
    let height = 40;
    let speedX = 0;
    let speedY = 0;
    let range = 100;
    
    if (type === 'flying') {
      speedX = (Math.random() * 2 - 1) * 1.5;
      speedY = (Math.random() * 2 - 1) * 0.5;
    } else {
      speedX = (Math.random() * 2 - 1) * 1.0;
    }
    
    return {
      x,
      y,
      width,
      height,
      type,
      speedX,
      speedY,
      range,
      originalX: x,
      originalY: y,
      zoneType: zone,
      rotation: 0
    };
  };

  // Initialize platforms - now generates infinitely as player progresses
  const initializePlatforms = useCallback(() => {
    const platforms: Platform[] = [];
    
    // Starting platform
    platforms.push({
      x: BASE_WIDTH / 2 - PLATFORM_WIDTH / 2,
      y: BASE_HEIGHT - 100,
      width: PLATFORM_WIDTH,
      height: PLATFORM_HEIGHT,
      zoneType: 'LAND'
    });
    
    // Generate initial batch of platforms with variety
    for (let i = 1; i < 220; i++) {
      const platformY = BASE_HEIGHT - 100 - (i * 135); // Consistent spacing with ensurePlatforms
      const { currentZone } = getZoneInfo(platformY);
      
      // Zone-specific platform generation
      let chosenWidth: number;
      let shouldMove = false;
      
      // Platform width based on zone
      if (currentZone === 'LAND') {
        chosenWidth = PLATFORM_WIDTH * 1.1;
      } else {
        const widthVariation = [1.0, 1.2, 1.4, 1.6, 0.9, 1.3];
        chosenWidth = PLATFORM_WIDTH * widthVariation[Math.floor(Math.random() * widthVariation.length)];
      }
      
      const platform: Platform = {
        x: Math.random() * (BASE_WIDTH - chosenWidth),
        y: platformY,
        width: chosenWidth,
        height: PLATFORM_HEIGHT,
        zoneType: currentZone,
        originalX: undefined,
        originalY: platformY,
        wiggleTimer: 0,
        wiggleIntensity: 0,
        fadeAlpha: 1,
        fadeDirection: 1,
        rotationAngle: 0,
        rotationSpeed: 0
      };
      
      // Generate special platform types
      const specialPlatform = generateSpecialPlatform(platform, currentZone);
      
      // Zone-specific behaviors
      if (currentZone === 'SKY') {
        // Moving sideways left to right
        if (Math.random() < 0.4) {
          platform.isMoving = true;
          platform.moveSpeed = 0.5 + Math.random() * 1.5;
          platform.moveDirection = Math.random() < 0.5 ? 1 : -1;
          platform.moveRange = 100 + Math.random() * 150;
          platform.originalX = platform.x;
        }
      } else if (currentZone === 'ATMOSPHERE') {
        // Fade in and out
        platform.fadeAlpha = 0.3 + Math.random() * 0.7;
        platform.fadeDirection = Math.random() < 0.5 ? 1 : -1;
      } else if (currentZone === 'SPACE') {
        // Float in loose tight oval (0 gravity vibes)
        platform.isMoving = true;
        platform.moveSpeed = 0.3 + Math.random() * 0.7;
        platform.moveDirection = Math.random() < 0.5 ? 1 : -1;
        platform.moveRange = 60 + Math.random() * 80;
        platform.originalX = platform.x;
        // Can also move up and down
        if (Math.random() < 0.5) {
          platform.originalY = platformY;
        }
      } else if (currentZone === 'DEEP_SPACE') {
        // Move in diagonals
        if (Math.random() < 0.6) {
          platform.isMoving = true;
          platform.moveSpeed = 0.4 + Math.random() * 0.8;
          platform.moveDirection = Math.random() < 0.5 ? 1 : -1;
          platform.moveRange = 80 + Math.random() * 120;
          platform.originalX = platform.x;
          platform.originalY = platformY;
        }
      } else if (currentZone === 'BLACK_HOLE') {
        // Rotating platforms
        platform.rotationSpeed = (Math.random() - 0.5) * 0.04; // Random rotation direction and speed
      }
      
      platforms.push(platform);
      
      // Generate enemies (15% chance, starting from platform 10)
      if (i > 10 && Math.random() < 0.15) {
        if (import.meta.env.DEV) console.log("Enemy spawned at", platform.y - 60);
        enemiesRef.current.push(generateEnemy(
          platform.x + (Math.random() * (platform.width - 40)), 
          platform.y - 60, 
          currentZone
        ));
      }
      
      // Generate collectibles near some platforms (30% chance)
      if (Math.random() < 0.3) {
        collectiblesRef.current.push(generateCollectible(platform.x + platform.width/2, platform.y, currentZone));
      }
    }
    
    platformsRef.current = platforms;
  }, []);
  
  // Generate more platforms dynamically as player progresses
  const ensurePlatforms = useCallback((playerY: number) => {
    const platforms = platformsRef.current;
    const highestPlatform = Math.min(...platforms.map(p => p.y));
    
    // If player is getting close to the highest platform, generate more
    if (playerY - highestPlatform < 2200) {
      const numPlatforms = platforms.length;
      
      // Add 50 more platforms with variety
      for (let i = 0; i < 60; i++) {
        // Adjusted vertical spacing based on new jump height and physics
        // JUMP_FORCE -13.5 & GRAVITY 0.45 gives max height approx 200px
        // 105px was too dense, but also safer. Let's increase slightly to challenge but keep safe.
        // 135px allows for comfortable jumps without being pixel perfect max height
        const platformY = highestPlatform - (i + 1) * 135; 
        const { currentZone } = getZoneInfo(platformY);
        
        // Zone-specific platform generation
        let chosenWidth: number;
        
        // Platform width based on zone
        if (currentZone === 'LAND') {
          chosenWidth = PLATFORM_WIDTH * 1.1;
        } else {
          const widthVariation = [1.0, 1.2, 1.4, 1.6, 0.9, 1.3];
          chosenWidth = PLATFORM_WIDTH * widthVariation[Math.floor(Math.random() * widthVariation.length)];
        }
        
        const platform: Platform = {
          x: Math.random() * (BASE_WIDTH - chosenWidth),
          y: platformY,
          width: chosenWidth,
          height: PLATFORM_HEIGHT,
          zoneType: currentZone,
          originalX: undefined,
          originalY: platformY,
          wiggleTimer: 0,
          wiggleIntensity: 0,
          fadeAlpha: 1,
          fadeDirection: 1,
          rotationAngle: 0,
          rotationSpeed: 0
        };
        
        // Generate special platform types
        const specialPlatform = generateSpecialPlatform(platform, currentZone);
        
        // Zone-specific behaviors
        if (currentZone === 'SKY') {
          // Moving sideways left to right
          if (Math.random() < 0.4) {
            platform.isMoving = true;
            platform.moveSpeed = 0.5 + Math.random() * 1.5;
            platform.moveDirection = Math.random() < 0.5 ? 1 : -1;
            platform.moveRange = 100 + Math.random() * 150;
            platform.originalX = platform.x;
          }
        } else if (currentZone === 'ATMOSPHERE') {
          // Fade in and out
          platform.fadeAlpha = 0.3 + Math.random() * 0.7;
          platform.fadeDirection = Math.random() < 0.5 ? 1 : -1;
        } else if (currentZone === 'SPACE') {
          // Float in loose tight oval (0 gravity vibes)
          platform.isMoving = true;
          platform.moveSpeed = 0.3 + Math.random() * 0.7;
          platform.moveDirection = Math.random() < 0.5 ? 1 : -1;
          platform.moveRange = 60 + Math.random() * 80;
          platform.originalX = platform.x;
          // Can also move up and down
          if (Math.random() < 0.5) {
            platform.originalY = platformY;
          }
        } else if (currentZone === 'DEEP_SPACE') {
          // Move in diagonals
          if (Math.random() < 0.6) {
            platform.isMoving = true;
            platform.moveSpeed = 0.4 + Math.random() * 0.8;
            platform.moveDirection = Math.random() < 0.5 ? 1 : -1;
            platform.moveRange = 80 + Math.random() * 120;
            platform.originalX = platform.x;
            platform.originalY = platformY;
          }
        } else if (currentZone === 'BLACK_HOLE') {
          // Rotating platforms
          platform.rotationSpeed = (Math.random() - 0.5) * 0.04; // Random rotation direction and speed
        }
        
        platforms.push(platform);
        
        // Generate enemies (15% chance)
        if (Math.random() < 0.15) {
          enemiesRef.current.push(generateEnemy(
            platform.x + (Math.random() * (platform.width - 40)), 
            platform.y - 60, 
            currentZone
          ));
        }

        // Generate collectibles near some platforms (30% chance)
        if (Math.random() < 0.3) {
          collectiblesRef.current.push(generateCollectible(platform.x + platform.width/2, platform.y, currentZone));
        }
      }
    }
  }, []);
  
  const updateEnemies = (player: Player) => {
    const enemies = enemiesRef.current;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      
      // Movement
      enemy.x += enemy.speedX;
      enemy.y += enemy.speedY;
      
      if (enemy.type === 'flying' || enemy.type === 'basic') {
        if (Math.abs(enemy.x - enemy.originalX) > enemy.range) {
          enemy.speedX *= -1;
        }
        if (enemy.type === 'flying') {
           if (Math.abs(enemy.y - enemy.originalY) > 30) {
             enemy.speedY *= -1;
           }
        }
      }

      // Remove if too far below camera
      if (enemy.y > cameraYRef.current + BASE_HEIGHT + 200) {
        enemies.splice(i, 1);
        continue;
      }
      
      // Collision with player
      if (!enemy.dead && 
          player.x < enemy.x + enemy.width &&
          player.x + player.width > enemy.x &&
          player.y < enemy.y + enemy.height &&
          player.y + player.height > enemy.y) {
            
        // Check if jumping on top
        const isJumpingOnTop = player.velocityY > 0 && player.y + player.height < enemy.y + enemy.height * 0.5;
        
        if (isJumpingOnTop && enemy.type !== 'spiky') {
          // Kill enemy
          enemy.dead = true;
          player.velocityY = JUMP_FORCE; // Bounce
          enemies.splice(i, 1);
          setScore(s => s + 50); // Bonus score
          addParticles(enemy.x + enemy.width/2, enemy.y + enemy.height/2, '#FF0000', 10, 'explosion');
        } else if (!player.shieldActive && !player.activePowerUps.some(p => p.type === 'shield')) {
           // Game Over
           setGameOver(true);
        }
      }
    }
  };

  const renderEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy, cameraY: number) => {
    const screenY = enemy.y - cameraY;
    if (screenY < -50 || screenY > BASE_HEIGHT + 50) return;
    
    ctx.save();
    ctx.translate(enemy.x + enemy.width/2, screenY + enemy.height/2);
    
    if (enemy.type === 'flying') {
      // Draw wings or something
      ctx.fillStyle = '#FF5555';
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fill();
      // Wings
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(-20, -5, 15, 8, 0.2, 0, Math.PI * 2);
      ctx.ellipse(20, -5, 15, 8, -0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.type === 'spiky') {
      ctx.fillStyle = '#555555';
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(15, 15);
      ctx.lineTo(-15, 15);
      ctx.fill();
    } else {
      // Basic
      ctx.fillStyle = '#AA0000';
      ctx.fillRect(-20, -20, 40, 40);
      // Eyes
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-8, -5, 5, 0, Math.PI * 2);
      ctx.arc(8, -5, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-8, -5, 2, 0, Math.PI * 2);
      ctx.arc(8, -5, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  };

  // Game loop
  const gameLoop = useCallback(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Pause overlay
    if (pausedRef.current) {
      ctx.clearRect(0, 0, canvasDimensions.width, canvasDimensions.height);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, canvasDimensions.width, canvasDimensions.height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Paused (P/Esc)', canvasDimensions.width / 2, canvasDimensions.height / 2);
      gameLoopRef.current = requestAnimationFrame(gameLoop);
      return;
    }
    const player = playerRef.current;
    const platforms = platformsRef.current;
    const scale = scaleRef.current;
    const time = Date.now();
    
    // Ensure infinite platforms
    ensurePlatforms(player.y);
    
    // Determine current zone
    const { currentZone, nextZone, progress } = getZoneInfo(cameraYRef.current);
    const zoneColors = getZoneColors(currentZone, nextZone, progress, time);
    

    
    // COMPLETELY clear canvas to prevent ANY ghosting
    ctx.clearRect(0, 0, canvasDimensions.width, canvasDimensions.height);
    
    // Fill entire canvas with solid opaque color
    ctx.save();
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = currentZone === 'GROUND' ? '#87CEEB' : 
                    currentZone === 'SKY' ? '#4A90E2' :
                    currentZone === 'DARK_SPACE' ? '#0c0c0c' : '#1a1a2e';
    ctx.fillRect(0, 0, canvasDimensions.width, canvasDimensions.height);
    ctx.restore();
    
    // Render full-screen background that covers entire canvas FIRST
    renderFullScreenBackground(ctx, currentZone, nextZone, progress, time, canvasDimensions.width, canvasDimensions.height);
    
    // Add dynamic floating particles for atmosphere
    if (Math.random() < 0.3 && particlesRef.current.length < 150) {
      const zoneColors = ['#FFD700', '#87CEEB', '#FF6B6B', '#4ECDC4', '#45B7D1'];
      const randomColor = zoneColors[Math.floor(Math.random() * zoneColors.length)];
      const randomX = Math.random() * canvasDimensions.width;
      const randomY = canvasDimensions.height + 50;
      
      particlesRef.current.push({
        x: randomX,
        y: randomY,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 3 - 1,
        life: 200 + Math.random() * 100,
        maxLife: 200 + Math.random() * 100,
        color: randomColor,
        size: Math.random() * 1.5 + 0.5,
        gravity: -0.02,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        opacity: Math.random() * 0.6 + 0.2,
        blendMode: 'overlay'
      });
    }
    

    
    // Calculate game area offset for centering
    const gameWidth = BASE_WIDTH * scale;
    const gameHeight = BASE_HEIGHT * scale;
    const offsetX = (canvasDimensions.width - gameWidth) / 2;
    const offsetY = (canvasDimensions.height - gameHeight) / 2; // Use full canvas height for proper centering
    
    // Save context for scaled game area
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    
    // Simple zone-specific background effects
    // Render moon in SPACE zone
    if (currentZone === 'SPACE' || 
        (currentZone === 'ATMOSPHERE' && nextZone === 'SPACE' && progress > 0.3) ||
        (currentZone === 'DEEP_SPACE' && nextZone === 'SPACE' && progress < 0.7)) {
      renderMoon(ctx, cameraYRef.current);
    }
    
    // Render clouds in SKY zone
    if (currentZone === 'SKY' || (currentZone === 'LAND' && nextZone === 'SKY' && progress > 0.2)) {
      renderClouds(ctx, cameraYRef.current, time);
    }
    
    // Render twinkling stars in SPACE and DEEP_SPACE zones
    if (currentZone === 'SPACE' || currentZone === 'DEEP_SPACE' || currentZone === 'BLACK_HOLE') {
      renderStars(ctx, cameraYRef.current, time, currentZone);
    }
    
    // Render black hole distortion effects
    if (currentZone === 'BLACK_HOLE') {
      renderBlackHoleDistortion(ctx, cameraYRef.current, time);
    }


    
    // Update power-ups
    updatePowerUps(player, time);
    
    // Advanced platformer mechanics constants
    const COYOTE_TIME_MS = 200; // slightly less to reduce pogo feel
    const JUMP_BUFFER_MS = 150; // longer jump buffer
    const AIR_CONTROL = 0.82; // more air control
    const CORNER_CORRECTION = 6; // Pixels to check for corner correction
    
    // Update advanced mechanics timers
    if (player.grounded) {
      player.coyoteTime = time;
      player.framesSinceGrounded = 0;
      player.doubleJumpAvailable = true;
    } else {
      player.framesSinceGrounded++;
    }
    
    // Update jump buffer
    if (player.jumpBufferTime > 0) {
      player.jumpBufferTime = Math.max(0, player.jumpBufferTime - (time - player.lastJumpInput));
    }
    
    // Check for jump input
    const jumpPressed = keysRef.current.has(' ') || keysRef.current.has('ArrowUp') || keysRef.current.has('w');
    const jumpJustPressed = jumpPressed && !player.isJumpHeld;
    
    if (jumpJustPressed) {
      player.lastJumpInput = time;
      player.jumpBufferTime = JUMP_BUFFER_MS;
    }
    
    player.isJumpHeld = jumpPressed;
    
    // Simple jump logic with coyote time and jump buffering
    const canCoyoteJump = (time - player.coyoteTime) <= COYOTE_TIME_MS;
    const canBufferJump = player.jumpBufferTime > 0;
    const canJump = (player.grounded || canCoyoteJump) && canBufferJump;
    const canDoubleJump = !player.grounded && !canCoyoteJump && player.doubleJumpAvailable && jumpJustPressed && player.velocityY > -5;
    
    if (canJump && !player.grounded) {
      // Coyote time jump - slightly reduced impulse for weight
      player.velocityY = JUMP_FORCE * 0.95;
      player.jumpBufferTime = 0;
              // Zone-themed landing particles - more subtle
      const { currentZone } = getZoneInfo(cameraYRef.current);
      const zoneParticleColors = {
        'LAND': '#8B4513',
        'SKY': '#87CEEB', 
        'ATMOSPHERE': '#FF6347',
        'SPACE': '#4169E1',
        'DEEP_SPACE': '#9932CC',
        'BLACK_HOLE': '#8A2BE2',
        'RAINBOW': '#FFD700'
      };
      const particleColor = zoneParticleColors[currentZone as keyof typeof zoneParticleColors] || '#FFD700';
      addParticles(player.x + player.width/2, player.y + player.height, particleColor, 5, 'impact');
      sessionStatsRef.current.jumps += 1;
      } else if (canJump && player.grounded) {
        // Normal ground jump (heavier feel)
        player.velocityY = JUMP_FORCE;
        player.jumpBufferTime = 0;
        player.grounded = false;
        // Zone-themed landing particles - more subtle
        const { currentZone: currentZone2 } = getZoneInfo(cameraYRef.current);
        const zoneParticleColors2 = {
          'LAND': '#8B4513',
          'SKY': '#87CEEB', 
          'ATMOSPHERE': '#FF6347',
          'SPACE': '#4169E1',
          'DEEP_SPACE': '#9932CC',
          'BLACK_HOLE': '#8A2BE2',
          'RAINBOW': '#FFD700'
        };
        const particleColor2 = zoneParticleColors2[currentZone2 as keyof typeof zoneParticleColors2] || '#FFD700';
        addParticles(player.x + player.width/2, player.y + player.height, particleColor2, 5, 'impact');
      sessionStatsRef.current.jumps += 1;
    } else if (canDoubleJump) {
      // Double jump - even softer for weight
      player.velocityY = JUMP_FORCE * 0.9;
      player.doubleJumpAvailable = false;
              // Zone-themed double jump particles - more controlled
              const { currentZone: currentZone3 } = getZoneInfo(cameraYRef.current);
              const doubleJumpColors = {
                'LAND': '#98FB98',
                'SKY': '#87CEEB', 
                'ATMOSPHERE': '#FFA500',
                'SPACE': '#00CED1',
                'DEEP_SPACE': '#DA70D6',
                'BLACK_HOLE': '#9370DB',
                'RAINBOW': '#FF69B4'
              };
              const djColor = doubleJumpColors[currentZone3 as keyof typeof doubleJumpColors] || '#87CEEB';
              addParticles(player.x + player.width/2, player.y + player.height, djColor, 8, 'energy');
    }
    

    
    // Enhanced horizontal movement with air control
    const effectiveSpeed = (PLAYER_SPEED * 0.92) * player.speedMultiplier; // slightly slower for heavier feel
    const movementStrength = player.grounded ? 1.0 : AIR_CONTROL;
    
    // Keyboard input influence
    let inputAxis = 0; // -1 left, +1 right
    if (keysRef.current.has('ArrowLeft') || keysRef.current.has('a')) inputAxis -= 1;
    if (keysRef.current.has('ArrowRight') || keysRef.current.has('d')) inputAxis += 1;

    const axis = Math.max(-1, Math.min(1, inputAxis));

    if (axis !== 0) {
      const targetVelX = axis * effectiveSpeed * movementStrength;
      // Smooth acceleration
      player.velocityX += (targetVelX - player.velocityX) * (player.grounded ? 0.25 : 0.15); 
    } else {
      // Enhanced friction - more friction on ground to prevent sliding
      player.velocityX *= player.grounded ? 0.6 : 0.95;
    }
    
    // Apply gravity with power-up modifications
    let gravity = GRAVITY;
    if (player.activePowerUps.some(p => p.type === 'anti_gravity' || p.type === 'gravity_control')) {
      gravity *= 0.3;
    }
    

    
    // Apply gravity with a small terminal acceleration ramp for weight
    player.velocityY += gravity * (player.grounded ? 1.0 : 1.05);
    
    // Enhanced coin magnetism effect with smooth attraction
    if (player.magnetRange > 100) {
      collectiblesRef.current.forEach(collectible => {
        if (!collectible.collected && collectible.type !== 'powerup') {
          const dx = player.x + player.width/2 - (collectible.x + 15);
          const dy = player.y + player.height/2 - (collectible.y + 15);
          const distance = Math.sqrt(dx*dx + dy*dy);
          
          if (distance < player.magnetRange && distance > 5) {
            const force = Math.min(1, (player.magnetRange - distance) / player.magnetRange);
            const attraction = force * force * 0.8; // Quadratic falloff for smoother attraction
            collectible.x += dx * attraction * 0.1;
            collectible.y += dy * attraction * 0.1;
            
            // Add enhanced magnetism particles
            if (Math.random() < 0.15) {
              addParticles(collectible.x + 15, collectible.y + 15, '#FFD700', 3, 'energy');
            }
          }
        }
      });
    }
    
    // Add continuous visual effects when player is moving fast
    const speed = Math.abs(player.velocityX) + Math.abs(player.velocityY);
    if (speed > 8 && Math.random() < 0.2) {
      addParticles(player.x + player.width/2, player.y + player.height/2, '#FFFFFF', 2, 'trail');
    }
    
    // Terminal velocity limits for more realistic physics
    const MAX_FALL_SPEED = 18; // cap fall speed a bit lower to avoid rubbery rebounds
    const MAX_HORIZONTAL_SPEED = 12;
    
    // Apply velocity limits
    player.velocityY = Math.min(player.velocityY, MAX_FALL_SPEED);
    player.velocityX = Math.max(-MAX_HORIZONTAL_SPEED, Math.min(MAX_HORIZONTAL_SPEED, player.velocityX));
    
    // Update position with sub-pixel precision
    player.x += player.velocityX;
    player.y += player.velocityY;
    
    // Wrap around screen edges
    if (player.x < -player.width) {
      player.x = BASE_WIDTH;
    } else if (player.x > BASE_WIDTH) {
      player.x = -player.width;
    }
    
    // Update moving platforms with zone-specific behaviors
    for (const platform of platforms) {
      // Update special platform behaviors
      updateSpecialPlatform(platform, time, player);
      
      if (platform.isMoving && platform.moveSpeed && platform.moveDirection && platform.moveRange) {
        
        if (platform.zoneType === 'SKY') {
          // SKY: Simple left-right movement
          if (platform.originalX !== undefined) {
            platform.x += platform.moveSpeed * platform.moveDirection;
            
            if (Math.abs(platform.x - platform.originalX) >= platform.moveRange) {
              platform.moveDirection *= -1;
            }
          }
        } else if (platform.zoneType === 'SPACE') {
          // SPACE: Float in loose oval pattern (0 gravity vibes)
          if (platform.originalX !== undefined && platform.originalY !== undefined) {
            const ovalTime = time * 0.001;
            const ovalX = Math.sin(ovalTime * platform.moveSpeed) * (platform.moveRange * 0.8);
            const ovalY = Math.cos(ovalTime * platform.moveSpeed * 0.7) * (platform.moveRange * 0.4);
            platform.x = platform.originalX + ovalX;
            platform.y = platform.originalY + ovalY;
          }
        } else if (platform.zoneType === 'DEEP_SPACE') {
          // DEEP_SPACE: Diagonal movement
          if (platform.originalX !== undefined && platform.originalY !== undefined) {
            platform.x += platform.moveSpeed * platform.moveDirection;
            platform.y += (platform.moveSpeed * platform.moveDirection) * 0.6; // Diagonal ratio
            
            const distanceX = Math.abs(platform.x - platform.originalX);
            const distanceY = Math.abs(platform.y - platform.originalY);
            
            if (distanceX >= platform.moveRange || distanceY >= platform.moveRange * 0.6) {
              platform.moveDirection *= -1;
            }
          }
        } else {
          // Default horizontal movement for other zones
          if (platform.originalX !== undefined) {
            platform.x += platform.moveSpeed * platform.moveDirection;
            
            if (Math.abs(platform.x - platform.originalX) >= platform.moveRange) {
              platform.moveDirection *= -1;
            }
          }
        }
        
        // Keep platforms within screen bounds (for horizontal movement)
        if (platform.x < 0) {
          platform.x = 0;
          platform.moveDirection = 1;
        } else if (platform.x + platform.width > BASE_WIDTH) {
          platform.x = BASE_WIDTH - platform.width;
          platform.moveDirection = -1;
        }
      }
    }
    
    // Enhanced platform collision with corner correction
    const wasGrounded = player.grounded;
    player.grounded = false;
    
    // Apply movement temporarily to check for collisions
    const newX = player.x + player.velocityX;
    const newY = player.y + player.velocityY;
    
    for (const platform of platforms) {
      // Check for vertical collision (landing on platform)
      if (newX < platform.x + platform.width &&
          newX + player.width > platform.x &&
          newY + player.height > platform.y &&
          newY + player.height < platform.y + platform.height + 10 &&
          player.velocityY > 0) {
        
        player.y = platform.y - player.height;
        player.velocityY = (JUMP_FORCE * player.jumpMultiplier) * BOUNCE_MULTIPLIER;
        player.grounded = true;
        
        // Handle special platform effects
        if (platform.specialType) {
          handleSpecialPlatformEffect(platform, player);
        }
        
        // Move player with moving platform
        if (platform.isMoving && platform.moveSpeed && platform.moveDirection) {
          player.x += platform.moveSpeed * platform.moveDirection;
        }
        
        // Landing effect with zone-themed, subtle particles
        if (!wasGrounded) {
          // Trigger squish animation
          squishAnimationRef.current.active = true;
          squishAnimationRef.current.timer = squishAnimationRef.current.maxTimer;
          
          const landingForce = Math.abs(player.velocityY) / 5; // Scale based on landing speed
          
          // **ZONE-SPECIFIC PLATFORM REACTIONS & PARTICLES**
          switch (platform.zoneType) {
            case 'LAND':
              // Earthy landing - dirt particles, subtle rumble
              addParticles(player.x + player.width/2, player.y + player.height, '#8B4513', 3, 'impact');
              platform.bounceTimer = 8; // Minimal bounce for solid earth
              platform.bounceIntensity = Math.min(2, landingForce * 0.5);
              platform.tiltTimer = 15; // Slight settling
              platform.wiggleTimer = 12;
              platform.wiggleIntensity = 1;
              break;
              
            case 'SKY':
              // Cloud puff - soft white particles, gentle compression
              addParticles(player.x + player.width/2, player.y + player.height, '#F0F8FF', 4, 'impact');
              platform.bounceTimer = 25; // Fluffy bounce back
              platform.bounceIntensity = Math.min(6, landingForce);
              platform.squishTimer = 20; // Clouds squish and expand
              platform.squishScale = 1;
              platform.wiggleTimer = 30; // Gentle floating motion
              platform.wiggleIntensity = 2;
              break;
              
            case 'ATMOSPHERE':
              // Molten sparks - orange particles, heat reaction
              addParticles(player.x + player.width/2, player.y + player.height, '#FF6347', 5, 'sparkle');
              platform.bounceTimer = 15; // Molten surface ripple
              platform.bounceIntensity = Math.min(4, landingForce);
              platform.glowTimer = 25; // Heat glow
              platform.glowIntensity = Math.min(0.3, landingForce * 0.1);
              platform.wiggleTimer = 18;
              platform.wiggleIntensity = 2;
              break;
              
            case 'SPACE':
              // Tech energy - blue particles, system activation
              addParticles(player.x + player.width/2, player.y + player.height, '#00CED1', 4, 'energy');
              platform.bounceTimer = 12; // Mechanical response
              platform.bounceIntensity = Math.min(3, landingForce * 0.7);
              platform.glowTimer = 20; // Circuit glow
              platform.glowIntensity = Math.min(0.4, landingForce * 0.15);
              platform.wiggleTimer = 8;
              platform.wiggleIntensity = 1;
              break;
              
            case 'DEEP_SPACE':
              // Crystal resonance - purple particles, harmonic vibration
              addParticles(player.x + player.width/2, player.y + player.height, '#DA70D6', 4, 'sparkle');
              platform.bounceTimer = 18; // Crystal resonance
              platform.bounceIntensity = Math.min(5, landingForce);
              platform.tiltTimer = 20; // Crystal facet shift
              platform.glowTimer = 30; // Crystal glow
              platform.glowIntensity = Math.min(0.5, landingForce * 0.2);
              platform.wiggleTimer = 25;
              platform.wiggleIntensity = 3;
              break;
              
            case 'BLACK_HOLE':
              // Void distortion - dark purple particles, reality warp
              addParticles(player.x + player.width/2, player.y + player.height, '#8A2BE2', 3, 'energy');
              platform.bounceTimer = 22; // Void energy response
              platform.bounceIntensity = Math.min(7, landingForce * 1.2);
              platform.tiltTimer = 30; // Reality distortion
              platform.wiggleTimer = 35;
              platform.wiggleIntensity = 4;
              break;
              
            case 'RAINBOW':
              // Magical sparkles - rainbow particles, joyful bounce
              const rainbowColors = ['#FF69B4', '#FFD700', '#00CED1', '#98FB98'];
              const rainbowColor = rainbowColors[Math.floor(Math.random() * rainbowColors.length)];
              addParticles(player.x + player.width/2, player.y + player.height, rainbowColor, 6, 'magic');
              platform.bounceTimer = 30; // Maximum magical bounce
              platform.bounceIntensity = Math.min(8, landingForce * 1.5);
              platform.squishTimer = 25;
              platform.glowTimer = 35;
              platform.glowIntensity = Math.min(0.6, landingForce * 0.25);
              platform.wiggleTimer = 40;
              platform.wiggleIntensity = 5;
              break;
              
            default:
              // Fallback to earth-like
              addParticles(player.x + player.width/2, player.y + player.height, '#8B4513', 3, 'impact');
              platform.bounceTimer = 8;
              platform.bounceIntensity = Math.min(2, landingForce * 0.5);
              break;
          }
          
          // Update stats
          sessionStatsRef.current.platformsLanded += 1;
        }
        break;
      }
      
      // Corner correction - if player is slightly missing platform edge, nudge them onto it
      if (!player.grounded && player.velocityY > 0) {
        const playerBottom = newY + player.height;
        const playerLeft = newX;
        const playerRight = newX + player.width;
        
        // Check if we're in the right vertical range for corner correction
        if (playerBottom > platform.y && playerBottom < platform.y + platform.height + 15) {
          // Left edge correction
          if (playerLeft < platform.x && playerRight > platform.x - CORNER_CORRECTION && 
              playerRight < platform.x + CORNER_CORRECTION) {
            player.x = platform.x - player.width + 1;
            continue;
          }
          
          // Right edge correction  
          if (playerRight > platform.x + platform.width && 
              playerLeft < platform.x + platform.width + CORNER_CORRECTION &&
              playerLeft > platform.x + platform.width - CORNER_CORRECTION) {
            player.x = platform.x + platform.width - 1;
            continue;
          }
        }
      }
    }
    
    // Jump effect (particles removed for now)
    if (wasGrounded && !player.grounded && player.velocityY < -10) {
      // Future: Add power-up particle effects here
    }
    
    // Update enemies
    updateEnemies(player);
    
    // Update and render particle system
    updateAndRenderParticles(ctx, cameraYRef.current);
    
    // Enhanced camera system with smooth following and lookahead
    const targetCameraY = player.y - BASE_HEIGHT / 2;
    
    // Add lookahead based on player velocity (camera anticipates movement)
    const lookaheadY = player.velocityY * 3;
    const finalTargetY = targetCameraY + lookaheadY;
    
    // Only move camera up, never down (classic platformer camera)
    if (finalTargetY < cameraYRef.current) {
      cameraYRef.current = finalTargetY;
    }
    
    // Smooth camera interpolation with variable lerp speed based on distance
    const cameraDiff = cameraYRef.current - smoothCameraYRef.current;
    const lerpSpeed = Math.min(0.15, Math.abs(cameraDiff) * 0.001 + 0.05);
    smoothCameraYRef.current += cameraDiff * lerpSpeed;
    
    // Screen shake effect for big impacts (landing from high falls)
    let shakeX = 0, shakeY = 0;
    if (wasGrounded === false && player.grounded && Math.abs(player.velocityY) > 15) {
      const shakeIntensity = Math.min(5, Math.abs(player.velocityY) * 0.2);
      shakeX = (Math.random() - 0.5) * shakeIntensity;
      shakeY = (Math.random() - 0.5) * shakeIntensity;
    }
    
    // Update score based on height
    if (player.y < highestYRef.current) {
      highestYRef.current = player.y;
      const newScore = Math.floor((BASE_HEIGHT - 150 - player.y) / 10);
      setScore(newScore);
    }
    
    // Check game over
    if (player.y > cameraYRef.current + BASE_HEIGHT + 100) {
      // Save high score
      setHighScore(prev => {
        const next = Math.max(prev, score);
        localStorage.setItem('phraijump_highscore', String(next));
        return next;
      });
      setGameOver(true);
      ctx.restore();
      return;
    }
    
    // Apply screen shake to camera for rendering
    const effectiveCameraY = smoothCameraYRef.current + shakeY;
    const effectiveCameraX = shakeX;
    
    // Render platforms with zone colors and screen shake
    ctx.fillStyle = zoneColors.platforms.fill;
    ctx.strokeStyle = zoneColors.platforms.stroke;
    ctx.lineWidth = 2;
    
    for (const platform of platforms) {
      const screenY = platform.y - effectiveCameraY;
      if (screenY > -platform.height && screenY < BASE_HEIGHT + platform.height) {
        ctx.save();
        ctx.translate(effectiveCameraX, 0);
        renderPlatform(ctx, platform, screenY, zoneColors, currentZone, time);
        ctx.restore();
      }
    }
    
    // Render and check collectibles with screen shake
    const collectibles = collectiblesRef.current;
    for (let i = collectibles.length - 1; i >= 0; i--) {
      const collectible = collectibles[i];
      const screenY = collectible.y - effectiveCameraY;
      
      // Remove collectibles that are too far below or have been collected
      if (collectible.y > effectiveCameraY + BASE_HEIGHT + 200) {
        collectibles.splice(i, 1);
        continue;
      }
      
      // Only render if on screen
      if (screenY > -50 && screenY < BASE_HEIGHT + 50) {
        ctx.save();
        ctx.translate(effectiveCameraX, 0);
        renderCollectible(ctx, collectible, screenY, time);
        ctx.restore();
        
        // Check collision with player (no shake for collision detection)
        if (checkCollectibleCollision(player, collectible)) {
          collectItem(collectible);
          collectibles.splice(i, 1);
        }
      }
    }
    
    // Render enemies
    enemiesRef.current.forEach(enemy => {
      ctx.save();
      ctx.translate(effectiveCameraX, 0);
      renderEnemy(ctx, enemy, effectiveCameraY);
      ctx.restore();
    });

    // Render player with custom character design and screen shake
    const playerScreenY = player.y - effectiveCameraY;
    ctx.save();
    ctx.translate(effectiveCameraX, 0);
    renderPlayer(ctx, player, playerScreenY, zoneColors, time, platforms);
    ctx.restore();
    
    ctx.restore();
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [canvasDimensions]);
  
  // Touch controls for mobile - swipe/drag left-right; ignores gyro while active
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = touch.clientX - rect.left;
    touchActiveRef.current = true;
    touchStartXRef.current = x;
    // Initial intent relative to canvas center
    const centerX = rect.width / 2;
    keysRef.current.delete('ArrowLeft');
    keysRef.current.delete('ArrowRight');
    if (x < centerX) {
      keysRef.current.add('ArrowLeft');
      touchDirRef.current = -1;
    } else {
      keysRef.current.add('ArrowRight');
      touchDirRef.current = 1;
    }
  }, []);
  
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    // Clear movement keys
    keysRef.current.delete('ArrowLeft');
    keysRef.current.delete('ArrowRight');
    touchActiveRef.current = false;
    touchDirRef.current = 0;
  }, []);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = touch.clientX - rect.left;
    const dx = x - touchStartXRef.current;
    const threshold = 8; // px
    const prevDir = touchDirRef.current;
    if (Math.abs(dx) > threshold) {
      const dir: -1 | 1 = dx < 0 ? -1 : 1;
      if (dir !== prevDir) {
        // Update key set to reflect new direction
        if (dir === -1) {
          keysRef.current.delete('ArrowRight');
          keysRef.current.add('ArrowLeft');
        } else {
          keysRef.current.delete('ArrowLeft');
          keysRef.current.add('ArrowRight');
        }
        touchDirRef.current = dir;
      }
    }
  }, []);
  
  // Enhanced keyboard controls with proper input tracking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default browser behavior for game keys
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key.toLowerCase() === 'p' || e.key === 'Escape') {
        togglePause();
        return;
      }
      
      keysRef.current.add(e.key);
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
      
      // Reset jump hold state when any jump key is released
      if ([' ', 'ArrowUp', 'w'].includes(e.key)) {
        if (playerRef.current) {
          playerRef.current.isJumpHeld = false;
        }
      }
    };
    
    // Handle focus/blur to clear input state
    const handleBlur = () => {
      keysRef.current.clear();
      if (playerRef.current) {
        playerRef.current.isJumpHeld = false;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);
  
  // Start game
  const startGame = useCallback(() => {
    // Cancel any existing game loop
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = undefined;
    }
    
    // Reset all game state
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    pausedRef.current = false;
    setIsPaused(false);
    
    // Reset player
    playerRef.current = {
      x: BASE_WIDTH / 2 - 15,
      y: BASE_HEIGHT - 150,
      width: 30,
      height: 30,
      velocityX: 0,
      velocityY: 0,
      grounded: false,
      activePowerUps: [],
      jumpMultiplier: 1,
      speedMultiplier: 1,
      magnetRange: 100,
      shieldActive: false,
      doubleJumpAvailable: false,
      lastGroundTime: Date.now(),
      // Advanced platformer mechanics
      coyoteTime: 0,
      jumpBufferTime: 0,
      lastJumpInput: 0,
      isJumpHeld: false,
      framesSinceGrounded: 0
    };
    
    // Reset camera and score tracking
    cameraYRef.current = 0;
    highestYRef.current = BASE_HEIGHT - 150;
    
    // Clear particles and effects
    particlesRef.current = [];
    playerTrailRef.current = [];
    collectiblesRef.current = [];
    smoothCameraYRef.current = 0;
    
    // Reset session stats
    sessionStatsRef.current = {
      coinsCollected: 0,
      platformsLanded: 0,
      jumps: 0,
      maxHeight: 0,
      startTime: Date.now()
    };
    
    // Reset streak and coins for this session
    setCoins(0);
    setCurrentStreak(0);
    
    // Clear any input state
    keysRef.current.clear();
    
    // Initialize platforms
    initializePlatforms();
    
    // Start the game loop immediately
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [initializePlatforms, gameLoop]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, []);
  
  // Render nebula clouds for dark space
  const renderNebula = (ctx: CanvasRenderingContext2D, cameraY: number, time: number) => {
    const nebulaLayers = [
      { color: [100, 50, 200], alpha: 0.15, scale: 2.0, parallax: 0.1 },
      { color: [200, 100, 50], alpha: 0.12, scale: 1.5, parallax: 0.15 },
      { color: [50, 200, 150], alpha: 0.1, scale: 1.8, parallax: 0.08 }
    ];
    
    nebulaLayers.forEach((layer, layerIndex) => {
      const parallaxY = cameraY * layer.parallax;
      
      for (let i = 0; i < 8; i++) {
        const seedX = (i + layerIndex * 20) * 97 + 23;
        const seedY = (i + layerIndex * 20) * 139 + 67;
        
        const worldX = ((seedX * 41) % (BASE_WIDTH * 2)) - BASE_WIDTH * 0.5;
        const worldY = ((seedY * 53) % 3000) - 1500 + Math.floor(parallaxY / 500) * 500;
        
        const screenX = worldX;
        const screenY = worldY - parallaxY + cameraY;
        
        if (screenY > -200 && screenY < BASE_HEIGHT + 200) {
          const gradient = ctx.createRadialGradient(
            screenX, screenY, 0,
            screenX, screenY, 100 * layer.scale
          );
          gradient.addColorStop(0, `rgba(${layer.color.join(',')}, ${layer.alpha})`);
          gradient.addColorStop(0.5, `rgba(${layer.color.join(',')}, ${layer.alpha * 0.5})`);
          gradient.addColorStop(1, `rgba(${layer.color.join(',')}, 0)`);
          
          ctx.fillStyle = gradient;
          ctx.fillRect(screenX - 100 * layer.scale, screenY - 100 * layer.scale, 
                      200 * layer.scale, 200 * layer.scale);
        }
      }
    });
  };
  
  // Render shooting stars/meteors
  const renderShootingStars = (ctx: CanvasRenderingContext2D, cameraY: number, time: number) => {
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    
    for (let i = 0; i < 3; i++) {
      const cycle = (time * 0.001 + i * 2000) % 8000; // 8 second cycle
      if (cycle < 1000) { // Active for 1 second out of 8
        const progress = cycle / 1000;
        const seedX = i * 73 + 29;
        const seedY = i * 127 + 53;
        
        const startX = ((seedX * 31) % BASE_WIDTH);
        const startY = ((seedY * 47) % 300) - 150 + cameraY;
        
        const endX = startX + 150 * progress;
        const endY = startY + 100 * progress;
        
        if (startY > cameraY - 100 && startY < cameraY + BASE_HEIGHT + 100) {
          ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.8;
          ctx.beginPath();
          ctx.moveTo(startX, startY - cameraY);
          ctx.lineTo(endX, endY - cameraY);
          ctx.stroke();
          
          // Meteor glow
          ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.3;
          ctx.lineWidth = 6;
          ctx.stroke();
          ctx.lineWidth = 2;
        }
      }
    }
    ctx.globalAlpha = 1;
  };
  
  // Render space dust particles
  const renderSpaceDust = (ctx: CanvasRenderingContext2D, cameraY: number, time: number) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    
    for (let i = 0; i < 50; i++) {
      const x = (i * 47) % BASE_WIDTH;
      const baseY = Math.floor(cameraY / 20) * 20;
      const y = ((i * 73) % 400) + baseY;
      const drift = Math.sin(time * 0.001 + i) * 10;
      
      const screenY = y - cameraY;
      if (screenY > -5 && screenY < BASE_HEIGHT + 5) {
        ctx.globalAlpha = 0.2 + Math.sin(time * 0.002 + i) * 0.1;
        ctx.beginPath();
        ctx.arc(x + drift, screenY, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  };
  
  // Render distant galaxies
  const renderGalaxies = (ctx: CanvasRenderingContext2D, cameraY: number) => {
    for (let i = 0; i < 4; i++) {
      const seedX = i * 89 + 37;
      const seedY = i * 113 + 71;
      
      const x = ((seedX * 43) % BASE_WIDTH);
      const y = ((seedY * 59) % 2000) - 1000 + Math.floor(cameraY / 1000) * 1000;
      
      const screenY = y - cameraY;
      if (screenY > -50 && screenY < BASE_HEIGHT + 50) {
        const gradient = ctx.createRadialGradient(x, screenY, 0, x, screenY, 25);
        gradient.addColorStop(0, 'rgba(255, 255, 200, 0.2)');
        gradient.addColorStop(0.3, 'rgba(200, 200, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(200, 200, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x - 25, screenY - 25, 50, 50);
        
        // Galaxy center
        ctx.fillStyle = 'rgba(255, 255, 200, 0.4)';
        ctx.beginPath();
        ctx.arc(x, screenY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };
  
  // Power-up Management Functions
  const getPowerUpIcon = (type: PowerUpType): string => {
    const icons: Record<PowerUpType, string> = {
      // Land Zone
      'jump_boost': '⬆️',
      'speed_boost': '💨',
      'coin_magnet': '🧲',
      // Sky Zone
      'double_jump': '🚀',
      'wind_glide': '🌪️',
      'cloud_dash': '☁️',
      // Atmosphere Zone
      'shield': '🛡️',
      'slow_motion': '⏰',
      'heat_protection': '🧊',
      // Space Zone
      'anti_gravity': '🌌',
      'rocket_boost': '🚀',
      'magnetic_boots': '🥾',
      // Deep Space Zone
      'phase_walk': '👻',
      'time_dilation': '⏳',
      'energy_burst': '⚡',
      // Black Hole Zone
      'gravity_control': '🌀',
      'dimension_shift': '🌈',
      'singularity_shield': '🔮',
      // Rainbow Zone
      'rainbow_bridge': '🌈',
      'wish_fulfillment': '⭐',
      'miracle_jump': '✨'
    };
    return icons[type] || '🎁';
  };

  const getPowerUpName = (type: PowerUpType): string => {
    const names: Record<PowerUpType, string> = {
      // Land Zone
      'jump_boost': 'Jump Boost',
      'speed_boost': 'Speed Boost',
      'coin_magnet': 'Coin Magnet',
      // Sky Zone
      'double_jump': 'Double Jump',
      'wind_glide': 'Wind Glide',
      'cloud_dash': 'Cloud Dash',
      // Atmosphere Zone
      'shield': 'Shield',
      'slow_motion': 'Slow Motion',
      'heat_protection': 'Heat Protection',
      // Space Zone
      'anti_gravity': 'Anti-Gravity',
      'rocket_boost': 'Rocket Boost',
      'magnetic_boots': 'Magnetic Boots',
      // Deep Space Zone
      'phase_walk': 'Phase Walk',
      'time_dilation': 'Time Dilation',
      'energy_burst': 'Energy Burst',
      // Black Hole Zone
      'gravity_control': 'Gravity Control',
      'dimension_shift': 'Dimension Shift',
      'singularity_shield': 'Singularity Shield',
      // Rainbow Zone
      'rainbow_bridge': 'Rainbow Bridge',
      'wish_fulfillment': 'Wish Fulfillment',
      'miracle_jump': 'Miracle Jump'
    };
    return names[type] || 'Mystery Power';
  };

  const applyPowerUp = (player: Player, type: PowerUpType, zoneType: string) => {
    const powerUpId = `${type}_${Date.now()}`;
    const currentTime = Date.now();
    
    // Duration and strength based on zone and type
    let duration = 10000; // Base 10 seconds
    let strength = 1.5; // Base multiplier
    
    // Zone-specific duration and strength adjustments
    if (zoneType === 'RAINBOW') {
      duration *= 1.5;
      strength *= 1.3;
    } else if (zoneType === 'BLACK_HOLE') {
      duration *= 1.2;
      strength *= 1.2;
    }

    const powerUp: PowerUp = {
      id: powerUpId,
      type,
      duration,
      startTime: currentTime,
      strength,
      zoneType
    };

    // Apply immediate effects
    switch (type) {
      case 'jump_boost':
        player.jumpMultiplier = Math.max(player.jumpMultiplier, strength);
        break;
      case 'speed_boost':
        player.speedMultiplier = Math.max(player.speedMultiplier, strength);
        break;
      case 'coin_magnet':
        player.magnetRange = Math.max(player.magnetRange, 200 * strength);
        break;
      case 'double_jump':
        player.doubleJumpAvailable = true;
        break;
      case 'shield':
        player.shieldActive = true;
        break;
      case 'anti_gravity':
        player.jumpMultiplier = Math.max(player.jumpMultiplier, strength * 2);
        break;
      case 'rocket_boost':
        player.velocityY = Math.min(player.velocityY, -25 * strength);
        addParticles(player.x + player.width/2, player.y + player.height, '#FF6B35', 15, 'magic');
        break;
      case 'phase_walk':
        // Handled in collision detection
        break;
      case 'gravity_control':
        player.jumpMultiplier = Math.max(player.jumpMultiplier, strength * 3);
        break;
      case 'miracle_jump':
        player.velocityY = Math.min(player.velocityY, -35 * strength);
        player.jumpMultiplier = Math.max(player.jumpMultiplier, strength * 2);
        addParticles(player.x + player.width/2, player.y + player.height, '#FFD700', 20, 'magic');
        break;
    }

    // Add to active power-ups (remove existing of same type first)
    player.activePowerUps = player.activePowerUps.filter(p => p.type !== type);
    player.activePowerUps.push(powerUp);

    // Update stats
    setGameStats(prev => ({ ...prev, powerUpsUsed: prev.powerUpsUsed + 1 }));
    
    // Add visual effect
    addParticles(player.x + player.width/2, player.y + player.height/2, '#FFD700', 12, 'sparkle');
  };

  const updatePowerUps = (player: Player, currentTime: number) => {
    // Remove expired power-ups and reset effects
    const activePowerUps = player.activePowerUps.filter(powerUp => {
      if (currentTime - powerUp.startTime > powerUp.duration) {
        // Reset effects for expired power-ups
        switch (powerUp.type) {
          case 'jump_boost':
            player.jumpMultiplier = 1;
            break;
          case 'speed_boost':
            player.speedMultiplier = 1;
            break;
          case 'coin_magnet':
            player.magnetRange = 100;
            break;
          case 'double_jump':
            // Keep available until used
            break;
          case 'shield':
            player.shieldActive = false;
            break;
          case 'anti_gravity':
          case 'gravity_control':
            player.jumpMultiplier = 1;
            break;
        }
        return false;
      }
      return true;
    });

    player.activePowerUps = activePowerUps;

    // Handle double jump reset
    if (player.grounded && currentTime - player.lastGroundTime > 100) {
      player.doubleJumpAvailable = player.activePowerUps.some(p => p.type === 'double_jump');
      player.lastGroundTime = currentTime;
    }
  };

  // Special Platform Functions
  const generateSpecialPlatform = (platform: Platform, zone: string): Platform => {
    const random = Math.random();
    
    // Zone-specific special platform types and spawn rates
    if (zone === 'LAND') {
      if (random < 0.1) {
        platform.specialType = 'bouncy';
        platform.specialState = 1;
      }
    } else if (zone === 'SKY') {
      if (random < 0.15) {
        const skyTypes: Array<Platform['specialType']> = ['wind', 'crumbling'];
        platform.specialType = skyTypes[Math.floor(Math.random() * skyTypes.length)];
        platform.specialState = platform.specialType === 'crumbling' ? 3 : 1; // Crumbling health
      }
    } else if (zone === 'ATMOSPHERE') {
      if (random < 0.2) {
        platform.specialType = 'ice';
        platform.specialState = 1;
      }
    } else if (zone === 'SPACE') {
      if (random < 0.25) {
        const spaceTypes: Array<Platform['specialType']> = ['gravity', 'magnetic'];
        platform.specialType = spaceTypes[Math.floor(Math.random() * spaceTypes.length)];
        platform.specialState = 1;
      }
    } else if (zone === 'DEEP_SPACE') {
      if (random < 0.3) {
        platform.specialType = 'phase';
        platform.specialState = 1; // Phase cycle
      }
    } else if (zone === 'BLACK_HOLE') {
      if (random < 0.35) {
        platform.specialType = 'teleporter';
        platform.specialState = 1;
      }
    } else if (zone === 'RAINBOW') {
      if (random < 0.4) {
        platform.specialType = 'rainbow';
        platform.specialState = 1;
      }
    }

    return platform;
  };

  const updateSpecialPlatform = (platform: Platform, time: number, player: Player) => {
    if (!platform.specialType) return;

    switch (platform.specialType) {
      case 'crumbling':
        if (platform.lastPlayerContact && time - platform.lastPlayerContact > 1000) {
          platform.specialState = Math.max(0, (platform.specialState || 0) - 0.02);
          if ((platform.specialState || 0) <= 0) {
            platform.fadeAlpha = Math.max(0, (platform.fadeAlpha || 1) - 0.05);
          }
        }
        break;
        
      case 'phase':
        // Phase in and out of existence
        platform.specialState = (time * 0.001) % 4; // 4-second cycle
        platform.fadeAlpha = platform.specialState < 2 ? 
          Math.sin((platform.specialState / 2) * Math.PI) : 0.3;
        break;
        
      case 'wind':
        // Create wind effect particles
        if (Math.random() < 0.1) {
          addParticles(
            platform.x + Math.random() * platform.width,
            platform.y - 10,
            '#87CEEB',
            1,
            'impact'
          );
        }
        break;
        
      case 'ice':
        // Slippery effect - handled in player movement
        break;
        
      case 'gravity':
        // Reverse gravity effect zone
        break;
        
      case 'magnetic':
        // Attract nearby collectibles
        collectiblesRef.current.forEach(collectible => {
          if (!collectible.collected) {
            const dx = (platform.x + platform.width/2) - collectible.x;
            const dy = (platform.y - 20) - collectible.y;
            const distance = Math.sqrt(dx*dx + dy*dy);
            
            if (distance < 150) {
              const force = 1 / Math.max(distance / 50, 1);
              collectible.x += dx * force * 0.02;
              collectible.y += dy * force * 0.02;
            }
          }
        });
        break;
        
      case 'rainbow':
        // Cycling rainbow colors
        platform.specialState = (time * 0.005) % (Math.PI * 2);
        break;
    }
  };

  const handleSpecialPlatformEffect = (platform: Platform, player: Player) => {
    if (!platform.specialType) return;
    
    platform.lastPlayerContact = Date.now();
    
    switch (platform.specialType) {
      case 'bouncy':
        player.velocityY = Math.min(player.velocityY, -25);
        addParticles(player.x + player.width/2, player.y + player.height, '#32CD32', 10, 'jump');
        break;
        
      case 'wind':
        // Horizontal wind boost
        player.velocityX += (Math.random() - 0.5) * 8;
        player.velocityY *= 0.8; // Slight upward assistance
        break;
        
      case 'ice':
        // Reduced friction - handled in movement
        break;
        
      case 'sticky':
        // Increased friction - handled in movement
        break;
        
      case 'gravity':
        // Reverse gravity temporarily
        applyPowerUp(player, 'anti_gravity', platform.zoneType);
        break;
        
      case 'magnetic':
        // Activate coin magnet
        applyPowerUp(player, 'coin_magnet', platform.zoneType);
        break;
        
      case 'teleporter':
        // Find and teleport to partner platform
        if (platform.teleportPartner) {
          player.x = platform.teleportPartner.x + platform.teleportPartner.width/2 - player.width/2;
          player.y = platform.teleportPartner.y - player.height - 5;
          addParticles(player.x + player.width/2, player.y + player.height/2, '#9370DB', 15, 'magic');
        }
        break;
        
      case 'rainbow':
        // Random positive effect
        const rainbowEffects: PowerUpType[] = ['jump_boost', 'speed_boost', 'coin_magnet', 'shield'];
        const randomEffect = rainbowEffects[Math.floor(Math.random() * rainbowEffects.length)];
        applyPowerUp(player, randomEffect, platform.zoneType);
        break;
    }
    
    // Update stats
    setGameStats(prev => ({ ...prev, specialPlatformsUsed: prev.specialPlatformsUsed + 1 }));
  };
  
  return (
    <div className="phraijump-container">
      {/* Achievement notifications */}
      {newAchievements.length > 0 && (
        <div className="achievement-notifications">
          {newAchievements.map((achievement, index) => (
            <div key={achievement.id} className="achievement-notification" 
                 style={{ animationDelay: `${index * 0.5}s` }}>
              <div className="achievement-header">
                <span className="achievement-icon">🏆</span>
                <span className="achievement-title">Achievement Unlocked!</span>
              </div>
              <div className="achievement-name">{achievement.name}</div>
              <div className="achievement-description">{achievement.description}</div>
              {achievement.reward && (
                <div className="achievement-reward">Reward: {achievement.reward}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Enhanced UI with progression */}
      {gameStarted && !gameOver && (
        <div className="game-ui">
          <div className="top-bar">
        <div className="score">Score: {score}</div>
            <div className="coins">
              <span className="coin-icon">💰</span>
              <span className="coin-count">{coins}</span>
            </div>
            <div className="height">
              <span className="height-icon">📏</span>
              <span className="height-value">{Math.floor(score / 10)}m</span>
            </div>
      </div>
          
          {/* Current streak indicator */}
          {currentStreak > 0 && (
            <div className="streak-indicator">
              <span className="streak-icon">🔥</span>
              <span className="streak-text">Streak: {currentStreak}</span>
            </div>
          )}
          

          
          {/* Active power-ups display */}
          {playerRef.current.activePowerUps.length > 0 && (
            <div className="active-powerups">
              {playerRef.current.activePowerUps.map(powerUp => {
                const timeLeft = Math.max(0, powerUp.duration - (Date.now() - powerUp.startTime));
                const progress = timeLeft / powerUp.duration;
                return (
                  <div key={powerUp.id} className="powerup-display">
                    <div className="powerup-icon">{getPowerUpIcon(powerUp.type)}</div>
                    <div className="powerup-timer">
                      <div className="powerup-name">{getPowerUpName(powerUp.type)}</div>
                      <div className="powerup-progress-bar">
                        <div 
                          className="powerup-progress-fill"
                          style={{ width: `${progress * 100}%` }}
                        />
                      </div>
                      <div className="powerup-time">{Math.ceil(timeLeft / 1000)}s</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      
      {/* Floating back button */}
      <div className="floating-back-button" onClick={() => navigate('/play')} title="Back to Games"></div>
      
      <div className="game-area">
        <canvas
          ref={canvasRef}
          width={canvasDimensions.width}
          height={canvasDimensions.height}
          className="game-canvas"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
        />
        
        {!gameStarted && (
          <div className="game-overlay">
            <div className="start-screen">
              <h2>🎮 Phraijump 🚀</h2>
              <p>Jump through the dimensions!</p>
              <p>Use ← → to move, SPACE to jump</p>
              
              {/* Player stats display */}
              <div className="player-stats">
                <div className="stat-card">
                  <span className="stat-icon">💰</span>
                  <span className="stat-value">{totalCoins}</span>
                  <span className="stat-label">Total Coins</span>
                </div>
                <div className="stat-card">
                  <span className="stat-icon">📏</span>
                  <span className="stat-value">{Math.floor(gameStats.maxHeight / 10)}m</span>
                  <span className="stat-label">Max Height</span>
                </div>
                <div className="stat-card">
                  <span className="stat-icon">🎯</span>
                  <span className="stat-value">{achievements.filter(a => a.completed).length}</span>
                  <span className="stat-label">Achievements</span>
                </div>
              </div>
              
              <button className="start-button" onClick={startGame}>
                Start Game
              </button>
              <div style={{ marginTop: 10, color: 'rgba(255,255,255,0.9)', fontSize: 14 }}>
                High Score: {highScore}
              </div>
              <button className="menu-button" onClick={togglePause}>
                {isPaused ? 'Resume (P/Esc)' : 'Pause (P/Esc)'}
              </button>
              
              {/* Show some recent achievements */}
              {achievements.filter(a => a.completed).length > 0 && (
                <div className="recent-achievements">
                  <h3>Recent Achievements</h3>
                  {achievements.filter(a => a.completed).slice(-3).map(achievement => (
                    <div key={achievement.id} className="mini-achievement">
                      <span>🏆</span>
                      <span>{achievement.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {gameOver && (
          <div className="game-overlay">
            <div className="game-over-screen">
              <h2>Game Over!</h2>
              <div className="final-stats">
                <div className="stat-row">
                  <span>Score:</span>
                  <span>{score}</span>
                </div>
                <div className="stat-row">
                  <span>Height:</span>
                  <span>{Math.floor(score / 10)}m</span>
                </div>
                <div className="stat-row">
                  <span>Coins Collected:</span>
                  <span>{sessionStatsRef.current.coinsCollected}</span>
                </div>
                <div className="stat-row">
                  <span>Platforms Landed:</span>
                  <span>{sessionStatsRef.current.platformsLanded}</span>
                </div>
                <div className="stat-row">
                  <span>Current Streak:</span>
                  <span>{currentStreak}</span>
                </div>
              </div>
              
              <button className="restart-button" onClick={startGame}>
                Play Again
              </button>
              <button className="menu-button" onClick={() => navigate('/play')}>
                Back to Menu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 