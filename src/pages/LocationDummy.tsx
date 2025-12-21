import { useParams, useNavigate } from 'react-router-dom';

export default function LocationDummy() {
  const { locationId } = useParams();
  const navigate = useNavigate();

  const formatName = (id: string | undefined) => {
    if (!id) return 'Unknown Location';
    return id
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div style={{ 
      padding: '20px', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      background: '#f0f0f0'
    }}>
      <h1>{formatName(locationId)}</h1>
      <p>This location is coming soon!</p>
      <button 
        onClick={() => navigate('/explore')}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer',
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '5px'
        }}
      >
        Back to Map
      </button>
    </div>
  );
}










