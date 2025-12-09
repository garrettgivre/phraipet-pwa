import { useNavigate } from 'react-router-dom';

const LocationTemplate = ({ name, image }: { name: string; image?: string }) => {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: '#f2ead3', display: 'flex', flexDirection: 'column' }}>
      {image && (
        <img 
          src={image} 
          alt={name} 
          style={{ 
            width: '100%', 
            height: 'auto', 
            display: 'block',
            marginTop: '60px', // Offset for fixed header height
            position: 'relative',
            zIndex: 0
          }} 
        />
      )}
      <div style={{ padding: '20px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <h1>{name}</h1>
      </div>
      <div style={{ padding: '0 20px 20px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
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
    </div>
  );
};

export const AmethystSpires = () => <LocationTemplate name="Amethyst Spires" image="/maps/citycloseups/amethystspires.jpg" />;
export const AmethystWoodsEntrance = () => <LocationTemplate name="Entrance to The Amethyst Woods" image="/maps/citycloseups/entrancetotheamethystwoods.jpg" />;
export const SunnybrookVillage = () => <LocationTemplate name="Sunnybrook Village" image="/maps/citycloseups/sunnybrook.jpg" />;
export const PetilaTown = () => <LocationTemplate name="Petila Town" image="/maps/citycloseups/petila.jpg" />;
export const RevivinCoast = () => <LocationTemplate name="Revivin Coast" image="/maps/citycloseups/revivin.jpg" />;
export const SpiralGate = () => <LocationTemplate name="The Spiral Gate" />;
export const SunstepPlateau = () => <LocationTemplate name="Sunstep Plateau" image="/maps/citycloseups/sunstepplateau.jpg" />;
export const VerdiStop = () => <LocationTemplate name="The Verdi Stop" image="/maps/citycloseups/verdistop.jpg" />;
export const EssicTown = () => <LocationTemplate name="Essic Town" image="/maps/citycloseups/essic.jpg" />;
export const TideglassDepths = () => <LocationTemplate name="Tideglass Depths" image="/maps/citycloseups/tideglass.jpg" />;
export const FrostemberPeak = () => <LocationTemplate name="Frostember Peak" />;
export const SmolderfumeTown = () => <LocationTemplate name="Smolderfume Town" />;
export const MutlichPeak = () => <LocationTemplate name="Mütlich Peak" image="/maps/citycloseups/mütlich.jpg" />;
export const AshenrootRidge = () => <LocationTemplate name="Ashenroot Ridge" image="/maps/citycloseups/ashenrootridge.jpg" />;
export const RevelridTown = () => <LocationTemplate name="Revelrid Town" image="/maps/citycloseups/revelrid.jpg" />;
export const CreykenpCity = () => <LocationTemplate name="Creykenp City" />;
export const CreykenpDowntown = () => <LocationTemplate name="Creykenp Downtown" image="/maps/citycloseups/creykenpdowntown.jpg" />;
export const CreykenpHQ = () => <LocationTemplate name="Creykenp HQ" image="/maps/citycloseups/creykenphq.jpg" />;
export const CreykenpStadium = () => <LocationTemplate name="Creykenp Stadium" image="/maps/citycloseups/creykenpstadium.jpg" />;
export const PrismSanctum = () => <LocationTemplate name="Prism Sanctum" image="/maps/citycloseups/prismsanctum.jpg" />;
export const EverfallPerch = () => <LocationTemplate name="Everfall Perch" />;
export const MistblossomVillage = () => <LocationTemplate name="Mistblossom Village" />;
export const ReqoolIsland = () => <LocationTemplate name="Reqool Island" />;
export const CastawaysKnoll = () => <LocationTemplate name="Castaway’s Knoll" />;
export const TreuseIsland = () => <LocationTemplate name="Treuse Island" />;



