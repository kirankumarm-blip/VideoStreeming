# Walkthrough - User Forgot Password & Reset Password Flow

We have enabled the **Forgot Password** link on the `user-web-app` login page and created a seamless **Reset Password** page flow with backend API integration (`/vdauth/forgot-password` and `/vdauth/reset-password`), password encryption, show/hide password toggles, and dedicated client-side routes.

---

## 0. User Forgot Password & Reset Password Features

- **Login Page Link ([Login.js](file:///c:/Users/axxonet/Desktop/videoStreeming/user-web-app/src/pages/Login.js))**:
  - Added a clickable **"Forgot Password?"** link on the login screen alongside the "Remember me" checkbox.
  - Clicking "Forgot Password?" transitions the view to the **Forgot Password** screen (`authMode = 'forgot'`).
- **Forgot Password Form**:
  - Accepts user email address and submits request to `api.auth.forgotPassword(email)` (`/vdauth/forgot-password` with `formstep: 'forgotPassword'`).
  - Displays a custom success overlay modal popup stating *"Reset instructions sent successfully to your email. Please check your inbox."* and automatically navigates to the **Reset Password** screen (`authMode = 'reset'`).
- **Reset Password Page**:
  - Contains fields for **Email Address**, **Reset Token**, **New Password**, and **Confirm New Password**.
  - Added show/hide password toggle buttons for both password fields.
  - Submits payload to `api.auth.resetPassword(email, resetToken, newPassword)` (`/vdauth/reset-password` with `formstep: 'resetPassword'`).
  - Validates password length (minimum 6 characters) and matching confirmation password; shows custom modal error popup if invalid.
  - Displays custom success overlay modal popup stating *"Password reset successfully. Please login with your new password."* and transitions back to the Login screen.
- **Dedicated Route Support ([App.js](file:///c:/Users/axxonet/Desktop/videoStreeming/user-web-app/src/App.js))**:
  - Registered `/forgot-password` and `/reset-password` routes so direct URL navigation (`/#/forgot-password` or `/#/reset-password`) automatically opens the appropriate auth screen.
- **Backend Mock Handlers ([server.js](file:///c:/Users/axxonet/Desktop/videoStreeming/backend-mock/server.js))**:
  - Added mock endpoints `/api/auth/forgot-password`, `/vdauth/forgot-password`, `/api/auth/reset-password`, and `/vdauth/reset-password`.

---

## 1. Verification & Compilation Results

- Both frontend dev servers compiled clean with **0 errors**:
  - `user-web-app` running on `http://localhost:3001`
  - `admin-web-app` running on `http://localhost:3002`
- Verified clicking "Forgot Password?" opens the reset request view, sending reset requests transitions to the Reset Password page, and resetting password completes with success modal popups.
