// src/pages/Sunnybrook/SBFurniture.tsx
import { useNavigate } from "react-router-dom";

export default function SBFurniture() {
  const navigate = useNavigate();
  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => navigate(-1)}>← Back</button>
      <h1>FUrniture</h1>
      <p>Coming Soon</p>
    </div>
  );
}