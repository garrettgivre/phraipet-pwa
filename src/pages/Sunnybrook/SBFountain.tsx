// src/pages/Sunnybrook/SBFountain.tsx
import { useNavigate } from "react-router-dom";

export default function SBFountain() {
  const navigate = useNavigate();
  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => navigate(-1)}>← Back</button>
      <h1>Fountain</h1>
      <p>Penny</p>
    </div>
  );
}