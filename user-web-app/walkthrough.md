# Walkthrough - User Quiz & Certificates Menu & Quiz History Page Implementation

We have added **Quiz** (`/quizzes`) and **Certificates** (`/certificates`) to the user navigation menu in `user-web-app` ([Sidebar.js](file:///c:/Users/axxonet/Desktop/videoStreeming/user-web-app/src/components/Sidebar.js) & [App.js](file:///c:/Users/axxonet/Desktop/videoStreeming/user-web-app/src/App.js)).

We also created the **User Quiz History Page** ([UserQuizzes.js](file:///c:/Users/axxonet/Desktop/videoStreeming/user-web-app/src/pages/UserQuizzes.js)) calling `vdUser` API with `formstep: 'getQuizHistory'`.

---

## 0. Key Implementation Features

1. **Sidebar Navigation Update**:
   - Added **Quiz** (icon: `📝`, path: `/quizzes`) and **Certificates** (icon: `📜`, path: `/certificates`) menu items in [Sidebar.js](file:///c:/Users/axxonet/Desktop/videoStreeming/user-web-app/src/components/Sidebar.js).

2. **API Call (`vdUser` with `formstep: 'getQuizHistory'`)**:
   - Updated `api.dashboard.getUser` in [api.js](file:///c:/Users/axxonet/Desktop/videoStreeming/user-web-app/src/services/api.js) so `getQuizHistory` passes `formstep: 'getQuizHistory'` in the JSON body payload.

3. **Paginated Quiz History Table ([UserQuizzes.js](file:///c:/Users/axxonet/Desktop/videoStreeming/user-web-app/src/pages/UserQuizzes.js))**:
   - Displays a clean `<PaginatedTable>` matching your exact column specifications:
     `| Quiz | Course | Chapter | Score | Result | Attempt | Date | Action |`
   - **Sample Row Items**:
     - `Data Types Quiz | TypeScript Basics | Chapter 1 | 8/10 (80%) | 🟢 Passed | 1 | 07 Aug 2026, 2:15 PM | 👁 View`
     - `Array Quiz | TypeScript Basics | Chapter 2 | 6/10 (60%) | 🔴 Failed | 1 | 08 Aug 2026, 10:30 AM | 🔄 Retake`
     - `Functions Quiz | TypeScript Basics | Chapter 3 | 10/10 (100%) | 🟢 Passed | 2 | 09 Aug 2026, 4:45 PM | 👁 View`
     - `Interfaces Quiz | Advanced TypeScript | Chapter 1 | 9/10 (90%) | 🟢 Passed | 1 | 10 Aug 2026, 9:20 AM | 👁 View`

4. **Action Handlers**:
   - **`👁 View` Button**: Opens an overlay modal showing detailed score summary, attempt count, and performance rating.
   - **`🔄 Retake` Button**: Navigates directly to the course watch page for retaking the chapter quiz.

5. **Certificates Page ([Certificates.js](file:///c:/Users/axxonet/Desktop/videoStreeming/user-web-app/src/pages/Certificates.js))**:
   - Renders earned course completion credentials, badges, scores, and PDF download triggers.

---

## 1. Verification & Compilation Results

- Both frontend dev servers compiled clean with **0 errors**:
  - `user-web-app` running on `http://localhost:3001`
  - `admin-web-app` running on `http://localhost:3002`
- Verified clicking **Quiz** from sidebar opens `/quizzes`, displaying the paginated table and modal views cleanly.
