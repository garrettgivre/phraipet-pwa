import { useNavigate } from "react-router-dom";
import "./NavBar.css";

export default function NavBar() {
  const navigate = useNavigate();

  return (
    <nav className="nav-bar">
      <div className="nav-item" onClick={() => navigate("/")}>
        <div className="bubble-container">
          <span>Pet</span>
          <img src="/assets/icons/bubble-b.png" alt="Pet" className="bubble-icon" />
        </div>
      </div>
      <div className="nav-item" onClick={() => navigate("/explore")}>
        <div className="bubble-container">
          <span>Explore</span>
          <img src="/assets/icons/bubble-y.png" alt="Explore" className="bubble-icon" />
        </div>
      </div>
      <div className="nav-item" onClick={() => navigate("/play")}>
        <div className="bubble-container">
          <span>Play</span>
          <img src="/assets/icons/bubble-p.png" alt="Play" className="bubble-icon" />
        </div>
      </div>
    </nav>
  );
}
