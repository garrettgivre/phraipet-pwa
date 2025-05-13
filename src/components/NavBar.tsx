import { useNavigate } from "react-router-dom";
import "./NavBar.css";

export default function NavBar() {
  const navigate = useNavigate();

  return (
    <nav className="nav-bar">
      <div className="nav-item" onClick={() => navigate("/")}>
        <img src="/assets/icons/bubble-b.png" alt="Pet" className="bubble-icon" />
        <span>Pet</span>
      </div>
      <div className="nav-item" onClick={() => navigate("/explore")}>
        <img src="/assets/icons/bubble-y.png" alt="Explore" className="bubble-icon" />
        <span>Explore</span>
      </div>
      <div className="nav-item" onClick={() => navigate("/play")}>
        <img src="/assets/icons/bubble-p.png" alt="Play" className="bubble-icon" />
        <span>Play</span>
      </div>
    </nav>
  );
}
