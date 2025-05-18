import { ref, set } from 'firebase/database';
import { db } from '../firebase';

const setCoins = async () => {
  try {
    const coinsRef = ref(db, 'playerStats/coins');
    await set(coinsRef, 10000);
    console.log('Successfully set coins to 10,000');
  } catch (error) {
    console.error('Error setting coins:', error);
  }
};

setCoins(); 