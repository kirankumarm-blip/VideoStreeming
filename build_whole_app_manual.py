import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
import re
import os
import shutil

def replace_tenant(text):
    text = re.sub(r'Client\s*/\s*Tenant', 'Client', text)
    text = re.sub(r'Clients\s*/\s*Tenants', 'Clients', text)
    text = re.sub(r'Tenants\s*/\s*Clients', 'Clients', text)
    text = re.sub(r'Tenant\s*/\s*Client', 'Client', text)
    text = re.sub(r'Multi-Tenant', 'Multi-Client', text)
    text = re.sub(r'multi-tenant', 'multi-client', text)
    text = re.sub(r'Tenants', 'Clients', text)
    text = re.sub(r'tenants', 'clients', text)
    text = re.sub(r'Tenant', 'Client', text)
    text = re.sub(r'tenant', 'client', text)
    return text

def add_bookmark(paragraph, bookmark_id, bookmark_name):
    p_elm = paragraph._p
    for b in p_elm.xpath(f'.//w:bookmarkStart[@w:name="{bookmark_name}"]'):
        b.getparent().remove(b)
    for b in p_elm.xpath(f'.//w:bookmarkEnd[@w:id="{bookmark_id}"]'):
        b.getparent().remove(b)
        
    bm_start = OxmlElement('w:bookmarkStart')
    bm_start.set(qn('w:id'), str(bookmark_id))
    bm_start.set(qn('w:name'), bookmark_name)
    
    bm_end = OxmlElement('w:bookmarkEnd')
    bm_end.set(qn('w:id'), str(bookmark_id))
    
    p_elm.insert(0, bm_start)
    p_elm.append(bm_end)

def create_hyperlink_run(paragraph, anchor_name, text, is_subitem=False):
    p_elm = paragraph._p
    pPr = p_elm.get_or_add_pPr()
    if is_subitem:
        ind = OxmlElement('w:ind')
        ind.set(qn('w:left'), '360')
        pPr.append(ind)
        
    hyperlink = OxmlElement('w:hyperlink')
    hyperlink.set(qn('w:anchor'), anchor_name)
    
    run = OxmlElement('w:r')
    rPr = OxmlElement('w:rPr')
    color = OxmlElement('w:color')
    color.set(qn('w:val'), '1D4ED8') # Hyperlink blue
    rPr.append(color)
    u = OxmlElement('w:u')
    u.set(qn('w:val'), 'single')
    rPr.append(u)
    if not is_subitem:
        b = OxmlElement('w:b')
        rPr.append(b)
    run.append(rPr)
    
    t = OxmlElement('w:t')
    t.text = text
    t.set(qn('xml:space'), 'preserve')
    run.append(t)
    hyperlink.append(run)
    p_elm.append(hyperlink)

def insert_p_before(ref_p, text, style_name="Normal"):
    new_p = OxmlElement('w:p')
    run = OxmlElement('w:r')
    t = OxmlElement('w:t')
    t.text = text
    t.set(qn('xml:space'), 'preserve')
    run.append(t)
    new_p.append(run)
    ref_p.addprevious(new_p)
    return new_p

# Load clean document
doc = docx.Document('XLurn - User Manual.docx')

# 1. Clean tenant from all paragraphs and tables
for p in doc.paragraphs:
    if 'tenant' in p.text.lower():
        p.text = replace_tenant(p.text)
for t in doc.tables:
    for r in t.rows:
        for c in r.cells:
            if 'tenant' in c.text.lower():
                for p in c.paragraphs:
                    p.text = replace_tenant(p.text)

# 2. Locate Body Section E
sec_e_idx = None
for i, p in enumerate(doc.paragraphs[50:], start=50):
    if "6. Section E:" in p.text:
        sec_e_idx = i
        break

print(f"Body Section E found at P{sec_e_idx}")
sec_e_p = doc.paragraphs[sec_e_idx]._p

