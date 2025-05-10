import { useNavigate } from "react-router-dom";
import "./BuildingPage.css";

export default function SBClinic() {
  const navigate = useNavigate();

  return (
    <div className="building-page">
      <header className="building-header">
        <button className="back" onClick={() => navigate(-1)}>← Back</button>
        <h1>Clinic</h1>
      </header>
      <div className="building-image-wrapper">
        <img
          src="/locations/sbclinic-horizontal.png"
          alt="Clinic"
          className="building-image"
        />
      </div>
      <div className="building-content">
        <p>
          Health
        </p>
      </div>
    </div>
  );
}
