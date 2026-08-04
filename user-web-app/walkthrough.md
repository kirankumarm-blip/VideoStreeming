# Walkthrough - User Forgot Password Unified 3-Field Form & Reset API Integration

We have updated the **Forgot Password** screen in `user-web-app` to feature a unified 3-field form (**Email Address**, **New Password**, and **Confirm New Password**), show/hide password toggle icons inside textfields, password matching validation matching `Signup.js`, a **Submit** button, and direct `api.auth.resetPassword` API integration.

---

## 0. User Forgot Password Refactoring

- **3-Field Form Layout ([Login.js](file:///c:/Users/axxonet/Desktop/videoStreeming/user-web-app/src/pages/Login.js))**:
  - **Email Address** field
  - **New Password** field with show/hide eye toggle button inside the textfield (same SVG icon style as Login page)
  - **Confirm New Password** field with show/hide eye toggle button inside the textfield
- **Validation**:
  - Validates `newPassword === confirmPassword`. If passwords do not match, displays the custom modal popup alert: `showError('Passwords do not match')`.
  - Validates minimum password length (6 characters); displays `showError('Password must be at least 6 characters long')` if invalid.
- **Button & Loading State**:
  - Button text set to **Submit**.
  - Displays a custom rotating loading spinner and text `Submitting...` while the API request is pending.
- **API Call & Payload ([api.js](file:///c:/Users/axxonet/Desktop/videoStreeming/user-web-app/src/services/api.js))**:
  - Clicking **Submit** calls `api.auth.resetPassword(email, newPassword)` (`/vdauth/reset-password` endpoint).
  - Sends payload containing:
    ```json
    {
      "email": "user@example.com",
      "password": "<encrypted_password>",
      "newPassword": "<encrypted_password>",
      "formstep": "resetPassword"
    }
    ```
  - On 200 OK success, displays custom modal popup stating *"Password reset successfully. Please login with your new password."* and transitions back to the Login screen.

---

## 1. Verification & Compilation Results

- Both frontend dev servers compiled clean with **0 errors**:
  - `user-web-app` running on `http://localhost:3001`
  - `admin-web-app` running on `http://localhost:3002`
- Verified entering mismatched passwords triggers the error modal, and valid submission calls `api.auth.resetPassword` with `email` & `password` payload.