# Check if 5.8 is already inserted
has_58 = any("5.8 Virtual Classroom" in p.text for p in doc.paragraphs)
if not has_58:
    print("Inserting 5.8 to 5.12 before Section E...")
    insert_p_before(sec_e_p, "")
    insert_p_before(sec_e_p, "5.8 Virtual Classroom & Live Interactive Lectures")
    insert_p_before(sec_e_p, "Objective: Participate in scheduled and real-time live lectures, workshops, and webinars directly from the learner portal.")
    insert_p_before(sec_e_p, "Features & Interactive Tools:")
    insert_p_before(sec_e_p, "1. Live Classes Directory (/live-classes): Filter sessions by All, Live Now, Upcoming, or Recorded.")
    insert_p_before(sec_e_p, "2. Live Webcast Canvas (/live/:id): High-definition, low-latency live instructor video stream.")
    insert_p_before(sec_e_p, "3. Real-Time Attendee Counter: Displays total active students and instructors in the session.")
    insert_p_before(sec_e_p, "4. Raise Hand Feature: Allows learners to signal the instructor when questions arise.")
    insert_p_before(sec_e_p, "5. Interactive Live Polls: Real-time multiple-choice voting with dynamic class percentage results.")
    insert_p_before(sec_e_p, "6. Classroom Chat: Moderated group discussion with verified instructor messages.")

    insert_p_before(sec_e_p, "")
    insert_p_before(sec_e_p, "5.9 Collaborative Study Rooms & Watch Parties")
    insert_p_before(sec_e_p, "Objective: Group study sessions and peer accountability workspaces.")
    insert_p_before(sec_e_p, "Features & Tools:")
    insert_p_before(sec_e_p, "1. Join via 6-Character Room Code: Enter a private room code shared by a classmate.")
    insert_p_before(sec_e_p, "2. Create Custom Room: Choose a course topic, set room capacity, and invite study partners.")
    insert_p_before(sec_e_p, "3. Synchronized Pomodoro Focus Timer: 25-minute study intervals with 5-minute review breaks.")

    insert_p_before(sec_e_p, "")
    insert_p_before(sec_e_p, "5.10 Community & Discussion Boards")
    insert_p_before(sec_e_p, "Objective: Cross-course public student discussions, troubleshooting, and project peer reviews.")
    insert_p_before(sec_e_p, "Features:")
    insert_p_before(sec_e_p, "1. Topic Tags: Filter discussions by tags such as #React, #AI, #Algorithms, #SystemDesign.")
    insert_p_before(sec_e_p, "2. Ask Questions: Post queries with code snippets, course references, and formatted text.")
    insert_p_before(sec_e_p, "3. Upvoting Answers: Upvote verified solutions to elevate the highest-quality responses.")
    insert_p_before(sec_e_p, "4. Instructor Verification Badges: Responses reviewed and endorsed by course authors.")

    if os.path.exists("docs/screenshots/community_discussion_boards.png"):
        temp_p = doc.add_paragraph()
        temp_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = temp_p.add_run()
        r.add_picture("docs/screenshots/community_discussion_boards.png", width=Inches(6.2))
        cap_p = doc.add_paragraph()
        cap_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cap_r = cap_p.add_run("Figure 5.10: Community Discussion Boards & Topic Tag Filtering")
        cap_r.font.italic = True
        cap_r.font.size = Pt(9.5)
        cap_r.font.color.rgb = RGBColor(100, 116, 139)
        sec_e_p.addprevious(temp_p._p)
        sec_e_p.addprevious(cap_p._p)

    insert_p_before(sec_e_p, "")
    insert_p_before(sec_e_p, "5.11 Earned Certificates & Verified Credentials")
    insert_p_before(sec_e_p, "Objective: Accessing and downloading accredited course completion credentials.")
    insert_p_before(sec_e_p, "1. Open Sidebar -> Certificates (/certificates).")
    insert_p_before(sec_e_p, "2. Each certificate displays Course Title, Final Grade (>= 70%), Issue Date, and Credential ID.")
    insert_p_before(sec_e_p, "3. Click Download Certificate (PDF) to obtain an authenticated certificate.")

    insert_p_before(sec_e_p, "")
    insert_p_before(sec_e_p, "5.12 Help Center & Self-Service FAQ")
    insert_p_before(sec_e_p, "Objective: Instant self-service assistance for video playback, account management, and subscriptions.")
    insert_p_before(sec_e_p, "1. Open Sidebar -> Help & FAQ (/faq).")
    insert_p_before(sec_e_p, "2. Categorized answers for streaming resolution, quiz scoring rules, and billing.")

