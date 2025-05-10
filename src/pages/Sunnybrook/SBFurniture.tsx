import { useNavigate } from "react-router-dom";
import "./BuildingPage.css";

export default function SBFurniture() {
  const navigate = useNavigate();

  return (
    <div className="building-page">
      <header className="building-header">
        <button className="back" onClick={() => navigate(-1)}>← Back</button>
        <h1>Furniture Store</h1>
      </header>
      <div className="building-image-wrapper">
        <img
          src="/locations/sbfurniture-horizontal.png"
          alt="Furniture Store"
          className="building-image"
        />
      </div>
      <div className="building-content">
        <p>
          Chair
      </div>
    </div>
  );
}
