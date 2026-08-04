# Walkthrough - User Forgot Password FormStep Update (`vdresetPassword`)

We have updated the `resetPassword` API payload in `user-web-app` so that `formstep` (and `formStep`) is explicitly set to `'vdresetPassword'`.

---

## 0. Reset Password FormStep Payload Change

- **API Method Update ([api.js](file:///c:/Users/axxonet/Desktop/videoStreeming/user-web-app/src/services/api.js))**:
  - Updated `api.auth.resetPassword` to send `formstep: 'vdresetPassword'` and `formStep: 'vdresetPassword'` in the request body payload.
  - Full request payload sent to `/vdauth/reset-password`:
    ```json
    {
      "email": "user@example.com",
      "password": "<encrypted_password>",
      "newPassword": "<encrypted_password>",
      "formstep": "vdresetPassword",
      "formStep": "vdresetPassword"
    }
    ```

---

## 1. Verification & Compilation Results

- Both frontend dev servers compiled clean with **0 errors**:
  - `user-web-app` running on `http://localhost:3001`
  - `admin-web-app` running on `http://localhost:3002`
- Verified form submission sends `formstep: "vdresetPassword"` in payload body on clicking **Submit**.
