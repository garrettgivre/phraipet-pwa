import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from '../contexts/ThemeContext';

interface BackButtonProps {
  size?: number;        // Size in pixels
  position?: {          // Position from edges
    left?: number;
    right?: number; 
    top?: number;
    bottom?: number;
  };
}

/**
 * A reusable back button component that uses the browser history to go back
 */
const BackButton: React.FC<BackButtonProps> = ({
  size = 40,
  position = { left: 15, bottom: 85 } // Position above navbar but below tabs
}) => {
  const navigate = useNavigate();
  const { hueRotation } = useTheme();

  const handleClick = (): void => {
    void navigate(-1); // Go back one page in history
  };

  // Compute position style based on provided position props
  const positionStyle: React.CSSProperties = {};
  if (position.left !== undefined) positionStyle.left = `${position.left}px`;
  if (position.right !== undefined) positionStyle.right = `${position.right}px`;
  if (position.top !== undefined) positionStyle.top = `${position.top}px`;
  if (position.bottom !== undefined) positionStyle.bottom = `${position.bottom}px`;

  return (
    <div
      className="standard-back-button"
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
        zIndex: 100,
        filter: `hue-rotate(${hueRotation}deg)`,
        ...positionStyle
      }}
      title="Go Back"
    />
  );
};

export default BackButton;
