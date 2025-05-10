// src/pages/Sunnybrook/SBMart.tsx
import { useNavigate } from "react-router-dom";

export default function SBMart() {
  const navigate = useNavigate();
  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => navigate(-1)}>← Back</button>
      <h1>Mart</h1>
      <p>Groceries</p>
    </div>
  );
}