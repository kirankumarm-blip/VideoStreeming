# Walkthrough - 10-Minute Inactivity Auto-Logout Implementation

We have added a global **10-minute inactivity auto-logout** listener across both `user-web-app` and `admin-web-app` to automatically log out users who have not interacted with the application for at least 10 minutes.

---

## 0. Inactivity Auto-Logout Features

- **Activity Event Listener ([user-web-app App.js](file:///c:/Users/axxonet/Desktop/videoStreeming/user-web-app/src/App.js) & [admin-web-app App.js](file:///c:/Users/axxonet/Desktop/videoStreeming/admin-web-app/src/App.js))**:
  - Monitors real-time user interaction events across the window:
    - `mousemove`
    - `mousedown`
    - `keydown`
    - `scroll`
    - `touchstart`
    - `click`
  - Throttles event handling (1-second minimum delta) to optimize performance.
  - Automatically resets a **10-minute (600,000 ms)** inactivity timer whenever user interaction is detected.

- **Auto-Logout Execution**:
  - If no interaction occurs for at least 10 minutes:
    - Executes `api.auth.logout()` to clear access tokens, refresh tokens, and session user objects.
    - Sets a `sessionStorage` flag (`inactivityLoggedOut = 'true'`).
    - Redirects the browser window to `/login`.

- **Login Screen Notification ([Login.js](file:///c:/Users/axxonet/Desktop/videoStreeming/user-web-app/src/pages/Login.js))**:
  - When redirected to the login screen after inactivity, automatically displays a custom modal overlay alert:
    > *"You have been automatically logged out due to 10 minutes of inactivity."*

---

## 1. Verification & Compilation Results

- Both frontend dev servers compiled clean with **0 errors**:
  - `user-web-app` running on `http://localhost:3001`
  - `admin-web-app` running on `http://localhost:3002`
- Verified interaction resets the inactivity timer, and 10 minutes of complete inactivity triggers auto-logout and redirects to `/login` with custom popup notification.
