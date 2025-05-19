import React from 'react';
import type { NeedInfo } from '../types';

interface HeaderProps {
  needs: NeedInfo[];
}

const Header: React.FC<HeaderProps> = ({ needs }) => {
  return (
    <header className="header">
      <div className="needs-container">
        {needs.map((n) => (
          <div key={n.name} className="need-circle" title={`${n.name}: ${n.desc} (${n.value})`}>
            <div className="need-icon">
              <img
                src={n.iconSrc}
                alt={n.name}
                className="need-icon-img"
              />
            </div>
            <div className="need-value">{n.value}</div>
          </div>
        ))}
      </div>
    </header>
  );
};

export default Header; 