import { useNavigate, useLocation } from "react-router-dom";
import "./NavBar.css";

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="nav-bar">
      <div 
        className={`nav-item ${isActive("/") ? "active" : ""}`} 
        onClick={() => navigate("/")}
      >
        <div className="bubble-container">
          <span>Pet</span>
          <img src="/assets/icons/nav-pet.png" alt="Pet" className="bubble-icon" />
        </div>
      </div>
      <div 
        className={`nav-item ${isActive("/explore") ? "active" : ""}`} 
        onClick={() => navigate("/explore")}
      >
        <div className="bubble-container">
          <span>Explore</span>
          <img src="/assets/icons/nav-explore.png" alt="Explore" className="bubble-icon" />
        </div>
      </div>
      <div 
        className={`nav-item ${isActive("/play") ? "active" : ""}`} 
        onClick={() => navigate("/play")}
      >
        <div className="bubble-container">
          <span>Play</span>
          <img src="/assets/icons/nav-play.png" alt="Play" className="bubble-icon" />
        </div>
      </div>
    </nav>
  );
}
