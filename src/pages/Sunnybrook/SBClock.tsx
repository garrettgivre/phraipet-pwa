import { useNavigate } from "react-router-dom";
import "./BuildingPage.css";

export default function SBClock() {
  const navigate = useNavigate();

  return (
    <div className="building-page">
      <header className="building-header">
        <button className="back" onClick={() => navigate(-1)}>← Back</button>
        <h1>Town Clock</h1>
      </header>
      <div className="building-image-wrapper">
        <img
          src="/locations/sbclock-horizontal.png"
          alt="Town Clock Tower"
          className="building-image"
        />
      </div>
      <div className="building-content">
        <p>
          Standing tall in the center of Sunnybrook, the clock tower chimes every hour,
          keeping all villagers on schedule. Its masonry is said to be enchanted
          to never crumble, even in the harshest storms.
        </p>
      </div>
    </div>
  );
}
