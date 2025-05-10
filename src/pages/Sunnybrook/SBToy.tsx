// src/pages/Sunnybrook/SBAdoption.tsx
import { useNavigate } from "react-router-dom";

export default function SBToy() {
  const navigate = useNavigate();
  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => navigate(-1)}>← Back</button>
      <h1>Toys</h1>
      <p>Noot Noot</p>
    </div>
  );
}