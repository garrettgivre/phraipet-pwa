// src/pages/Sunnybrook/SBFurniture.tsx
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
          alt="Sunnybrook Furniture Store"
          className="building-image"
        />
      </div>
      <div className="building-content">
        <p>
          Step inside Sunnybrook’s Furniture Store, where each handcrafted piece
          is imbued with local charm and sturdy craftsmanship. From cozy armchairs
          to elegant dining sets, you’ll find something to suit every home.
        </p>  {/* <-- Closing tag added here */}
      </div>
    </div>
  );
}
