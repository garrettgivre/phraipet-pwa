import { db } from "../../firebase";
import { ref, set, get } from "firebase/database";
import { defaultToyItems, defaultGroomingItems } from "../../contexts/InventoryContext";

async function addItemsAndFixNeeds() {
  try {
    // Get current inventory
    const inventoryRef = ref(db, "inventory");
    const inventorySnapshot = await get(inventoryRef);
    const currentInventory = inventorySnapshot.val() || [];

    // Add all toys and grooming items
    const newInventory = [
      ...currentInventory,
      ...defaultToyItems,
      ...defaultGroomingItems
    ];

    // Update inventory
    await set(inventoryRef, newInventory);
    console.log("Added all toys and grooming items to inventory");

    // Set pet needs to good levels
    const petRef = ref(db, "pets/sharedPet");
    const petSnapshot = await get(petRef);
    const currentPet = petSnapshot.val() || {};

    const updatedPet = {
      ...currentPet,
      hunger: 100,
      happiness: 100,
      cleanliness: 100,
      affection: 100,
      spirit: 100,
      lastNeedsUpdateTime: Date.now()
    };

    await set(petRef, updatedPet);
    console.log("Set all pet needs to good levels");

    console.log("Successfully completed all updates!");
  } catch (error) {
    console.error("Error:", error);
  }
}

addItemsAndFixNeeds(); 