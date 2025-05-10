// src/pages/Sunnybrook/SBClock.tsx
import { useNavigate } from "react-router-dom";

export default function SBClock() {
  const navigate = useNavigate();
  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => navigate(-1)}>← Back</button>
      <h1>The clock</h1>
      <p>Tik Tok</p>
    </div>
  );
}