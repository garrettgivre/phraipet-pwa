import { useNavigate } from "react-router-dom";
import "./BuildingPage.css";

export default function SBMart() {
  const navigate = useNavigate();

  return (
    <div className="building-page">
      <header className="building-header">
        <button className="back" onClick={() => navigate(-1)}>← Back</button>
        <h1>Supermarket</h1>
      </header>
      <div className="building-image-wrapper">
        <img
          src="/locations/sbclock-horizontal.png"
          alt="Market"
          className="building-image"
        />
      </div>
      <div className="building-content">
        <p>
          Penny
        </p>
      </div>
    </div>
  );
}
