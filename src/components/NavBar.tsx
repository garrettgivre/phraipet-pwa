import { useNavigate, useLocation } from "react-router-dom";
import "./NavBar.css";

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const go = (path: string): void => { 
    if (path === '/') {
      navigate(path, { state: { reset: Date.now() } });
    } else {
      navigate(path); 
    }
  };

  return (
    <nav className="nav-bar">
      <div 
        className={`nav-item ${isActive("/") ? "active" : ""}`} 
        onClick={() => go("/")}
      >
        <div className="bubble-container">
          <span>Pet</span>
          <img src="/assets/icons/nav-pet.png" alt="Pet" className="bubble-icon" />
        </div>
      </div>
      <div 
        className={`nav-item ${isActive("/explore") ? "active" : ""}`} 
        onClick={() => go("/explore")}
      >
        <div className="bubble-container">
          <span>Explore</span>
          <img src="/assets/icons/nav-explore.png" alt="Explore" className="bubble-icon" />
        </div>
      </div>
      <div 
        className={`nav-item ${isActive("/play") ? "active" : ""}`} 
        onClick={() => go("/play")}
      >
        <div className="bubble-container">
          <span>Play</span>
          <img src="/assets/icons/nav-play.png" alt="Play" className="bubble-icon" />
        </div>
      </div>
    </nav>
  );
}
