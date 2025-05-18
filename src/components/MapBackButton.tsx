import React from "react";

interface MapBackButtonProps {
  destination?: string; // Where to navigate to
  size?: number;        // Size in pixels
  position?: {          // Position from edges
    left?: number;
    right?: number; 
    top?: number;
    bottom?: number;
  };
}

/**
 * A reusable back button component that appears on map pages
 */
const MapBackButton: React.FC<MapBackButtonProps> = ({
  destination = "/explore",
  size = 50,
  position = { left: 20, bottom: 20 }
}) => {
  const handleClick = () => {
    console.log(`Navigating to ${destination}`);
    window.location.href = destination;
  };

  // Compute position style based on provided position props
  const positionStyle: React.CSSProperties = {};
  if (position.left !== undefined) positionStyle.left = `${position.left}px`;
  if (position.right !== undefined) positionStyle.right = `${position.right}px`;
  if (position.top !== undefined) positionStyle.top = `${position.top}px`;
  if (position.bottom !== undefined) positionStyle.bottom = `${position.bottom}px`;

  return (
    <div
      className="map-back-button"
      onClick={handleClick}
      style={{
        position: 'fixed',
        width: `${size}px`,
        height: `${size}px`,
        backgroundImage: 'url(/assets/icons/backbutton.png)',
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        cursor: 'pointer',
        zIndex: 9999,
        filter: 'drop-shadow(0px 0px 3px rgba(0,0,0,0.7))',
        ...positionStyle
      }}
      title="Back to Map"
    />
  );
};

export default MapBackButton; 