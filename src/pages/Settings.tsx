import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import BackButton from '../components/BackButton';
import './Settings.css';

export default function Settings() {
  const navigate = useNavigate();
  const { hueRotation, setHueRotation } = useTheme();

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
        </div>

        <div className="setting-section">
          <h2>About</h2>
          <p>PhraiPets PWA v1.0.0</p>
          <p>Take care of your virtual pet!</p>
        </div>
      </div>
    </div>
  );
}

