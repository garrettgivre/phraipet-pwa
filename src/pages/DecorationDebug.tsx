import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDecoration } from '../contexts/DecorationContext';
import { useInventory } from '../contexts/InventoryContext';

export default function DecorationDebug() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [contextData, setContextData] = useState<Record<string, any>>({});
  
  // Wrap the context hooks in try/catch to catch any errors
  useEffect(() => {
    try {
      // Try to get decoration context
      const decorationContext = useDecoration();
      
      // If we get here, the context worked
      setContextData((prev: Record<string, any>) => ({
        ...prev,
        decorationContext: {
          roomLayersLoading: decorationContext.roomLayersLoading,
          hasRoomLayers: !!decorationContext.roomLayers,
          decorationCount: decorationContext.decorations.length,
        }
      }));
    } catch (err) {
      setError(`Decoration Context Error: ${err instanceof Error ? err.message : String(err)}`);
    }
    
    try {
      // Try to get inventory context
      const inventoryContext = useInventory();
      
      // If we get here, the inventory context worked
      setContextData((prev: Record<string, any>) => ({
        ...prev,
        inventoryContext: {
          itemCount: inventoryContext.items.length
        }
      }));
    } catch (err) {
      setError((prev: string | null) => 
        `${prev ? prev + '\n' : ''}Inventory Context Error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }, []);
  
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Debug Page</h1>
      
      {error ? (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#ffdddd', 
          border: '1px solid #ff0000',
          borderRadius: '4px',
          whiteSpace: 'pre-line'
        }}>
          <h2>Error:</h2>
          {error}
        </div>
      ) : (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#ddffdd', 
          border: '1px solid #00ff00',
          borderRadius: '4px' 
        }}>
          <h2>Contexts Loaded Successfully:</h2>
          <pre>{JSON.stringify(contextData, null, 2)}</pre>
        </div>
      )}
      
      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={() => navigate('/')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4285f4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Go to Home
        </button>
        
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#34a853',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reload Page
        </button>
      </div>
    </div>
  );
} 