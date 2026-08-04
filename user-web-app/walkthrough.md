# Walkthrough - Inactivity Auto-Logout & Cross-Tab Activity Synchronization

We have implemented **Cross-Tab Activity Synchronization** across both `user-web-app` and `admin-web-app` so user interactions across multiple tabs of the app keep all open sessions active, while remaining idle for 2 minutes logs out the user cleanly across all tabs.

---

## 0. Cross-Tab Activity Synchronization Architecture

- **`localStorage` Timestamp Tracking ([user-web-app App.js](file:///c:/Users/axxonet/Desktop/videoStreeming/user-web-app/src/App.js) & [admin-web-app App.js](file:///c:/Users/axxonet/Desktop/videoStreeming/admin-web-app/src/App.js))**:
  - Whenever user interaction (`mousemove`, `mousedown`, `keydown`, `scroll`, `click`, `touchstart`) occurs in **any open tab** of our app:
    - Updates `localStorage.setItem('lastUserActivity', Date.now())`.
  - All open tabs listen for browser `storage` events.
  - When `lastUserActivity` changes, every open tab calculates the remaining inactivity duration and reschedules its auto-logout timer accordingly.

- **Different Tabs / External Web Browsing Behavior**:
  - If you switch away to a different website (e.g. YouTube, Google, or another application) for 2 minutes:
    - Browser security isolates event tracking to active tabs only.
    - Because no activity is logged to `lastUserActivity` for 2 minutes, our background timer auto-logs out the user and redirects to `/login` with the session expiration popup alert.

---

## 1. Verification & Compilation Results

- Both frontend dev servers compiled clean with **0 errors**:
  - `user-web-app` running on `http://localhost:3001`
  - `admin-web-app` running on `http://localhost:3002`
- Verified interacting with Tab A updates `lastUserActivity` and extends session life for Tab B automatically.
