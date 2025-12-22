import { useState } from 'react';
import { useDecoration } from '../contexts/DecorationContext';
import type { RoomId } from '../types';
import './RoomNavigator.css';

const ROOM_NAMES: Record<RoomId, string> = {
  "living-room": "Living Room",
  "bathroom": "Bathroom",
  "bedroom": "Bedroom",
  "study": "Study",
  "backyard": "Backyard",
  "frontyard": "Frontyard",
  "dining-room": "Dining Room",
  "kitchen": "Kitchen"
};

const ROOM_ICONS: Record<RoomId, string> = {
  "living-room": "/assets/icons/livingroom.png",
  "bathroom": "/assets/icons/bathroom.png",
  "bedroom": "/assets/icons/bedroom.png",
  "study": "/assets/icons/study.png",
  "backyard": "/assets/icons/backyard.png",
  "frontyard": "/assets/icons/frontyard.png",
  "dining-room": "/assets/icons/diningroom.png",
  "kitchen": "/assets/icons/kitchen.png"
};

interface RoomNavigatorProps {
  isDecorStudio?: boolean;
}

export default function RoomNavigator({ isDecorStudio = false }: RoomNavigatorProps) {
  const { currentRoomId, setCurrentRoomId } = useDecoration();
  const [isOpen, setIsOpen] = useState(false);

  const allRooms: RoomId[] = [
    "bedroom", "bathroom", "study",
    "living-room", "dining-room", "kitchen",
    "frontyard", "backyard"
  ];

  const handleRoomSelect = (roomId: RoomId) => {
    setCurrentRoomId(roomId);
    setIsOpen(false);
  };

  const renderRoomTab = (roomId: RoomId) => (
    <button
      key={roomId}
      className={`room-tab ${currentRoomId === roomId ? 'active' : ''}`}
      onClick={() => handleRoomSelect(roomId)}
      title={ROOM_NAMES[roomId]}
    >
      <div className="room-tab-icon">
        <img src={ROOM_ICONS[roomId]} alt={ROOM_NAMES[roomId]} />
      </div>
    </button>
  );

  return (
    <div className={`room-navigator-overlay ${isOpen ? 'open' : ''} ${isDecorStudio ? 'in-decor-studio' : ''}`}>
      <button 
        className="room-menu-trigger" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Room Menu"
      >
        <div className="trigger-content">
          <div className="current-room-icon">
            <img src={ROOM_ICONS[currentRoomId]} alt={ROOM_NAMES[currentRoomId]} />
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="room-dropdown-menu">
          <div className="house-grid">
            {allRooms.map(renderRoomTab)}
          </div>
        </div>
      )}
      
      {isOpen && <div className="menu-backdrop" onClick={() => setIsOpen(false)} />}
    </div>
  );
}
