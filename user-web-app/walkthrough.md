# Walkthrough - 2-Minute Inactivity Auto-Logout (Testing)

We have temporarily updated the inactivity timeout across both `user-web-app` and `admin-web-app` from 10 minutes to **2 minutes (120,000 ms)** to facilitate rapid testing and verification of the auto-logout mechanism.

---

## 0. Testing Configuration Changes

- **Inactivity Timeout Reduced ([user-web-app App.js](file:///c:/Users/axxonet/Desktop/videoStreeming/user-web-app/src/App.js) & [admin-web-app App.js](file:///c:/Users/axxonet/Desktop/videoStreeming/admin-web-app/src/App.js))**:
  - `INACTIVITY_TIMEOUT_MS` updated to `2 * 60 * 1000` (120,000 ms = 2 minutes).
- **Notification Message Updated ([user-web-app Login.js](file:///c:/Users/axxonet/Desktop/videoStreeming/user-web-app/src/pages/Login.js) & [admin-web-app Login.js](file:///c:/Users/axxonet/Desktop/videoStreeming/admin-web-app/src/pages/Login.js))**:
  - Expiration alert message updated to:
    > *"You have been automatically logged out due to 2 minutes of inactivity."*

---

## 1. Verification & Compilation Results

- Both frontend dev servers compiled clean with **0 errors**:
  - `user-web-app` running on `http://localhost:3001`
  - `admin-web-app` running on `http://localhost:3002`
- Leaving the app idle for 2 minutes cleanly triggers auto-logout and displays the session expired alert.
