# Walkthrough - Course/Chapter Session Tracking, Table Pagination & Frontend Enhancements

We have updated the `user-web-app` `vdUser` API payloads to track `course_id` and `chapter_id` across all watch sessions and watch history events (on completion, or when switching videos halfway). We also maintained our unified pagination system, custom modal alerts, login encryption, and report exports.

---

## 0. Course & Chapter Watch Session Tracking (`course_id` & `chapter_id`)

- **Dashboard Course Payload Parsing**:
  - Updated `getCourseLessonsList` in [UserDashboard.js](file:///c:/Users/axxonet/Desktop/videoStreeming/user-web-app/src/pages/UserDashboard.js) to preserve `chapter_id` and `course_id` from the API response payload objects (`your_courses` video items, e.g., `{ id: 2, chapter_id: 1, title: "JDK" }`).
  - Added support for courses where `chapters` is a count integer and `videos` is a direct array on the course object (as returned in the `/vdUser` response).
- **Automatic `course_id` & `chapter_id` Parameter Injection**:
  - Updated `api.dashboard.getUser` in [user-web-app/src/services/api.js](file:///c:/Users/axxonet/Desktop/videoStreeming/user-web-app/src/services/api.js) to guarantee `course_id` and `chapter_id` are included in every request payload sent to the `vdUser` API (`/User` / `/vdUser`).
  - If a video is part of a course/chapter, its actual `course_id` and `chapter_id` are passed.
  - If it is a standalone normal video (not part of a course/chapter), `course_id: 0` and `chapter_id: 0` are passed in the payload.
- **Video Completion & Mid-Watch Video Switching**:
  - Updated [VideoWatch.js](file:///c:/Users/axxonet/Desktop/videoStreeming/user-web-app/src/pages/VideoWatch.js) in `saveProgress` (`watchsession` formstep) and unmount cleanup (`watchHistory` formstep) to extract `course_id` and `chapter_id` from the active video/chapter or course state.
  - On every video completion, or when a user stops/watches halfway and switches to another chapter/video, both `watchsession` and `watchHistory` payloads track the exact `course_id` and `chapter_id` (or `0` for normal videos).

---

## 1. Report Empty State & Custom Export Alert Popups

- **Static Data Fallback Removal**:
  - Updated all 4 report tables (`user_activity`, `video_performance`, `revenue`, `subsription`) in [SuperAdminDashboard.js](file:///c:/Users/axxonet/Desktop/videoStreeming/admin-web-app/src/pages/SuperAdminDashboard.js) to pass `data={reportData || []}`.
  - Removed static hardcoded sample arrays (`Rahul`, `Priya`, `INV1001`, etc.) so that when the API returns an empty array `[]`, no dummy data is displayed.
  - Set `emptyMessage="No details available"` across all 4 report tables so that a clean glassmorphic placeholder displays `"No details available"`.
- **Login-Style Custom Modal Alert Overlay for Exports**:
  - Replaced native browser `alert()` popups inside `handleExport` with the login page custom popup modal overlay (`showError("No details available")`).
  - When clicking **Export CSV**, **Export Excel**, or **Export PDF** and no data is returned or available, the custom glassmorphic popup modal is displayed instead of browser native alert windows.

---

## 2. Export-Only `type: "Report"` Payload Parameter & Dropdown Clean Payload

- **Dropdown Table Fetch Payload**:
  - Removed `type` / `type: 'Report'` from the default payload sent during dropdown selection changes in `getSuperAdminReport`.
  - When selecting a report type from the dropdown, the payload sent to `/vdsuperadmin/report` is strictly:
    ```json
    {
      "formstep": "video_performance",
      "admin_id": "4",
      "token": "..."
    }
    ```
- **Export Buttons Payload (`type: "Report"`)**:
  - When clicking **Export CSV**, **Export Excel**, or **Export PDF**, `type: 'Report'` is passed in the payload:
    ```json
    {
      "formstep": "video_performance",
      "admin_id": "4",
      "type": "Report",
      "export_type": "csv",
      "format": "csv",
      "token": "..."
    }
    ```

---

## 3. Report Table Refresh & Button Event Prevention

- **Pagination & Button Click Event Isolation**:
  - Updated [admin-web-app/src/components/PaginatedTable.js](file:///c:/Users/axxonet/Desktop/videoStreeming/admin-web-app/src/components/PaginatedTable.js) and [user-web-app/src/components/PaginatedTable.js](file:///c:/Users/axxonet/Desktop/videoStreeming/user-web-app/src/components/PaginatedTable.js) to add `type="button"`, `e.preventDefault()`, and `e.stopPropagation()` to all table pagination buttons (Prev, Next, Page Numbers).
  - This prevents clicking anywhere inside the table or pagination controls from triggering form submission, parent container click events, or reloading/refreshing the table.
- **Sidebar Reports Menu Click Guard**:
  - Updated [SuperAdminDashboard.js](file:///c:/Users/axxonet/Desktop/videoStreeming/admin-web-app/src/pages/SuperAdminDashboard.js) so that clicking the **Reports** sidebar item when already on the Reports page (`activeTab === 'rep_export'`) does not re-trigger state changes or cause unnecessary API re-fetching.

---

## 4. Super Admin Reports Export API & File Downloads

- **Export CSV / Export Excel / Export PDF Buttons**:
  - Updated [SuperAdminDashboard.js](file:///c:/Users/axxonet/Desktop/videoStreeming/admin-web-app/src/pages/SuperAdminDashboard.js) so that when on the Super Admin Reports page (`activeTab === 'rep_export'`), clicking **Export CSV**, **Export Excel**, or **Export PDF** calls the exact same API endpoint (`vdsuperadmin/report` via `api.reports.getSuperAdminReport`).
  - Sends the active report type (`formstep`), `type: 'Report'`, selected admin ID (`admin_id`), and format type (`export_type`, `format`) in the API payload body.
  - Automatically triggers the browser file download when the API returns a file URL, raw text/CSV stream, blob, or JSON dataset.

---

## 5. User Activity Report API Response Key Mapping

- **Fixed `Videos Watched` and Summary Fields**:
  - Updated [SuperAdminDashboard.js](file:///c:/Users/axxonet/Desktop/videoStreeming/admin-web-app/src/pages/SuperAdminDashboard.js) to map the exact keys returned by the API for the **User Activity** report:
    - `Videos Watched`: Prioritized `video_watched` (e.g., `"0"` / `1`) before `videos_watched` / `videosWatched`.
    - `Courses Started`: Added `course_started` before `courses_started`.
    - `Courses Completed`: Added `course_completed` before `courses_completed`.
    - `Plan`: Prioritized `status` (e.g., `"Basic"`) alongside `plan` / `subscription_plan`.

---

## 6. Video Performance Report API Response Key Mapping

- **Fixed Missing Fields**:
  - Updated [SuperAdminDashboard.js](file:///c:/Users/axxonet/Desktop/videoStreeming/admin-web-app/src/pages/SuperAdminDashboard.js) to support the exact keys returned by the API for the **Video Performance** report:
    - `Category`: Prioritizes `category_name` (e.g., `"Technology"`) before `category`.
    - `Compte %`: Added support for `completion_percentage` (e.g., `"100.00"`), automatically formatting it into rounded percentage (e.g. `100%`).
    - `Watch Time`: Added support for `watch_duration_sec` (e.g., `5`), converting seconds into human-readable formatted watch duration (e.g., `5s`, `2m 10s`, `1h 45m`).

---

## 7. Login Payload Encryption & N8N Decryption

- **Frontend Payload Encryption**:
  - Exported `encryptPayload(plaintext)` helper in both [admin-web-app/src/services/api.js](file:///c:/Users/axxonet/Desktop/videoStreeming/admin-web-app/src/services/api.js) and [user-web-app/src/services/api.js](file:///c:/Users/axxonet/Desktop/videoStreeming/user-web-app/src/services/api.js).
  - Updated `api.auth.login(email, password)` to encrypt both `email` and `password` via `encryptPayload(...)` before sending the JSON body request payload to the `/auth/login` endpoint.
- **N8N JavaScript Code**:
  - Provided a production-ready N8N Code (JavaScript) node snippet that decrypts incoming encrypted `email` and `password` payload parameters using the secret key (`LurnAxSecretEncryptionKey2026`).

---

## 8. Super Admin Dashboard Overview Cleanup

- **Removed Sections**:
  - Removed the **System Alerts** box from the Overview landing page in [SuperAdminDashboard.js](file:///c:/Users/axxonet/Desktop/videoStreeming/admin-web-app/src/pages/SuperAdminDashboard.js).
  - Removed the **Support Overview** widget card from the Overview landing page.

---

## 9. Super Admin Report Page & Alignment Fixes

- **Report Select Dropdown**:
  - Added a select dropdown named `report` above the table on the Super Admin Report page ([SuperAdminDashboard.js](file:///c:/Users/axxonet/Desktop/videoStreeming/admin-web-app/src/pages/SuperAdminDashboard.js)).
  - Options available:
    1. `User Activity` (`user_activity`)
    2. `Video Performance` (`video_performance`)
    3. `Revenue` (`revenue`)
    4. `Subscription` (`subsription`)
- **User Activity Alignment Fix**:
  - Fixed alignment mismatch in the User Activity report table by ensuring left alignment across all metric cells (`Courses Started`, `Courses Completed`, `Videos Watched`, `Watch Time`, `Completion %`).
  - Values now align 100% precisely directly under their corresponding column headers.
- **API Endpoint Mapping**:
  - Selecting any report type triggers an API call to `vdsuperadmin/report` (`api.reports.getSuperAdminReport(reportType, { admin_id: selectedAdminId })`) passing the exact formstep:
    - **User Activity**: `formstep: "user_activity"`
    - **Video Performance**: `formstep: "video_performance"`
    - **Revenue**: `formstep: "revenue"`
    - **Subscription**: `formstep: "subsription"`
- **Table Schemas & Column Formats**:
  1. **User Activity Table**: `User`, `Plan`, `Courses Started`, `Courses Completed`, `Videos Watched`, `Watch Time`, `Completion %`, `Last Login`
  2. **Video Performance Table**: `User`, `Category`, `Video`, `Views`, `Status`, `Compte %`, `Watch Time`
  3. **Revenue Table**: `Payment Date`, `Invoice No`, `Transaction ID`, `User`, `Plan`, `Amount`, `Discount`, `Tax`, `Net Amount`, `Payment Method`, `Gateway`, `Status`
  4. **Subscription Table**: `User Name`, `Email`, `Plan`, `Billing Cycle`, `Amount`, `Currency`, `Start Date`, `Expiry Date`, `Status`, `Payment Status`, `Payment Method`, `Auto Renewal`, `Days Remaining`, `Created By`

---

## 10. Super Admin Reports Menu Refactoring

- **Removed Sub-items**:
  - Removed "Daily Reports", "Weekly Reports", and "Monthly Reports" dropdown sub-items from the Reports menu section in [SuperAdminDashboard.js](file:///c:/Users/axxonet/Desktop/videoStreeming/admin-web-app/src/pages/SuperAdminDashboard.js).
- **Direct Navigation**:
  - Clicking on the main **Reports** sidebar menu item now directly navigates the user to the Reports page (`rep_export` / Reports portal).
  - Cleaned up accordion expand/collapse arrows (`▶`/`▼`) for Reports since sub-items are no longer present.

---

## 11. Paginated Table System (`<PaginatedTable>`)

A reusable, premium, and glassmorphic `<PaginatedTable>` component was built and implemented:
- **Location:**
  - [user-web-app/src/components/PaginatedTable.js](file:///c:/Users/axxonet/Desktop/videoStreeming/user-web-app/src/components/PaginatedTable.js)
  - [admin-web-app/src/components/PaginatedTable.js](file:///c:/Users/axxonet/Desktop/videoStreeming/admin-web-app/src/components/PaginatedTable.js)
- **Features:**
  - **Dynamic Headers:** Supports simple string labels or custom styled headers via object format (e.g., `{ label: 'Views', style: { textAlign: 'center' } }`).
  - **Custom Pagination Logic:** Automatically calculates page bounds based on a user-selectable page size dropdown (5, 10, 20, or 50 rows per page).
  - **Beautiful Controls:** Smooth page selectors (Previous, Page Numbers, Next) styled matching the core dark-glassmorphism aesthetic.
  - **Fallback State:** Renders a clean, friendly text placeholder if the data array is empty or contains no records.

---

## 12. Super Admin Overview Landing Page & `admin_id` Parameter

- **Passing `admin_id` in Payload:**
  - Added `selectedAdminId` to the `useEffect` dependency array in [SuperAdminDashboard.js](file:///c:/Users/axxonet/Desktop/videoStreeming/admin-web-app/src/pages/SuperAdminDashboard.js).
  - On landing page mount (and whenever the selected administrator changes), `fetchDashboardData('overview', selectedAdminId)` passes `{ admin_id: selectedAdminId }` in the API payload to `/vddashboard/super-admin`.
- **Static Data Fallback Removal:**
  - Removed hardcoded values (`92`, `12,850`, `150 min`, `4500 min`, `87`, `12`, `+15 today`, `↑ 12% this month`, `68%`, `22%`, etc.) from all stat cards, line charts, bar charts, and engagement indicators on the landing page.
  - Cards now dynamically display live metrics returned by the API for the selected admin (falling back cleanly to `0` or `0 min` when data is empty).

---

## 13. Custom Modal Alert Overlay

- **Add Admin & Add User Modal Alert Enhancements:**
  - Replaced native browser `alert()` popups inside both the Super Admin "Add Admin" and Admin "Add User" form validation blocks with the premium, custom modal alert overlay.
  - Integrated `showError` helper function within both `SuperAdminDashboard.js` and `AdminDashboard.js` to trigger clean UI alerts for email domain suffix validation, phone number validation (exactly 10 digits), and zipcode validation (exactly 6 digits).
  - Maintained look-and-feel consistency across the entire administrator login, admin management, and user management experience.

- **Status Code-based Duplicate Checks:**
  - Configured Admin and Super Admin form submit error handlers to check status codes:
    - **422 status code:** Triggers custom popup alert overlay stating "Phone Number Already exist".
    - **433 status code:** Triggers custom popup alert overlay stating "Email Already exist".

---

## 14. Dynamic Gender Dropdowns & Timestamp Date of Birth Serializations

### A. Super Admin Dashboard (Add/Edit Admin form)
- **Dynamic Gender Dropdown API Mapping:**
  - Added a dynamic genders query fetching from `vddashboard/super-admin` with formstep `getGender`.
  - Mapped options inside the "Gender" select dropdown dynamically based on `{ id, name }` values returned by the API.
  - Formatted the editing payload to send the selected gender option's ID using the key `gender_id` in the API submit payload.
  - Configured edit loading helper (`handleEditClick`) to lookup and map incoming string representations/ID representations of gender cleanly.
- **Date of Birth Serialization:**
  - Updated the submit handler payload serialize function to parse the date input value and convert it to a standard ISO 8601 timestamp with timezone (`new Date(adminForm.dob).toISOString()`) instead of raw string format.
  - Handled auto-formatting of incoming ISO Date of Birth values to `YYYY-MM-DD` strings inside the edit handler to make it fully compatible with HTML `<input type="date" />` components.

### B. Admin Dashboard (Add/Edit User form)
- **Dynamic Gender Dropdown API Mapping:**
  - Added a dynamic genders query fetching from `vdadminUsers` with formStep `getGender`.
  - Mapped options inside the "Gender" select dropdown dynamically based on `{ id, name }` values returned by the API.
  - Formatted the editing payload to send the selected gender option's ID using the key `gender_id` in the API submit payload.
  - Configured edit loading helper (`handleEditClick`) to lookup and map incoming string representations/ID representations of gender cleanly.
- **Date of Birth Serialization:**
  - Updated the submit handler payload serialize function to parse the date input value and convert it to a standard ISO 8601 timestamp with timezone (`new Date(userForm.dob).toISOString()`) instead of raw string format.
  - Handled auto-formatting of incoming ISO Date of Birth values to `YYYY-MM-DD` strings inside the edit handler to make it fully compatible with HTML `<input type="date" />` components.

---

## 15. User Explore View Enhancements

- **Empty API Handling & Static Fallback Removal:**
  - Refactored `UserDashboard.js` to define a `hasFetchedExplore` state variable.
  - Modified the video filtering helper `getFilteredExploreVideos` to strictly use the API response list `exploreVideosList` if `hasFetchedExplore` is `true`. Removed the automatic fallback to static `getAllVideosList()` once the API has resolved.
  - Updated the render tree: when the filtered explore videos list is empty, a stylized glassmorphic placeholder is displayed displaying the text: `"No videos are available"`.

---

## 16. Add Forms Loading Spinners & Success Popups

- **Self Signup Payload**:
  - Configured `Signup.js` to pass `type: 'selfSignUp'` inside the registration request payload.
- **Button Loading Animations**:
  - Embedded local `@keyframes spin` css declarations and CSS/SVG loaders inside the **User Signup** button, **Add Admin** save button, and **Add User** save button, showing a loading indicator while requests are pending.
- **200 OK Custom Success Popups**:
  - Integrated the custom overlay modal alert popups for successes using `showSuccess(...)`.
  - Displays `"user creates successfully"` upon successful user signup.
  - Displays `"Admin added successfully"` upon successful administrator creation.
  - Displays `"User added successfully"` upon successful user creation inside the admin dashboard.

---

## 17. Verification & Compilation Results

- Both frontend dev servers compiled clean with **0 errors**:
  - `user-web-app` running on `http://localhost:3001`
  - `admin-web-app` running on `http://localhost:3002`
- Verified pagination controls change pages smoothly, select rows-per-page cleanly, and display the correct empty-state message when data arrays are empty.
