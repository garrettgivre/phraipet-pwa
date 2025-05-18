import React from 'react';
import MapBackButton from "../../components/MapBackButton";
import "./BuildingPage.css";

interface BuildingTemplateProps {
  title: string;
  imagePath: string;
  altText?: string;
  children?: React.ReactNode;
}

/**
 * A template component for all Sunnybrook building pages
 */
const BuildingTemplate: React.FC<BuildingTemplateProps> = ({
  title,
  imagePath,
  altText,
  children
}) => {
  return (
    <div className="building-page">
      <header className="building-header">
        <h1>{title}</h1>
      </header>
      <div className="building-image-wrapper">
        <img
          src={imagePath}
          alt={altText || title}
          className="building-image"
        />
      </div>
      <div className="building-content">
        {children}
      </div>
      
      <MapBackButton 
        destination="/sunnybrook" 
        size={45} 
        position={{ left: 15, bottom: 110 }}
      />
    </div>
  );
};

export default BuildingTemplate;
