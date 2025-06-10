# 🔐 Firebase Security Rules Setup

## ⚠️ URGENT: Your Firebase Realtime Database access is expiring!

Your database is currently in "Test Mode" which is completely open to the internet. This is a security risk and Firebase will block access soon.

## 🛠️ How to Fix This

### Step 1: Go to Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your **phraipet** project
3. Go to **Realtime Database** in the left sidebar
4. Click on the **Rules** tab

### Step 2: Replace the Current Rules
You'll see something like this (TEST MODE - INSECURE):
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

### Step 3: Copy and Paste These SECURE Rules
Replace the existing rules with these secure ones:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    
    "pets": {
      "sharedPet": {
        ".read": "auth != null",
        ".write": "auth != null",
        ".validate": "newData.hasChildren(['id', 'name', 'hunger', 'happiness', 'cleanliness', 'affection', 'spirit'])"
      }
    },
    
    "roomLayers": {
      "sharedRoom": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    
    "playerStats": {
      ".read": "auth != null",
      ".write": "auth != null",
      "coins": {
        ".validate": "newData.isNumber() && newData.val() >= 0"
      }
    },
    
    "decorations": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    
    "inventory": {
      ".read": "auth != null", 
      ".write": "auth != null"
    },
    
    "stores": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

### Step 4: Publish the Rules
1. Click **Publish** button
2. You should see "Rules published successfully"

## 🔒 What These Rules Do

### Security Features:
- ✅ **Authentication Required** - Only signed-in users can access data
- ✅ **Anonymous Auth Supported** - Your app uses anonymous authentication, which works with these rules
- ✅ **Data Validation** - Ensures pet data has required fields
- ✅ **Coin Validation** - Prevents negative coin values
- ✅ **Path-Specific Rules** - Each data type has appropriate permissions

### Why This is Safe:
- Your app automatically signs in users anonymously (`signInAnonymously()` in firebase.ts)
- Only authenticated users can read/write data
- No more "completely open to the internet" vulnerability
- Blocks malicious access while allowing your app to function normally

## 🧪 Test the Rules

After publishing, test your app:
1. Refresh your PWA
2. Check that pet data loads
3. Try feeding the pet, decorating the room, etc.
4. Everything should work exactly the same, but now securely!

## ❓ Troubleshooting

If you see permission errors after updating rules:
1. Make sure anonymous authentication is enabled in Firebase Console
2. Check that your app is calling `signInAnonymously()` (it already does in `src/firebase.ts`)
3. Clear browser cache and reload

## 🎉 Success!
Once these rules are published, your database will be secure and the expiration warning will disappear! 