# 3. Master Table of Contents Specifications
toc_specs = [
    {"display": "1. Platform Architecture & Role-Based Access Matrix", "bm_name": "sec_architecture", "target": "1. Platform Architecture", "is_sub": False, "style": "Heading 1"},
    {"display": "2. Section A: Super Admin SOP Manual", "bm_name": "sec_super_admin", "target": "2. Section A: Super Admin", "is_sub": False, "style": "Heading 1"},
    {"display": "2.1 Super Admin Authentication & Global Dashboard", "bm_name": "sec_sa_auth_dashboard", "target": "2.1 Super Admin Authentication", "is_sub": True, "style": "Heading 2"},
    {"display": "2.2 Client Management", "bm_name": "sec_sa_client_mgmt", "target": "2.2 Client Management", "is_sub": True, "style": "Heading 2"},
    {"display": "2.3 Admin & Author Governance", "bm_name": "sec_sa_admin_author", "target": "2.3 Admin & Author", "is_sub": True, "style": "Heading 2"},
    {"display": "2.4 Global User Management & Security Audits", "bm_name": "sec_sa_user_mgmt", "target": "2.4 Global User Management", "is_sub": True, "style": "Heading 2"},
    {"display": "2.5 Global Content Catalog (Courses, Categories, Subcategories)", "bm_name": "sec_sa_catalog", "target": "2.5 Global Content Catalog", "is_sub": True, "style": "Heading 2"},
    {"display": "2.6 Platform Analytics, AI Insights & Support Center", "bm_name": "sec_sa_analytics", "target": "2.6 Platform Analytics", "is_sub": True, "style": "Heading 2"},
    {"display": "3. Section B: Client Admin (Organization Admin) SOP Manual", "bm_name": "sec_client_admin", "target": "3. Section B: Client Admin", "is_sub": False, "style": "Heading 1"},
    {"display": "3.1 Admin Authentication & Dashboard Overview", "bm_name": "sec_ca_auth_dashboard", "target": "3.1 Admin Authentication", "is_sub": True, "style": "Heading 2"},
    {"display": "3.2 Author (Instructor) Management", "bm_name": "sec_ca_author_mgmt", "target": "3.2 Author (Instructor) Management", "is_sub": True, "style": "Heading 2"},
    {"display": "3.3 Student / Learner Management & Activity Logs", "bm_name": "sec_ca_student_mgmt", "target": "3.3 Student", "is_sub": True, "style": "Heading 2"},
    {"display": "3.4 Content & Video Catalog Management", "bm_name": "sec_ca_catalog", "target": "3.4 Content & Video Catalog Management", "is_sub": True, "style": "Heading 2"},
    {"display": "3.5 Course Upload & Curriculum Builder (Chapters & Lessons)", "bm_name": "sec_ca_course_upload", "target": "3.5 Course Upload & Curriculum Builder", "is_sub": True, "style": "Heading 2"},
    {"display": "3.6 Quiz & Assessment Engine Management", "bm_name": "sec_ca_quiz_mgmt", "target": "3.6 Quiz & Assessment Engine Management", "is_sub": True, "style": "Heading 2"},
    {"display": "3.7 Sub-Admins, Roles, Permissions & Audit Trail", "bm_name": "sec_ca_roles_audit", "target": "3.7", "is_sub": True, "style": "Heading 2"},
    {"display": "4. Section C: Author Admin (Instructor / Content Creator) SOP Manual", "bm_name": "sec_author_admin", "target": "4. Section C: Author Admin", "is_sub": False, "style": "Heading 1"},
    {"display": "4.1 Author Dashboard & Studio Workspace", "bm_name": "sec_aa_dashboard", "target": "4.1 Author Dashboard", "is_sub": True, "style": "Heading 2"},
    {"display": "4.2 Video Upload & Transcoding Pipeline", "bm_name": "sec_aa_upload", "target": "4.2 Video Upload", "is_sub": True, "style": "Heading 2"},
    {"display": "4.3 Course Curriculum Authoring & Draft Workflow", "bm_name": "sec_aa_curriculum", "target": "4.3 Course Curriculum", "is_sub": True, "style": "Heading 2"},
    {"display": "4.4 Interactive Quiz Question Creation", "bm_name": "sec_aa_quiz_creation", "target": "4.4 Interactive Quiz Question Creation", "is_sub": True, "style": "Heading 2"},
    {"display": "5. Section D: End Learner (User) Portal SOP Manual", "bm_name": "sec_learner_portal", "target": "5. Section D: End Learner", "is_sub": False, "style": "Heading 1"},
    {"display": "5.1 Account Registration, Login, OTP & Password Recovery", "bm_name": "sec_lrn_auth_otp", "target": "5.1 Account Registration", "is_sub": True, "style": "Heading 2"},
    {"display": "5.2 Home Feed, Category Browsing & Search", "bm_name": "sec_lrn_home_search", "target": "5.2 Home Feed", "is_sub": True, "style": "Heading 2"},
    {"display": "5.3 Course Enrollment & Video Watch Room", "bm_name": "sec_lrn_watch_room", "target": "5.3 Course Enrollment", "is_sub": True, "style": "Heading 2"},
    {"display": "5.4 Video Player Controls, Anti-Piracy Watermarks & Fullscreen", "bm_name": "sec_lrn_player_controls", "target": "5.4 Video Player Controls", "is_sub": True, "style": "Heading 2"},
    {"display": "5.5 Chapter Quizzes & Assessment Submissions", "bm_name": "sec_lrn_quizzes", "target": "5.5 Chapter Quizzes", "is_sub": True, "style": "Heading 2"},
    {"display": "5.6 Watch Later & Favorites Workflow", "bm_name": "sec_lrn_watch_later", "target": "5.6 Watch Later", "is_sub": True, "style": "Heading 2"},
    {"display": "5.7 Profile Settings, Security & Subscription Plans Upgrade", "bm_name": "sec_lrn_profile_plans", "target": "5.7 Profile Settings", "is_sub": True, "style": "Heading 2"},
    {"display": "5.8 Virtual Classroom & Live Interactive Lectures", "bm_name": "sec_lrn_virtual_class", "target": "5.8 Virtual Classroom", "is_sub": True, "style": "Heading 2"},
    {"display": "5.9 Collaborative Study Rooms & Watch Parties", "bm_name": "sec_lrn_study_rooms", "target": "5.9 Collaborative Study Rooms", "is_sub": True, "style": "Heading 2"},
    {"display": "5.10 Community & Discussion Boards", "bm_name": "sec_lrn_community", "target": "5.10 Community & Discussion Boards", "is_sub": True, "style": "Heading 2"},
    {"display": "5.11 Earned Certificates & Verified Credentials", "bm_name": "sec_lrn_certificates", "target": "5.11 Earned Certificates", "is_sub": True, "style": "Heading 2"},
    {"display": "5.12 Help Center & Self-Service FAQ", "bm_name": "sec_lrn_faq", "target": "5.12 Help Center", "is_sub": True, "style": "Heading 2"},
    {"display": "6. Section E: System Error Codes & Troubleshooting Reference", "bm_name": "sec_troubleshooting", "target": "6. Section E: System Error Codes", "is_sub": False, "style": "Heading 1"}
]

