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

  const handleRescuePals = () => {
    void navigate('/rescuepals');
  };

  return (
    <div className="play-page-container">
      <h1 className="play-page-title">Game Center</h1>
      <p className="play-page-subtitle">Choose your adventure!</p>
      
      <div className="games-grid">
        <button 
          className="game-button phraijump-button"
          onClick={handlePhraiJump}
        >
          <div className="game-icon">🦘</div>
          <div className="game-title">Phraijump</div>
        </button>
        
        <button 
          className="game-button phraicrush-button"
          onClick={handlePhraiCrush}
        >
          <div className="game-icon">🍭</div>
          <div className="game-title">PhraiCrush</div>
          <div className="game-subtitle">Advanced Match-3</div>
        </button>
        
        <button 
          className="game-button rescuepals-button"
          onClick={handleRescuePals}
        >
          <div className="game-icon">🦆🐈</div>
          <div className="game-title">Rescue Pals</div>
          <div className="game-subtitle">Duck & Cat Puzzle</div>
        </button>
      </div>
      
      <button 
        onClick={handleRefresh}
        className="refresh-button"
      >
        Refresh App
      </button>
    </div>
  );
}
