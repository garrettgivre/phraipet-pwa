import BackButton from '../components/BackButton';

export default function Bank() {
  return (
    <div className="bank-page" style={{ 
      padding: '20px', 
      textAlign: 'center', 
      paddingTop: '60px', // Clear fixed header
      minHeight: '100vh',
      background: 'var(--background-color, #f0f0f0)'
    }}>
      <BackButton />
      <h1>PhraiBank</h1>
      <div style={{ 
        background: 'white', 
        padding: '30px', 
        borderRadius: '20px',
        margin: '20px auto',
        maxWidth: '400px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
      }}>
        <p>Welcome to the PhraiBank!</p>
        <p>Features coming soon:</p>
        <ul style={{ textAlign: 'left', margin: '20px auto', display: 'inline-block' }}>
          <li>Currency Exchange</li>
          <li>Savings Account</li>
          <li>Daily Rewards</li>
        </ul>
      </div>
    </div>
  );
}

