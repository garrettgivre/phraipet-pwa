// Copy and paste this entire script into your browser's console while on the app

// Function to add items and fix needs
async function addItemsAndFixNeeds() {
  try {
    // Get Firebase database reference
    const db = window.firebase.database();
    
    // Get current inventory
    const inventoryRef = db.ref("inventory");
    const inventorySnapshot = await inventoryRef.get();
    const currentInventory = inventorySnapshot.val() || [];

    // Get all toys and grooming items from the app's context
    const toyItems = window.defaultToyItems || [];
    const groomingItems = window.defaultGroomingItems || [];

    // Add all toys and grooming items
    const newInventory = [
      ...currentInventory,
      ...toyItems,
      ...groomingItems
    ];

    // Update inventory
    await inventoryRef.set(newInventory);
    console.log("Added all toys and grooming items to inventory");

    // Set pet needs to good levels
    const petRef = db.ref("pets/sharedPet");
    const petSnapshot = await petRef.get();
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

    await petRef.set(updatedPet);
    console.log("Set all pet needs to good levels");

    console.log("Successfully completed all updates!");
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the function
addItemsAndFixNeeds(); 