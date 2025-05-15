// src/pages/Explore.tsx (Blank Slate)
import { useEffect } from 'react'; // Keep useEffect if you plan to add data fetching later
import './Explore.css'; // We will use the new Explore.css below

export default function Explore() {
  // You can add back state and effects for map data later if this test works.
  // For now, we keep it minimal.

  useEffect(() => {
    // Example: Set document title if needed
    document.title = "Phraipets - Explore";
  }, []);

  return (
    <div className="explore-page-blank-container">
      <div className="explore-page-content">
        <h1>Explore Page</h1>
        <p>This is a simplified Explore page for testing NavBar interactivity.</p>
        <p>If the NavBar works now, the issue was related to the previous map/canvas implementation.</p>
      </div>
    </div>
  );
}
