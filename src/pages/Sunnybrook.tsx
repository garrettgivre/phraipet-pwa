import { useNavigate } from "react-router-dom";
import "./Sunnybrook.css";


export default function Sunnybrook() {
  const navigate = useNavigate();

  return (
    <div className="sunnybrook-container">
      <header className="sunnybrook-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1>Sunnybrook</h1>
      </header>
      <div className="sunnybrook-image-wrapper">
        <img
          src="/locations/sunnybrook-vertical.png"
          alt="Sunnybrook Village"
          className="sunnybrook-image"
        />
      </div>
    </div>
  );
}
