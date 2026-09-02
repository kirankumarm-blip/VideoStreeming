# Standard Operating Procedure (SOP) & Complete User Manual
## Enterprise Video Streaming & Course Learning Management System (LMS)

---

## Document Control
- **Document Title**: Enterprise Video Streaming & LMS Standard Operating Procedure (SOP)
- **Version**: 2.4.0
- **Applicable Platforms**: Admin Web Portal (`admin-web-app`), Learner Portal (`user-web-app`), Transcoding & Upload Service
- **Target Audience**: Super Administrators, Client Administrators (Admins), Author Administrators (Instructors/Creators), and End Learners (Users)

---

## Table of Contents
1. [Platform Architecture & Role-Based Access Matrix](#1-platform-architecture--role-based-access-matrix)
2. [Section A: Super Admin SOP Manual](#2-section-a-super-admin-sop-manual)
   - [2.1 Authentication & Global Dashboard](#21-super-admin-authentication--global-dashboard)
   - [2.2 Client / Tenant Management](#22-client--tenant-management)
   - [2.3 Admin & Author Governance](#23-admin--author-governance)
   - [2.4 Global User Management & Security Audits](#24-global-user-management--security-audits)
   - [2.5 Global Content Catalog (Courses, Categories, Subcategories)](#25-global-content-catalog)
   - [2.6 Platform Analytics, AI Insights & Support Center](#26-platform-analytics-ai-insights--support-center)
3. [Section B: Client Admin (Organization Admin) SOP Manual](#3-section-b-client-admin-organization-admin-sop-manual)
   - [3.1 Admin Authentication & Dashboard Overview](#31-admin-authentication--dashboard-overview)
   - [3.2 Author (Instructor) Management](#32-author-instructor-management)
   - [3.3 Student / Learner Management & Activity Logs](#33-student--learner-management--activity-logs)
   - [3.4 Content & Video Catalog Management](#34-content--video-catalog-management)
   - [3.5 Course Upload & Curriculum Builder (Chapters & Lessons)](#35-course-upload--curriculum-builder)
   - [3.6 Quiz & Assessment Engine Management](#36-quiz--assessment-engine-management)
   - [3.7 Sub-Admins, Roles, Permissions & Audit Trail](#37-sub-admins-roles-permissions--audit-trail)
4. [Section C: Author Admin (Instructor / Content Creator) SOP Manual](#4-section-c-author-admin-instructor--content-creator-sop-manual)
   - [4.1 Author Dashboard & Studio Workspace](#41-author-dashboard--studio-workspace)
   - [4.2 Video Upload & Transcoding Pipeline](#42-video-upload--transcoding-pipeline)
   - [4.3 Course Curriculum Authoring & Draft Workflow](#43-course-curriculum-authoring--draft-workflow)
   - [4.4 Interactive Quiz Question Creation](#44-interactive-quiz-question-creation)
   - [4.5 Author Engagement & Course Analytics](#45-author-engagement--course-analytics)
5. [Section D: End Learner (User) Portal SOP Manual](#5-section-d-end-learner-user-portal-sop-manual)
   - [5.1 Account Registration, Login, OTP & Password Recovery](#51-account-registration-login-otp--password-recovery)
   - [5.2 Home Feed, Category Browsing & Search](#52-home-feed-category-browsing--search)
   - [5.3 Course Enrollment & Video Watch Room](#53-course-enrollment--video-watch-room)
   - [5.4 Video Player Controls, Anti-Piracy Watermarks & Fullscreen](#54-video-player-controls-anti-piracy-watermarks--fullscreen)
   - [5.5 Chapter Quizzes & Assessment Submissions](#55-chapter-quizzes--assessment-submissions)
   - [5.6 Watch Later & Favorites Workflow](#56-watch-later--favorites-workflow)
   - [5.7 Profile Settings, Security & Subscription Plans Upgrade](#57-profile-settings-security--subscription-plans-upgrade)
6. [Section E: System Error Codes & Troubleshooting Reference](#6-section-e-system-error-codes--troubleshooting-reference)

---

## 1. Platform Architecture & Role-Based Access Matrix

| Feature / Module | Super Admin | Client Admin | Author Admin | Learner (User) |
| :--- | :---: | :---: | :---: | :---: |
| Multi-Tenant Client Management | Full Access | No Access | No Access | No Access |
| Admin Account Provisioning | Full Access | Read / Edit Self | No Access | No Access |
| Author / Instructor Creation | Full Access | Full Access | Self Profile Only | No Access |
| User / Learner Account Governance | Global Control | Organization Control | View Enrolled | Self Profile |
| Global Categories & Subcategories | Full Access | Full Access | Read-Only | Read-Only |
| Video Upload & Transcoding Service | Full Access | Full Access | Full Access | No Access |
| Course Curriculum & Chapter Builder | Full Access | Full Access | Full Access | Enrolled View |
| Quiz Assessment Engine | Full Access | Full Access | Full Access | Take & Submit |
| Roles, Permissions & Audit Logs | Full Access | Organization Control | No Access | No Access |
| Subscription & Plan Management | Global Control | Organization Control | Read-Only | Purchase / Upgrade |
| Video Player & Anti-Piracy Watermark | Preview Mode | Preview Mode | Preview Mode | Full Dynamic Streaming |

---

## 2. Section A: Super Admin SOP Manual

### 2.1 Super Admin Authentication & Global Dashboard
**Objective**: To monitor macro platform vitals, user growth, aggregate storage utilization, total active tenants, and system-wide video engagement.

#### Step-by-Step Navigation:
1. Open the Admin Web App URL (`http://localhost:3000` or production domain).
2. Enter Super Admin credentials (`username/email` and `password`).
3. Click **Login**.
4. You are redirected to the **Super Admin Global Dashboard** (`/superadmin`).
5. Review the primary KPI summary metrics:
   - Total Tenants / Clients
   - Total System Users & Growth Trends
   - Total Published Courses & Transcoded Videos
   - Revenue & Active Paid Subscriptions

> 📸 **[SCREENSHOT PLACEHOLDER: Super Admin Global Dashboard Overview]**
> *(Insert screenshot of the Super Admin main analytics cards and KPI counters here)*

---

### 2.2 Client / Tenant Management
**Objective**: Provisioning, onboarding, and configuring enterprise client tenants.

#### Step-by-Step Navigation & Actions:
1. On the left sidebar menu, click **Client Management**.
2. **View Clients**: The table lists Organization Name, Client Admin Email, Subscribed Tier, Status (Active/Suspended), and Creation Date.
3. **Onboard New Client**:
   - Click the **`+ Add Client`** button.
   - Fill in the required modal fields:
     - **Organization Name**: Legal client name.
     - **Domain / Slug**: Unique tenant identifier.
     - **Primary Admin Email**: Contact for primary organization owner.
     - **Initial Plan Tier**: Free / Standard / Enterprise.
     - **Storage & Bandwidth Quota**: Allocated limits in GB/TB.
   - Click **Submit / Create Client**.
4. **Manage Client Status**:
   - In the action column, click **Edit** to modify quotas or **Deactivate/Activate** to suspend access.

> 📸 **[SCREENSHOT PLACEHOLDER: Client Tenant Management Table & Add Client Modal]**
> *(Insert screenshot of Client Management table and creation dialog here)*

---

### 2.3 Admin & Author Governance
**Objective**: Governing Organization Administrators and Content Authors across the entire platform.

#### Step-by-Step Navigation:
1. Navigate to **Admin Management** -> **All Admins**.
2. **Filter**: Filter by Tenant ID, Status, or Search by Name/Email.
3. **Provision Client Admin**:
   - Click **`+ Add Admin`**.
   - Select the target **Client/Tenant**.
   - Input Admin Full Name, Email, Password, and Role assignment.
   - Click **Save**.
4. Navigate to **Author Management**:
   - Inspect cross-tenant authors, bio profiles, approval states, and assigned courses.

> 📸 **[SCREENSHOT PLACEHOLDER: Super Admin - Admin Management & Author Directory]**
> *(Insert screenshot of Admin management user list and Add Admin modal here)*

---

### 2.4 Global User Management & Security Audits
**Objective**: Monitor all registered learners, manage deactivation/blocking, and inspect security audit logs.

#### Step-by-Step Navigation:
1. Navigate to **User Management**:
   - **All Users**: Comprehensive listing of every learner across all organizations.
   - **User Activity Logs**: Real-time trail showing login timestamps, IP addresses, watch events, and device user-agents.
   - **Blocked Users**: Interface to review flagged/blocked accounts and restore or permanently delete them.
2. **Account Deactivation Handling**:
   - Clicking **Block/Deactivate** sets user status code to inactive. Any subsequent request by that user triggers HTTP 430: *"Your account has been deactivated. Please contact your administrator."*

> 📸 **[SCREENSHOT PLACEHOLDER: User Activity Logs & Security Audit Records]**
> *(Insert screenshot showing real-time User Activity Logs table here)*

---

### 2.5 Global Content Catalog
**Objective**: Manage global taxonomy (Categories and Subcategories) and perform global course publishing audits.

#### Step-by-Step Navigation:
1. Click **Content Management** on the sidebar.
2. **Categories**:
   - Click **Categories** -> click **`+ Add Category`**.
   - Enter Category Title, Slug, Display Order, and Icon class.
   - Click **Save**.
3. **Subcategories**:
   - Click **Sub Category** -> click **`+ Add Subcategory`**.
   - Select Parent Category from dropdown.
   - Enter Subcategory Title and Description.
4. **Course Audits**:
   - Click **All Courses** to inspect any course across tenants. View status, visibility (Free/Paid), chapters, and review author submissions.

> 📸 **[SCREENSHOT PLACEHOLDER: Categories & Subcategories Administration Screen]**
> *(Insert screenshot of Category management list and Add Category popup here)*

---

### 2.6 Platform Analytics, AI Insights & Support Center
**Objective**: Leverage predictive AI models and manage support tickets.

#### Features & Procedures:
1. **AI Insights**:
   - **Churn Prediction**: Lists learners at risk of dropping off based on inactivity intervals.
   - **Trending Videos**: Identifies high-engagement content by completion velocity.
   - **Revenue Forecast**: Projected ARR/MRR based on subscription upgrades.
2. **Support Center**:
   - Review incoming support tickets, bug reports, and user complaints.
   - Update ticket status (`Open`, `In Progress`, `Resolved`, `Closed`).

> 📸 **[SCREENSHOT PLACEHOLDER: AI Insights & Support Center Dashboard]**
> *(Insert screenshot of AI predictive charts and Support Ticket queue here)*

---

## 3. Section B: Client Admin (Organization Admin) SOP Manual

### 3.1 Admin Authentication & Dashboard Overview
**Objective**: Organization-level governance, local video catalog performance, and team monitoring.

#### Step-by-Step Navigation:
1. Access the Admin Web Portal.
2. Input Client Admin credentials and submit login.
3. Access **Dashboard**:
   - **Top KPI Cards**: Total Courses, Total Authors, Total Active Learners, Watch Hours Completed.
   - **Recent Uploads Table**: Status of latest transcoded videos.
   - **Interactive Charts**: Daily user active trends and category popularity breakdown.
4. **Header Utilities**:
   - **Language Switcher**: Click the globe icon dropdown in the top navigation bar (`🌐 English`, `हिंदी`, `ಕನ್ನಡ`) to change portal locale on the fly.
   - **Theme Switcher**: Toggle Dark / Light mode using the Sun/Moon icon.
   - **Profile & Logout**: Access account details or initiate secure single/cross-tab logout.

> 📸 **[SCREENSHOT PLACEHOLDER: Client Admin Dashboard Home & Header Navigation Bar]**
> *(Insert screenshot of Client Admin home screen showing KPI cards and Header with Language Selector here)*

---

### 3.2 Author (Instructor) Management
**Objective**: Registering and managing content instructors within the organization.

#### Step-by-Step Navigation:
1. Click **Author Management** on the sidebar.
2. **Add New Author**:
   - Click **`+ Add Author`** button.
   - Fill in:
     - **Author Name**: First and Last name.
     - **Email Address**: Corporate email for login credentials.
     - **Designation / Title**: e.g., Senior Technical Lead, Math Faculty.
     - **Biography**: Brief profile displayed to learners.
     - **Avatar / Profile Photo**: Upload author portrait image.
   - Click **Save Author**.
3. **Actions**: Edit author details, assign courses, or disable author access.

> 📸 **[SCREENSHOT PLACEHOLDER: Author Management Directory & Add Author Form]**
> *(Insert screenshot of Author list and author registration form here)*

---

### 3.3 Student / Learner Management & Activity Logs
**Objective**: Managing enrolled learners, reviewing activity timelines, and enforcing access rules.

#### Step-by-Step Navigation:
1. Click **User Management**:
   - **Users**: Search by name/email, inspect enrolled courses, view assigned plan (`Free` vs `Premium`).
   - **User Activity Logs**: Filter logs by student ID to view video playback sessions, quiz score submissions, and timestamps.
   - **Blocked Users**: Block problematic accounts or unblock accounts upon review.

> 📸 **[SCREENSHOT PLACEHOLDER: User Management Grid & Student Detail Drawer]**
> *(Insert screenshot of Learner listing with Action buttons here)*

---

### 3.4 Content & Video Catalog Management
**Objective**: Central repository of standalone video media and published courses.

#### Step-by-Step Navigation:
1. Click **Video Management** -> **All Videos**:
   - Displays video thumbnail, title, category, views counter, visibility badge (`Public` / `Private`), and transcoding status.
2. **Edit Video Metadata**:
   - Click the pencil icon next to any video.
   - Edit Title, Description, Tags, Category, Subcategory, and Visibility:
     - `Public (Free)`: Accessible to Free plan tier learners.
     - `Private (Premium)`: Locked for Free plan users; accessible exclusively to paid subscriber tiers.
   - Click **Save Changes**.

> 📸 **[SCREENSHOT PLACEHOLDER: All Videos Catalog Table with Filter Bar]**
> *(Insert screenshot of All Videos management screen here)*

---

### 3.5 Course Upload & Curriculum Builder
**Objective**: Constructing multi-chapter, multi-lesson courses with integrated assessments.

#### Step 1: Course Basic Metadata
1. Navigate to **Video Management** -> **Upload Course**.
2. Provide core course information:
   - **Course Title**: Descriptive title of the course.
   - **Category & Sub Category**: Select from dropdown.
   - **Language**: Select audio/content language (e.g., English, Hindi, Kannada).
   - **Level**: Beginner / Intermediate / Advanced.
   - **Course Thumbnail**: Upload 16:9 ratio promotional cover image.
   - **Visibility**: Set Public (Free) or Private (Premium).
   - **Course Description**: Overview, objectives, and prerequisites.

#### Step 2: Curriculum Builder (Chapters & Lessons)
1. In the Curriculum section, click **`+ Add Chapter`**.
2. Enter Chapter Title (e.g., *Chapter 1 : Introduction to Microservices*).
3. Under the chapter, click **`+ Add Lesson`**:
   - **Lesson Title**: Specific topic title.
   - **Select Video**: Pick from uploaded video media or upload a new video file.
   - **Lesson Visibility**: Toggle whether this specific video is Free or Locked (Private).
   - **Duration**: Automatically computed from video duration.
4. Repeat to add additional lessons and chapters.
5. Drag and reorder chapters and lessons as needed.

#### Step 3: Publish or Save Draft
- Click **Save as Draft** to review later in the **Course Draft** tab.
- Click **Publish Course** to immediately make it live for learners.

> 📸 **[SCREENSHOT PLACEHOLDER: Course Upload Form & Chapter Curriculum Builder]**
> *(Insert screenshot showing Chapter 1, Chapter 2 accordion builder with Add Lesson dialog here)*

---

### 3.6 Quiz & Assessment Engine Management
**Objective**: Creating chapter assessments to evaluate learner retention before advancing.

#### Step-by-Step Navigation:
1. In Course Edit or Curriculum Builder, locate the target Chapter.
2. Click **`+ Add / Manage Chapter Quiz`**.
3. **Configure Quiz Properties**:
   - **Quiz Title**: e.g., *Chapter 1 Knowledge Assessment*.
   - **Passing Score**: Percentage required (e.g., 70%).
4. **Add Questions**:
   - Click **`+ Add Question`**.
   - Choose Question Type:
     1. **Multiple Choice (MCQ)**: Input Question Text, add Option A, B, C, D, and select the radio button for the correct answer.
     2. **True / False**: Input statement and select True or False as the answer.
     3. **Fill in the Blanks / Free Text**: Input question prompt and define the accepted reference answer string.
5. Click **Save Quiz**.

> 📸 **[SCREENSHOT PLACEHOLDER: Chapter Quiz Builder Modal with MCQ and Free Text Inputs]**
> *(Insert screenshot of Quiz Builder popup showing question configuration here)*

---

### 3.7 Sub-Admins, Roles, Permissions & Audit Trail
**Objective**: Granular role-based delegation and non-repudiation audit logging.

#### Step-by-Step Navigation:
1. Navigate to **Administration**:
   - **Admin Management**: Create sub-administrators (e.g., Content Reviewer, Billing Admin).
   - **Roles & Permissions**: Define permission matrix (Read, Write, Delete) across courses, users, and financials.
   - **Audit Logs**: Immutable log tracking every administrative mutation (Course Deleted, User Suspended, Role Modified) with actor timestamp and IP address.

> 📸 **[SCREENSHOT PLACEHOLDER: Roles & Permissions Matrix and Audit Logs Table]**
> *(Insert screenshot of Role permissions checkboxes and Audit Log table here)*

---

## 4. Section C: Author Admin (Instructor / Content Creator) SOP Manual

### 4.1 Author Dashboard & Studio Workspace
**Objective**: A focused workspace for instructors to create, update, and monitor their own courses and content.

#### Step-by-Step Navigation:
1. Log in using Author Admin credentials.
2. The **Author Dashboard** displays:
   - My Active Courses & Drafts
   - Total Students Enrolled in My Courses
   - Student Course Completion Rate
   - Quiz Pass / Fail Ratios

> 📸 **[SCREENSHOT PLACEHOLDER: Author Instructor Studio Dashboard]**
> *(Insert screenshot of Author specialized home dashboard here)*

---

### 4.2 Video Upload & Transcoding Pipeline
**Objective**: Uploading high-definition video master files for automated multi-resolution transcoding.

#### Step-by-Step Navigation:
1. Click **Upload Video** on the sidebar.
2. **File Selection**:
   - Drag and drop your `.mp4`, `.mov`, or `.mkv` video file into the upload dropzone.
3. **Metadata Entry**:
   - **Video Title**: Clear, descriptive lecture name.
   - **Category**: Select subject category.
   - **Description**: Detailed lecture notes, code snippets, or links.
   - **Custom Thumbnail**: Upload high-contrast thumbnail image.
4. **Upload Execution**:
   - The upload service breaks large files into chunks with progress bar indicators.
   - Once uploaded, the background transcoding service encodes versions for:
     - `1080p (FHD)`
     - `720p (HD)`
     - `480p (SD)`
     - `Auto (Adaptive Bitrate)`
5. When status changes to **Ready**, the video can be linked to any course chapter.

> 📸 **[SCREENSHOT PLACEHOLDER: Video Upload Dropzone, Progress Bar & Quality Transcoding Card]**
> *(Insert screenshot of Video Upload screen and encoding status indicator here)*

---

### 4.3 Course Curriculum Authoring & Draft Workflow
**Objective**: Structuring authored courses into logical chapters.

#### Authoring Rules:
- Courses must have at least **1 Chapter** with at least **1 Lesson Video**.
- Chapters should be numbered sequentially (*Chapter 1 : [Title]*, *Chapter 2 : [Title]*).
- Use **Save Draft** frequently during curriculum drafting.
- Once complete, submit the course for Client Admin approval or publish directly (based on assigned author permissions).

> 📸 **[SCREENSHOT PLACEHOLDER: Author Curriculum Editor with Chapter Accordion View]**
> *(Insert screenshot of Author Course drafting screen here)*

---

### 4.4 Interactive Quiz Question Creation
**Objective**: Authoring end-of-chapter quizzes to test student comprehension.

#### Question Authoring Guidelines:
- **MCQ**: Provide 3 to 4 distinct options with exactly one correct answer.
- **True / False**: Ensure statements are unequivocal.
- **Free Text / Fill in the Blanks**:
  - The student assessment interface enforces non-empty inputs.
  - Formulate questions with concise, clear answer expectations.

> 📸 **[SCREENSHOT PLACEHOLDER: Author Quiz Question Creation Screen]**
> *(Insert screenshot of Author adding MCQ and Free Text questions here)*

---

### 4.5 Author Engagement & Course Analytics
**Objective**: Inspect student feedback, review video drop-off rates, and refine curriculum.

#### Step-by-Step Navigation:
1. Click **Analytics** on the sidebar.
2. Select your course from the dropdown.
3. Review:
   - Average Watch Time per Lesson
   - Lessons with highest repeat views
   - Chapter Quiz difficulty score (average attempts per student)

> 📸 **[SCREENSHOT PLACEHOLDER: Author Course Analytics & Student Completion Graphs]**
> *(Insert screenshot of Student engagement graphs and quiz pass statistics here)*

---

## 5. Section D: End Learner (User) Portal SOP Manual

### 5.1 Account Registration, Login, OTP & Password Recovery
**Objective**: Secure access to courses, personalized watch progress, and saved lists.

#### Registration Flow:
1. Open User Web App (`http://localhost:3001`).
2. Click **Sign Up**.
3. Fill in: Full Name, Email Address, and Password.
4. Submit the registration form.

#### Login Flow:
1. Click **Sign In**.
2. Enter registered Email and Password. Click **Login**.
3. *Single-Session & Inactivity Protection*: Inactive tabs are monitored with automatic session synchronization. If deactivated by an administrator, the platform triggers an alert notifying the learner.

#### Password Recovery Flow:
1. On the Sign In page, click **Forgot Password?**.
2. Enter registered email address to receive an OTP / reset verification.
3. Alternatively, update password inside **Profile** -> **Change Password**.

> 📸 **[SCREENSHOT PLACEHOLDER: Learner Login & Registration Portal Interfaces]**
> *(Insert screenshot of User Login modal and Registration form here)*

---

### 5.2 Home Feed, Category Browsing & Search
**Objective**: Discovering courses, filtering by subject, and continuing recent lessons.

#### Navigation Features:
1. **Hero Banner**: Highlights featured and newly released courses.
2. **Recently Played Bar**: Displays your latest in-progress video with progress bar and a 1-click **Resume** button.
3. **Category Chips**: Filter the catalog by *Development*, *Design*, *Cloud & DevOps*, *AI & Machine Learning*, etc.
4. **Universal Search**: Type keywords into the top navigation search bar to retrieve instant course and lecture suggestions.
5. **Language Switcher**: Click the top-right globe (`🌐 English`, `हिंदी`, `ಕನ್ನಡ`) to change the UI language dynamically.

> 📸 **[SCREENSHOT PLACEHOLDER: User Home Feed, Category Filter Carousel & Search Results]**
> *(Insert screenshot of Learner Home Page showing Hero Banner and Course Grid here)*

---

### 5.3 Course Enrollment & Video Watch Room
**Objective**: Navigating the unified Course Watch interface with synchronized sidebar curriculum.

#### Step-by-Step Navigation:
1. Click any course card from the catalog.
2. You enter the **Video Watch Room**:
   - **Left Column**: Main interactive HTML5 video player, lecture metadata, description, and action buttons.
   - **Right Column**: Course Content accordion organized cleanly by **Chapter 1 : [Title]**, **Chapter 2 : [Title]**, etc.
3. **Locked Lesson Handling (Free vs Premium Plans)**:
   - Lessons marked with a lock icon are Premium-only content.
   - For Free Plan users, if a chapter contains only 1 video and that video is private, the thumbnail is blurred with a centered lock badge.
   - If a chapter has multiple videos with a mix of public and private lessons, accessible videos remain playable.

> 📸 **[SCREENSHOT PLACEHOLDER: Video Watch Room with Course Content Chapter Accordion]**
> *(Insert screenshot of Watch Room showing Left Player and Right Chapter Accordion here)*

---

### 5.4 Video Player Controls, Anti-Piracy Watermarks & Fullscreen
**Objective**: High-fidelity video playback with custom security protection.

#### Video Player Feature Guide:
1. **Playback Controls**:
   - **Play / Pause**: Spacebar shortcut or center click on video.
   - **10s Jump**: Quick skip backward (`-10s`) or forward (`+10s`).
   - **Speed Selector**: Choose from `0.75x`, `1.0x (Normal)`, `1.25x`, `1.5x`, `2.0x`.
   - **Quality Selector**: Switch between `Auto`, `1080p`, `720p`, and `480p` with buffering indicator overlay.
   - **Auto-Resume Prompt**: Remembers playback timestamp across devices; displays a prompt to Resume or Start Over.
2. **Anti-Piracy Dynamic Watermarks**:
   - **Top-Right Brand Logo**: High-definition platform logo directly on video with drop shadow.
   - **Dynamic User Email**: Monospace anti-piracy watermark displaying your logged-in email directly under the logo.
3. **Fullscreen Mode**:
   - Click the expand icon to enter native fullscreen. The player container maintains custom controls and watermark overlays in full resolution.

> 📸 **[SCREENSHOT PLACEHOLDER: Player in Playback with Quality Menu and Logo/Email Watermark]**
> *(Insert screenshot showing Top-Right Logo, Email watermark, and bottom playback controls here)*

---

### 5.5 Chapter Quizzes & Assessment Submissions
**Objective**: Verifying chapter mastery and unlocking subsequent course modules.

#### Workflow & Automation:
1. **Automatic End-of-Chapter Trigger**:
   - When all playable videos in a chapter are watched, the **Chapter Quiz Assessment** automatically launches in a focused modal.
   - Alternatively, click the red **Take Quiz** button under the completed chapter in the sidebar.
2. **Answering Questions**:
   - **Multiple Choice**: Click the circular radio option.
   - **True / False**: Select True or False card.
   - **Free Text / Fill in the Blanks**:
     - Type your answer in the text box.
     - *Validation Rule*: The input strictly prevents leading and empty whitespace. The **Next ➔** and **Submit Quiz 🚀** buttons remain disabled until valid text is entered.
3. **Results & Auto-Advance**:
   - Immediate score card calculation upon submission.
   - Click **Continue Course**:
     - The system automatically navigates to the next unlocked video.
     - *Smart Auto-Advance*: If the immediate next chapter's first video is private/locked, the engine automatically skips it to launch the second playable video, or advances to the next playable chapter.

> 📸 **[SCREENSHOT PLACEHOLDER: Chapter Quiz Modal with Question Form and Score Summary]**
> *(Insert screenshot of Chapter Quiz popup and final score card here)*

---

### 5.6 Watch Later & Favorites Workflow
**Objective**: Bookmarking lectures for subsequent study.

#### Step-by-Step Navigation:
1. Under the video title, click the **`🔖 Watch Later`** pill button.
2. **System Response & Custom Alert**:
   - **First Time Added**: A custom success alert displays with a green checkmark icon:
     > *"Video has been added to watch later."*
   - **Already Exists (HTTP 431 / Duplicate)**: A custom informational alert displays with an indigo bookmark icon:
     > *"Video is already in watch later."*
   - The button maintains its clean, standard look for seamless continuous browsing.
3. **Accessing Saved Videos**:
   - Navigate to **Sidebar** -> **Watch Later** to view your collection.

> 📸 **[SCREENSHOT PLACEHOLDER: Watch Later Custom Alert Notification Popups]**
> *(Insert screenshot of the custom success and 431 duplicate alerts here)*

---

### 5.7 Profile Settings, Security & Subscription Plans Upgrade
**Objective**: Profile customization, password updates, and tier upgrades.

#### Step-by-Step Navigation:
1. Click your user avatar in the top right -> select **Profile**.
2. **Profile Tab**: Update full name, avatar, view total watch hours and quizzes completed.
3. **Security Tab**: Update your password with real-time validation.
4. **Subscription Upgrade Flow**:
   - Navigate to **Plans & Pricing** (`/plans`).
   - Toggle billing frequency (**Monthly** / **Yearly - 20% Discount**).
   - Review Tier Comparison:
     - **Free Tier (Current)**: Standard resolution, access to public community courses.
     - **Pro Tier**: HD streaming, access to all locked private lessons, offline downloads.
     - **Enterprise Tier**: 4K UHD streaming, 1-on-1 instructor mentoring, certificates.
   - Click **Upgrade Plan** to proceed through the checkout flow.

> 📸 **[SCREENSHOT PLACEHOLDER: Plans & Pricing Comparison Grid with Billing Toggle]**
> *(Insert screenshot of Plans & Pricing page showing 3 tiers and FAQ accordion here)*

---

## 6. Section E: System Error Codes & Troubleshooting Reference

| Error Code / Trigger | User-Facing Message | System Cause | Recommended Resolution |
| :---: | :---: | :---: | :---: |
| **HTTP 430** | *Your account has been deactivated. Please contact your administrator for assistance.* | Account suspended by Super Admin or Client Admin | Contact organization support team to reactivate access. |
| **HTTP 431** | *Video is already in watch later.* | Duplicate entry detected in user's saved video table | Video is already present in Watch Later list. Proceed to Watch Later to view. |
| **Free Plan Lock** | *Need to upgrade your plan* | Free tier learner attempting download or private lesson | Upgrade account to Pro or Enterprise plan in Plans & Pricing. |
| **Quiz Input Disabled** | *Button disabled (opacity 0.5)* | Free text input is blank or contains only empty spaces | Enter valid characters answering the prompt to enable the Next / Submit button. |
| **Token Expiry (401)** | *Automatic silent token refresh* | Access token lifespan expired | System automatically triggers `/auth/refresh`. If refresh token expired, user is safely redirected to Login. |

---

*Enterprise Video Streaming & LMS Platform SOP Manual | Generated and Maintained by System Engineering Team*
