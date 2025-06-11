# Temporary Firebase Security Rules

Since Firebase Authentication is not working (`auth/configuration-not-found`), you need to temporarily use more permissive rules.

## Go to Firebase Console > Realtime Database > Rules

Replace the current rules with these **TEMPORARY** permissive rules:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

⚠️ **WARNING**: These rules allow anyone to read/write your database. Use only temporarily for testing.

## Proper Rules (use when Auth is fixed):

```json
{
  "rules": {
    "pets": {
      "sharedPet": {
        ".read": true,
        ".write": "auth != null"
      }
    },
    "roomLayers": {
      "sharedRoom": {
        ".read": true,
        ".write": "auth != null"
      }
    },
    "playerStats": {
      "coins": {
        ".read": true,
        ".write": "auth != null"
      }
    },
    "decorations": {
      ".read": true,
      ".write": "auth != null"
    },
    "inventory": {
      ".read": true,
      ".write": "auth != null"
    },
    "stores": {
      ".read": true,
      ".write": "auth != null"
    }
  }
}
```

## Steps to Fix:

1. **Immediate Fix**: Use the permissive rules above
2. **Enable Firebase Auth**: Go to Firebase Console > Authentication > Get Started
3. **Enable Anonymous Auth**: Authentication > Sign-in method > Anonymous > Enable
4. **Restore Secure Rules**: Replace with the proper rules above

This will fix the "items disappearing on refresh" issue immediately. 