/* src/pages/Sunnybrook.css */
.sunnybrook-page {
  width: 100%;
  height: 100%; 
  display: flex;
  flex-direction: column;
  align-items: center; 
  justify-content: center; 
  background-color: #d4f0c7; /* A pleasant light green for Sunnybrook */
  /* If Sunnybrook map is smaller than viewport and centered, overflow:hidden is fine.
     If Sunnybrook map can be larger and scrollable, use overflow:auto.
     For now, assuming it fits or is centered with overflow hidden on this page.
  */
  overflow: hidden; 
  box-sizing: border-box;
}

/* This class is used by Sunnybrook.tsx for its map content area */
.sunnybrook-page .map-scrollable-content { 
  position: relative; 
  /* Width and height are set by inline styles in Sunnybrook.tsx */
  /* background-repeat, background-size, background-position are set by inline styles */
  background-color: #c0e0b8; /* Fallback background for the map area itself */
  box-shadow: 0 0 10px rgba(0,0,0,0.1); /* Optional: subtle shadow for the map area */
  /* Ensure it doesn't exceed parent if parent is smaller and not scrolling */
  max-width: 100%;
  max-height: 100%;
}


.sunnybrook-status-message { 
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #333; 
  font-size: 1.2em;
  text-align: center;
  padding: 20px;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  position: absolute; 
  top: 0;
  left: 0;
  background-color: rgba(230, 255, 230, 0.9); 
  z-index: 200;
}

.sunnybrook-loading {
  /* No specific styles needed if generic status message is fine */
}

.sunnybrook-error {
  color: #a04040;
}
