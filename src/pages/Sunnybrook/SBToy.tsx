import { useNavigate } from "react-router-dom";
import "./BuildingPage.css";

export default function SBToy() {
  const navigate = useNavigate();

  return (
    <div className="building-page">
      <header className="building-header">
        <button className="back" onClick={() => navigate(-1)}>← Back</button>
        <h1>Toys</h1>
      </header>
      <div className="building-image-wrapper">
        <img
          src="/locations/sbtoy-horizontal.png"
          alt="Toy Store"
          className="building-image"
        />
      </div>
      <div className="building-content">
        <p>
          Noot
        </p>
      </div>
    </div>
  );
}
