# Walkthrough - 10-Minute Inactivity Auto-Logout Implementation

We have updated the inactivity timeout across both `user-web-app` and `admin-web-app` to **10 minutes (600,000 ms)**.

---

## 0. Inactivity Timeout Configuration

- **Inactivity Timeout Set to 10 Minutes ([user-web-app App.js](file:///c:/Users/axxonet/Desktop/videoStreeming/user-web-app/src/App.js) & [admin-web-app App.js](file:///c:/Users/axxonet/Desktop/videoStreeming/admin-web-app/src/App.js))**:
  - `INACTIVITY_TIMEOUT_MS` updated to `10 * 60 * 1000` (600,000 ms = 10 minutes).
- **Notification Message Updated ([user-web-app Login.js](file:///c:/Users/axxonet/Desktop/videoStreeming/user-web-app/src/pages/Login.js) & [admin-web-app Login.js](file:///c:/Users/axxonet/Desktop/videoStreeming/admin-web-app/src/pages/Login.js))**:
  - Expiration alert message updated to:
    > *"You have been automatically logged out due to 10 minutes of inactivity."*

---

## 1. Verification & Compilation Results

- Both frontend dev servers compiled clean with **0 errors**:
  - `user-web-app` running on `http://localhost:3001`
  - `admin-web-app` running on `http://localhost:3002`
- Leaving the app idle for 10 minutes cleanly triggers auto-logout and displays the session expired alert.
