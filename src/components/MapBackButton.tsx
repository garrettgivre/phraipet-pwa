import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from '../contexts/ThemeContext';

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
  const navigate = useNavigate();
  const { hueRotation } = useTheme();

  const handleClick = (): void => {
    if (import.meta.env.DEV) console.log(`Navigating to ${destination}`);
    void navigate(destination);
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
        filter: `hue-rotate(${hueRotation}deg)`,
        ...positionStyle
      }}
      title="Back to Map"
    />
  );
};

export default MapBackButton;