# 4. Find TOC header
toc_header_idx = None
for i, p in enumerate(doc.paragraphs[:20]):
    if "Table of Contents" in p.text:
        toc_header_idx = i
        break

print(f"Table of Contents is at index {toc_header_idx}")
body_search_start = toc_header_idx + 40

# 5. Add bookmarks to body headings
bm_id = 6000
for item in toc_specs:
    bm_id += 1
    target_str = item["target"].lower()
    bm_name = item["bm_name"]
    found_p = None
    for p in doc.paragraphs[body_search_start:]:
        if target_str in p.text.lower():
            found_p = p
            break
            
    if found_p:
        try:
            found_p.style = doc.styles[item["style"]]
        except Exception:
            pass
        add_bookmark(found_p, bm_id, bm_name)
        print(f"[OK BM] {bm_name:<24} -> P: '{found_p.text[:45]}'")
    else:
        print(f"[FAIL BM] Missing target for: {item['display']}")

# 6. Rebuild Table of Contents
# First, remove existing TOC paragraphs between toc_header_idx and "1. Platform Architecture"
current_idx = toc_header_idx + 1
while current_idx < len(doc.paragraphs):
    p = doc.paragraphs[current_idx]
    if "1. Platform Architecture" in p.text and not p._p.xpath('.//w:hyperlink'):
        break
    # Remove this paragraph
    p._p.getparent().remove(p._p)

# Now, insert new TOC paragraphs right after toc_header_idx
header_p_elm = doc.paragraphs[toc_header_idx]._p
for item in reversed(toc_specs):
    new_p_elm = OxmlElement('w:p')
    new_p = docx.text.paragraph.Paragraph(new_p_elm, doc)
    create_hyperlink_run(new_p, item["bm_name"], item["display"], is_subitem=item["is_sub"])
    header_p_elm.addnext(new_p_elm)

# Save to all target paths
paths = [
    'XLurn - User Manual.docx',
    'XLurn - Complete Platform User Manual.docx',
    'docs/XLurn - User Manual.docx',
    'docs/XLurn - Complete Platform User Manual.docx'
]

for out_path in paths:
    doc.save(out_path)
    print(f"Successfully written: {out_path} ({os.path.getsize(out_path)} bytes)")
