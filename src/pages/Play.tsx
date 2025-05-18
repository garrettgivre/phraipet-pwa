import type { Pet } from "../types";

interface PlayProps {
  pet: Pet | null;
}

export default function Play({ pet }: PlayProps) {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div style={{ textAlign: "center", paddingTop: "80px" }}>
      <h1>Welcome to the Play Page!</h1>
      <p>Fun stuff goes here!</p>
      <button 
        onClick={handleRefresh}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          marginTop: "20px"
        }}
      >
        Refresh App
      </button>
    </div>
  );
}
