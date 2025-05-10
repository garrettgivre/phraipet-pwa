import { useNavigate } from "react-router-dom";
import "./Sunnybrook.css";

export default function Sunnybrook() {
  const navigate = useNavigate();

  return (
    <div className="sunnybrook-container" onClick={() => navigate(-1)}>
      <img
        src="/locations/sunnybrook-vertical.png"
        alt="Sunnybrook Village"
        className="sunnybrook-image"
      />
    </div>
  );
}
