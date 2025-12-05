import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import BackButton from '../components/BackButton';
import { petService, withErrorHandling } from '../services/firebase';
import { getDefaultPet } from '../utils/pet';
import { useCoins } from '../contexts/CoinsContext';
import { useInventory } from '../contexts/InventoryContext';
import './Settings.css';

const isDev = import.meta.env.DEV;

export default function Settings() {
  const navigate = useNavigate();
  const { hueRotation, setHueRotation } = useTheme();
  const { addCoins } = useCoins();
  const { inventory, addToInventory, removeFromInventory } = useInventory();

  const [showGrid, setShowGrid] = React.useState(() => {
    const saved = localStorage.getItem('show_map_grid');
    return saved === 'true';
  });

  const handleGridToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setShowGrid(newValue);
    localStorage.setItem('show_map_grid', newValue.toString());
    // Dispatch event for other components to pick up
    window.dispatchEvent(new Event('map-grid-toggle'));
  };

  const handleRefillNeeds = async () => {
    const defaultPet = getDefaultPet();
    // Max out all needs
    const fullPet = {
      ...defaultPet,
      hunger: 120,
      happiness: 120,
      cleanliness: 120,
      affection: 120,
      spirit: 120,
      lastNeedsUpdateTime: Date.now(),
    };
    
    if (confirm('Are you sure you want to maximize all pet needs?')) {
      await withErrorHandling(
        () => petService.updatePetNeeds(fullPet),
        "Failed to refill pet needs"
      );
      window.location.reload();
    }
  };

  const handleResetPet = async () => {
    if (confirm('Are you sure you want to RESET your pet data? This cannot be undone.')) {
      const newPet = getDefaultPet();
      await withErrorHandling(
        () => petService.updatePetNeeds(newPet),
        "Failed to reset pet"
      );
      window.location.reload();
    }
  };

  const handleAddCoins = () => {
    addCoins(1000);
    alert('Added 1000 coins!');
  };

  const handleClearInventory = () => {
    if (confirm('Clear all items from inventory?')) {
      // Logic to clear inventory would go here if exposed by context
      // Currently context only supports add/remove single items
      // This is a placeholder for now
      alert('Inventory clearing not fully implemented in context yet.');
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <BackButton onClick={() => navigate('/')} />
        <h1>Settings</h1>
      </div>
      
      <div className="settings-content">
        <div className="setting-section">
          <h2>Theme</h2>
          <div className="theme-control">
            <label htmlFor="hue-slider">App Color Theme</label>
            <div className="color-preview" style={{ filter: `hue-rotate(${hueRotation}deg)` }}></div>
            <input 
              id="hue-slider"
              type="range" 
              min="0" 
              max="360" 
              value={hueRotation} 
              onChange={(e) => setHueRotation(parseInt(e.target.value))}
              className="hue-slider"
            />
            <span className="hue-value">{hueRotation}°</span>
          </div>
        </div>

        {isDev && (
          <div className="setting-section">
            <h2>Developer Options</h2>
            <div className="toggle-control">
              <label className="toggle-label">
                <span>Show Map Grid</span>
                <input 
                  type="checkbox" 
                  checked={showGrid} 
                  onChange={handleGridToggle} 
                />
                <span className="toggle-switch"></span>
              </label>
            </div>
            
            <div className="dev-actions" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
              <button 
                onClick={handleRefillNeeds}
                className="action-button primary"
                style={{ padding: '10px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
              >
                Refill All Needs
              </button>
              <button 
                onClick={handleAddCoins}
                className="action-button"
                style={{ padding: '10px', background: '#FFC107', color: 'black', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
              >
                Add 1000 Coins
              </button>
              <button 
                onClick={handleResetPet}
                className="action-button danger"
                style={{ padding: '10px', background: '#f44336', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
              >
                Reset Pet Data
              </button>
            </div>
          </div>
        )}

        <div className="setting-section">
          <h2>About</h2>
          <p>PhraiPets PWA v1.0.0</p>
          <p>Take care of your virtual pet!</p>
        </div>
      </div>
    </div>
  );
}

