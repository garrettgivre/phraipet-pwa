import React from 'react';
import { useNavigate } from 'react-router-dom';

const LocationTemplate = ({ name }: { name: string }) => {
  const navigate = useNavigate();
  return (
    <div style={{ padding: '20px', textAlign: 'center', minHeight: '100vh', background: '#f2ead3' }}>
      <h1>{name}</h1>
      <p>Welcome to {name}! This area is coming soon.</p>
      <button 
        onClick={() => navigate('/explore')}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer',
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '5px'
        }}
      >
        Back to Map
      </button>
    </div>
  );
};

export const AmethystSpires = () => <LocationTemplate name="Amethyst Spires" />;
export const AmethystWoodsEntrance = () => <LocationTemplate name="Entrance to The Amethyst Woods" />;
export const SunnybrookVillage = () => <LocationTemplate name="Sunnybrook Village" />;
export const PetilaTown = () => <LocationTemplate name="Petila Town" />;
export const RevivinCoast = () => <LocationTemplate name="Revivin Coast" />;
export const SpiralGate = () => <LocationTemplate name="The Spiral Gate" />;
export const SunstepPlateau = () => <LocationTemplate name="Sunstep Plateau" />;
export const VerdiStop = () => <LocationTemplate name="The Verdi Stop" />;
export const EssicTown = () => <LocationTemplate name="Essic Town" />;
export const TideglassDepths = () => <LocationTemplate name="Tideglass Depths" />;
export const FrostemberPeak = () => <LocationTemplate name="Frostember Peak" />;
export const SmolderfumeTown = () => <LocationTemplate name="Smolderfume Town" />;
export const MutlichPeak = () => <LocationTemplate name="Mütlich Peak" />;
export const AshenrootRidge = () => <LocationTemplate name="Ashenroot Ridge" />;
export const RevelridTown = () => <LocationTemplate name="Revelrid Town" />;
export const CreykenpCity = () => <LocationTemplate name="Creykenp City" />;
export const PrismSanctum = () => <LocationTemplate name="Prism Sanctum" />;
export const EverfallPerch = () => <LocationTemplate name="Everfall Perch" />;
export const MistblossomVillage = () => <LocationTemplate name="Mistblossom Village" />;
export const ReqoolIsland = () => <LocationTemplate name="Reqool Island" />;
export const CastawaysKnoll = () => <LocationTemplate name="Castaway’s Knoll" />;
export const TreuseIsland = () => <LocationTemplate name="Treuse Island" />;

