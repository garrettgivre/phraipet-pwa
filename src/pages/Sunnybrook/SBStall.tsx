// src/pages/Sunnybrook/SBStall.tsx
import { useNavigate } from "react-router-dom";

export default function SBStall() {
  const navigate = useNavigate();
  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => navigate(-1)}>← Back</button>
      <h1>Clinic</h1>
      <p>Get Better</p>
    </div>
  );
}