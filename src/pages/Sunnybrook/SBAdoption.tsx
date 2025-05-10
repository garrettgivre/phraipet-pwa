import { useNavigate } from "react-router-dom";
import "./BuildingPage.css";

export default function SBAdoptionck() {
  const navigate = useNavigate();

  return (
    <div className="building-page">
      <header className="building-header">
        <button className="back" onClick={() => navigate(-1)}>← Back</button>
        <h1>Adoption Center</h1>
      </header>
      <div className="building-image-wrapper">
        <img
          src="/locations/sbadoption-horizontal.png"
          alt="Adoption Agency"
          className="building-image"
        />
      </div>
      <div className="building-content">
        <p>
          All out
        </p>
      </div>
    </div>
  );
}
