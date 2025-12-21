import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Play.css';

export default function Play() {
  const navigate = useNavigate();
  
  const handleRefresh = () => {
    window.location.reload();
  };

  const handlePhraiJump = () => {
    void navigate('/phraijump');
  };

  const handlePhraiCrush = () => {
    void navigate('/phraicrush');
  };

  return (
    <div className="play-page-container">
      <img src="/assets/TextHeaders/GameRoom.png" alt="Game Room" className="play-header-image" />
      
      <div className="games-grid">
        <button 
          className="game-button phraijump-button"
          onClick={handlePhraiJump}
        >
          <img src="/assets/icons/phraijump.png" alt="Phraijump" className="game-icon-img" />
          <div className="game-title">Phraijump</div>
        </button>
        
        <button 
          className="game-button phraicrush-button"
          onClick={handlePhraiCrush}
        >
          <img src="/assets/icons/phraicrush.png" alt="PhraiCrush" className="game-icon-img" />
          <div className="game-title">PhraiCrush</div>
        </button>
      </div>
      
      <div className="bottom-controls">
        <button 
          onClick={handleRefresh}
          className="refresh-button"
        >
          Refresh App
        </button>
      </div>
    </div>
  );
}
