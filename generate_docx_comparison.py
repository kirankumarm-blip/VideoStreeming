import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def set_cell_border(cell, **kwargs):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(f'<w:tcBorders {nsdecls("w")}/>')
    for edge in ('top', 'left', 'bottom', 'right'):
        edge_data = kwargs.get(edge)
        if edge_data:
            tag = f'<w:{edge} {nsdecls("w")} w:val="{edge_data.get("val", "single")}" w:sz="{edge_data.get("sz", 4)}" w:space="0" w:color="{edge_data.get("color", "CBD5E1")}"/>'
            tcBorders.append(parse_xml(tag))
        else:
            tag = f'<w:{edge} {nsdecls("w")} w:val="none"/>'
            tcBorders.append(parse_xml(tag))
    tcPr.append(tcBorders)

def create_comparison_docx(filename):
    doc = docx.Document()

    # Set page margins (0.75 in)
    for section in doc.sections:
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)

    # Styles & Fonts
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Calibri'
    normal_style.font.size = Pt(10)
    normal_style.font.color.rgb = RGBColor(30, 41, 59) # Slate 800

    # Colors
    NAVY = RGBColor(30, 58, 138)         # #1E3A8A
    BLUE = RGBColor(37, 99, 235)         # #2563EB
    DARK_TEXT = RGBColor(30, 41, 59)     # #1E293B
    MUTED_TEXT = RGBColor(100, 116, 139) # #64748B
    GREEN_TEXT = RGBColor(22, 101, 52)   # #166534
    AMBER_TEXT = RGBColor(180, 83, 9)    # #B45309
    RED_TEXT = RGBColor(185, 28, 28)     # #B91C1C

    # Header Badge
    p_badge = doc.add_paragraph()
    p_badge.paragraph_format.space_before = Pt(0)
    p_badge.paragraph_format.space_after = Pt(4)
    run_badge = p_badge.add_run("COMPREHENSIVE EDTECH BENCHMARK REPORT  |  VERSION 2.1 (FACT-CHECKED & EXPANDED)")
    run_badge.font.size = Pt(9)
    run_badge.font.bold = True
    run_badge.font.color.rgb = BLUE

    # Main Title
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(6)
    run_title = p_title.add_run("Platform Comparison Document:\nXLURN vs. Industry-Leading EdTech & LMS Platforms")
    run_title.font.name = 'Arial'
    run_title.font.size = Pt(21)
    run_title.font.bold = True
    run_title.font.color.rgb = NAVY

    # Subtitle
    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(16)
    run_sub = p_sub.add_run("A rigorous, fact-checked architectural evaluation against Udemy, Coursera, Teachable, Canvas LMS, Moodle, Docebo, and TalentLMS.")
    run_sub.font.size = Pt(10.5)
    run_sub.font.italic = True
    run_sub.font.color.rgb = MUTED_TEXT

    # Divider line
    p_div = doc.add_paragraph()
    p_div.paragraph_format.space_after = Pt(14)
    p_div_border = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="12" w:space="1" w:color="CBD5E1"/></w:pBdr>')
    p_div._p.get_or_add_pPr().append(p_div_border)

    def add_heading_1(text):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(18)
        h.paragraph_format.space_after = Pt(6)
        h.paragraph_format.keep_with_next = True
        r = h.add_run(text)
        r.font.name = 'Arial'
        r.font.size = Pt(13.5)
        r.font.bold = True
        r.font.color.rgb = NAVY
        return h

    def add_heading_2(text):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(12)
        h.paragraph_format.space_after = Pt(4)
        h.paragraph_format.keep_with_next = True
        r = h.add_run(text)
        r.font.name = 'Arial'
        r.font.size = Pt(11.5)
        r.font.bold = True
        r.font.color.rgb = BLUE
        return h

    def add_callout(title, body):
        table = doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = table.cell(0, 0)
        cell.width = Inches(7.0)
        set_cell_background(cell, "F8FAFC")
        set_cell_margins(cell, top=130, bottom=130, left=180, right=180)
        set_cell_border(cell, 
                        left=dict(val="single", sz=24, color="2563EB"),
                        top=dict(val="single", sz=4, color="E2E8F0"),
                        bottom=dict(val="single", sz=4, color="E2E8F0"),
                        right=dict(val="single", sz=4, color="E2E8F0"))
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(2)
        r_title = p.add_run(f"EXECUTIVE SUMMARY: {title}\n")
        r_title.font.bold = True
        r_title.font.size = Pt(9.5)
        r_title.font.color.rgb = BLUE
        r_body = p.add_run(body)
        r_body.font.size = Pt(9)
        r_body.font.color.rgb = DARK_TEXT
        doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # 1. Executive Summary & Market Segmentation
    add_heading_1("1. Executive Summary & Market Segmentation")
    p1 = doc.add_paragraph(
        "In modern digital education, educational organizations frequently struggle with fragmented software stacks. "
        "Standard video conferencing tools (Zoom, Microsoft Teams) provide real-time meetings without structured course syllabi "
        "or progress tracking, while open streaming platforms (YouTube) offer broadcast reach without educational access control. "
        "A true Learning Management System (LMS) must coordinate asynchronous curriculum progression, synchronous classroom experiences, "
        "rigorous assessment tracking, content protection, and credentialing."
    )
    p1.paragraph_format.space_after = Pt(6)

    p2 = doc.add_paragraph(
        "To deliver a complete, fact-checked analysis, this benchmark evaluates XLURN against established industry platforms "
        "across both commercial EdTech marketplaces and enterprise/institutional LMS categories:"
    )
    p2.paragraph_format.space_after = Pt(6)

    segments = [
        ("Commercial Course & Creator Platforms: ", "Udemy (consumer video marketplace), Coursera (university-partnered degrees & MOOCs), and Teachable (creator course sales & coaching SaaS)."),
        ("Institutional & Enterprise LMS Platforms: ", "Canvas LMS (academic gold standard), Moodle (global open-source LMS), Docebo (enterprise AI training), and TalentLMS (mid-market corporate learning).")
    ]
    for s_title, s_desc in segments:
        bp = doc.add_paragraph(style='List Bullet')
        bp.paragraph_format.space_after = Pt(3)
        r1 = bp.add_run(s_title)
        r1.font.bold = True
        r1.font.color.rgb = NAVY
        bp.add_run(s_desc)

    add_callout(
        "The Hybrid Architectural Paradigm of XLURN",
        "XLURN bridges the historical divide between commercial course platforms and institutional LMSs by combining "
        "asynchronous video courses, browser-native WebRTC live classroom broadcasting, synchronized doubt hand-raise queues, "
        "dynamic forensic anti-piracy watermarking, and instant client-side theme customization into a single unified web platform."
    )

    # 2. Competitor Baseline Profiles
    add_heading_1("2. Competitor Architectural Profiles")
    
    profiles_data = [
        ("XLURN", "EdTech Bootcamps & Higher Ed", "React SPA + Node.js/WebRTC + Resilient Fallback", "Proprietary Native WebRTC Studio inside Admin; real-time doubt queue & in-stream polls."),
        ("Udemy", "Consumer Course Marketplace", "Proprietary Cloud SaaS Video Streaming", "None. 100% pre-recorded video on-demand; no live broadcasting capability."),
        ("Coursera", "University & Enterprise Degrees", "Cloud SaaS with University Partner Integrations", "Externalized. Live office hours hosted via external Zoom links; no in-house live studio."),
        ("Teachable", "Creator Course SaaS", "Hosted SaaS with Wistia Video Hosting", "Third-Party Embed. Creators embed YouTube/Vimeo streams or link to external Zoom calls."),
        ("Canvas LMS", "Higher Ed & K-12 Academic", "Ruby on Rails + React SaaS (AWS Multi-tenant)", "External LTI Connectors. Integrates with Zoom, Teams, or BigBlueButton; no native WebRTC studio."),
        ("Moodle", "Open-Source Global Higher Ed", "PHP / MySQL (Self-Hosted or MoodleCloud)", "BigBlueButton Core Activity. Requires external, dedicated BigBlueButton media server cluster."),
        ("Docebo", "Global Enterprise Corporate Training", "Cloud SaaS with proprietary AI skills engine", "Web Conferencing Connectors. Connects to external Zoom, Webex, Teams, GoToMeeting."),
        ("TalentLMS", "Mid-Market Corporate Training", "Cloud SaaS with multi-tenant Branches", "Webinar Integrations. Integrates with Zoom, Teams, GoToMeeting, BigBlueButton.")
    ]

    table_profiles = doc.add_table(rows=len(profiles_data) + 1, cols=4)
    table_profiles.alignment = WD_TABLE_ALIGNMENT.CENTER
    prof_headers = ["Platform", "Market Segment", "Core Architecture", "Live Virtual Classroom Approach"]
    col_widths = [Inches(1.1), Inches(1.5), Inches(2.0), Inches(2.4)]
    
    # Format header row
    hdr_row = table_profiles.rows[0]
    for idx, text in enumerate(prof_headers):
        cell = hdr_row.cells[idx]
        cell.width = col_widths[idx]
        set_cell_background(cell, "1E3A8A")
        set_cell_margins(cell, top=100, bottom=100, left=100, right=100)
        p = cell.paragraphs[0]
        r = p.add_run(text)
        r.font.bold = True
        r.font.size = Pt(8.5)
        r.font.color.rgb = RGBColor(255, 255, 255)

    for row_idx, data in enumerate(profiles_data, start=1):
        row = table_profiles.rows[row_idx]
        bg_color = "F8FAFC" if row_idx % 2 == 1 else "FFFFFF"
        if row_idx == 1:
            bg_color = "EFF6FF" # Light blue highlight for XLURN
        for col_idx, text in enumerate(data):
            cell = row.cells[col_idx]
            cell.width = col_widths[col_idx]
            set_cell_background(cell, bg_color)
            set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
            set_cell_border(cell, 
                            top=dict(val="single", sz=4, color="E2E8F0"),
                            bottom=dict(val="single", sz=4, color="E2E8F0"),
                            left=dict(val="none"), right=dict(val="none"))
            p = cell.paragraphs[0]
            r = p.add_run(text)
            r.font.size = Pt(8)
            if col_idx == 0:
                r.font.bold = True
                if row_idx == 1:
                    r.font.color.rgb = NAVY

    doc.add_paragraph().paragraph_format.space_after = Pt(14)

    # Helper function to render a comparison table
    def render_comp_table(headers, widths, rows_data):
        t = doc.add_table(rows=len(rows_data) + 1, cols=len(headers))
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        
        # Header
        h_row = t.rows[0]
        for idx, text in enumerate(headers):
            c = h_row.cells[idx]
            c.width = widths[idx]
            set_cell_background(c, "1E3A8A")
            set_cell_margins(c, top=90, bottom=90, left=80, right=80)
            p = c.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if idx > 0 else WD_ALIGN_PARAGRAPH.LEFT
            r = p.add_run(text)
            r.font.bold = True
            r.font.size = Pt(8)
            r.font.color.rgb = RGBColor(255, 255, 255)

        for r_idx, row_values in enumerate(rows_data, start=1):
            row = t.rows[r_idx]
            bg = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
            for c_idx, val in enumerate(row_values):
                cell = row.cells[c_idx]
                cell.width = widths[c_idx]
                cell_bg = "EFF6FF" if c_idx == 1 else bg
                set_cell_background(cell, cell_bg)
                set_cell_margins(cell, top=70, bottom=70, left=80, right=80)
                set_cell_border(cell, 
                                top=dict(val="single", sz=4, color="E2E8F0"),
                                bottom=dict(val="single", sz=4, color="E2E8F0"),
                                left=dict(val="none"), right=dict(val="none"))
                p = cell.paragraphs[0]
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER if c_idx > 0 else WD_ALIGN_PARAGRAPH.LEFT
                r = p.add_run(val)
                r.font.size = Pt(7.5)
                if "[YES]" in val:
                    r.font.bold = True
                    r.font.color.rgb = NAVY if c_idx == 1 else GREEN_TEXT
                elif "[PARTIAL]" in val:
                    r.font.color.rgb = AMBER_TEXT
                elif "[NO]" in val:
                    r.font.color.rgb = RED_TEXT
        doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # 3. Comparison Matrix 1: XLURN vs Commercial Course Platforms
    add_heading_1("3. Comparison Matrix 1: XLURN vs. Commercial Course Platforms")
    doc.add_paragraph(
        "Benchmarking XLURN against Udemy, Coursera, and Teachable across core video, interactive teaching, and security features:"
    ).paragraph_format.space_after = Pt(4)

    c1_headers = ["Capability / Feature", "XLURN", "Udemy", "Coursera", "Teachable"]
    c1_widths = [Inches(2.4), Inches(1.4), Inches(1.1), Inches(1.1), Inches(1.0)]
    c1_data = [
        # Synch
        ("Browser-Native WebRTC Studio in Admin", "[YES] Built-in", "[NO] On-demand only", "[NO] (External Zoom)", "[NO] (Embed only)"),
        ("Synchronized Doubt Queue & Hand-Raise", "[YES] Native Queue", "[NO] None", "[NO] None", "[NO] None"),
        ("Live In-Stream Polling with HUD Overlay", "[YES] Built-in", "[NO] None", "[NO] None", "[NO] None"),
        ("Integrated Live Text Chat & Viewer Count", "[YES] Built-in", "[NO] None", "[PARTIAL] (Zoom in deg)", "[PARTIAL] (Basic embed)"),
        # Asynch
        ("Structured Chapter Video Course Player", "[YES] Native", "[YES] Proprietary", "[YES] Interactive", "[YES] Wistia player"),
        ("Timestamped Video Notes & Bookmarks", "[YES] Native", "[YES] Course notes", "[YES] In-video notes", "[NO] Basic notes"),
        ("Integrated Offline Video Downloads", "[YES] Native Web/App", "[PARTIAL] Mobile only", "[PARTIAL] Mobile only", "[NO] None"),
        ("Multi-Bitrate / Adaptive Resolution", "[YES] Native", "[YES] 360p-1080p", "[YES] Adaptive HLS", "[YES] Adaptive HLS"),
        # Security
        ("Dynamic Anti-Piracy Floating Watermark", "[YES] Built-in", "[NO] None", "[NO] None", "[NO] None"),
        ("Multi-Tab Inactivity Heartbeat & Auto-Logout", "[YES] 10-min Sync", "[NO] Session cookie", "[NO] Session cookie", "[NO] Session cookie"),
        ("Two-Factor Authentication (2FA) with OTP", "[YES] Built-in OTP", "[PARTIAL] Auth App", "[PARTIAL] SSO/Auth App", "[NO] Password only"),
        # Social
        ("Dedicated Persistent Virtual Study Rooms", "[YES] Built-in", "[NO] None", "[NO] None", "[NO] None"),
        ("Peer Discussion & Doubt Clearing", "[YES] Native Chat", "[PARTIAL] Q&A Forum", "[PARTIAL] Forums", "[PARTIAL] Circles"),
        ("Peer-Reviewed Assignments & Projects", "[PARTIAL] Basic", "[NO] None", "[YES] Industry Top", "[NO] None"),
        # Certs
        ("Formative & Summative Timed Quizzes", "[YES] Native", "[PARTIAL] Multiple choice", "[YES] Advanced", "[PARTIAL] Basic"),
        ("Accredited Degrees & Proctored Exams", "[NO] Non-accredited", "[NO] None", "[YES] Accredited Degrees", "[NO] None"),
        ("Instant Verifiable PDF Completion Certs", "[YES] Built-in", "[PARTIAL] Unaccredited", "[YES] Verified Cred.", "[PARTIAL] Basic"),
        # UI
        ("Real-Time Live CSS Appearance Customizer", "[YES] Zero-Reload", "[NO] Fixed UI", "[NO] Fixed UI", "[NO] Site builder"),
        ("Instant Dark / Light Theme Toggle", "[YES] Native", "[NO] Light only (web)", "[NO] Light only", "[NO] Light only"),
        ("Dynamic Multi-Language Localization Engine", "[YES] EN/ES/HI/KN", "[PARTIAL] Captions only", "[YES] Multilingual", "[PARTIAL] English 1st"),
        ("Commercial Subscriptions & Checkout Funnels", "[YES] Built-in Plans", "[PARTIAL] Marketplace", "[PARTIAL] Enterprise", "[YES] Industry Top")
    ]
    render_comp_table(c1_headers, c1_widths, c1_data)

    # 4. Comparison Matrix 2: XLURN vs Institutional & Enterprise LMS Platforms
    add_heading_1("4. Comparison Matrix 2: XLURN vs. Institutional & Enterprise LMS Platforms")
    doc.add_paragraph(
        "Benchmarking XLURN against Canvas LMS, Moodle, Docebo, and TalentLMS:"
    ).paragraph_format.space_after = Pt(4)

    c2_headers = ["Capability / Feature", "XLURN", "Canvas LMS", "Moodle", "Docebo", "TalentLMS"]
    c2_widths = [Inches(2.2), Inches(1.2), Inches(1.0), Inches(1.0), Inches(0.9), Inches(0.9)]
    c2_data = [
        # Synch
        ("Browser-Native WebRTC Studio in Admin", "[YES] Built-in", "[NO] (LTI only)", "[PARTIAL] (BBB server)", "[NO] (Connector)", "[NO] (Connector)"),
        ("Synchronized Doubt Queue & Hand-Raise", "[YES] Native Queue", "[PARTIAL] (In meeting)", "[PARTIAL] (In meeting)", "[PARTIAL] (In meeting)", "[PARTIAL] (In meeting)"),
        ("Live In-Stream Polling with HUD Overlay", "[YES] Built-in", "[PARTIAL] (In meeting)", "[PARTIAL] (In meeting)", "[PARTIAL] (In meeting)", "[PARTIAL] (In meeting)"),
        # Asynch
        ("Structured Chapter Video Player", "[YES] Native", "[YES] Canvas Studio", "[YES] HTML5/H5P", "[YES] Native player", "[YES] Native player"),
        ("Timestamped Video Notes & Markers", "[YES] Native", "[YES] Canvas Studio", "[PARTIAL] Via H5P", "[PARTIAL] Time markers", "[NO] Basic notes"),
        ("Integrated Offline Video Downloads", "[YES] Native Web/App", "[PARTIAL] Mobile App", "[PARTIAL] Mobile App", "[PARTIAL] Mobile App", "[PARTIAL] Mobile App"),
        # Security
        ("Dynamic Anti-Piracy Floating Watermark", "[YES] Built-in", "[NO] None", "[NO] None", "[NO] None", "[NO] None"),
        ("Multi-Tab Inactivity Heartbeat & Logout", "[YES] 10-min Sync", "[NO] Session cookie", "[NO] Server cookie", "[NO] Server cookie", "[NO] Server cookie"),
        ("Two-Factor Authentication (2FA) with OTP", "[YES] Built-in OTP", "[PARTIAL] Via SSO/MFA", "[YES] Core MFA", "[YES] Via SSO/TOTP", "[PARTIAL] Pro Tier"),
        # Social
        ("Dedicated Persistent Virtual Study Rooms", "[YES] Built-in", "[NO] None", "[NO] None", "[PARTIAL] Coach/Share", "[NO] None"),
        ("Discussion Boards & Course Comments", "[YES] Native", "[YES] Advanced", "[YES] Advanced", "[YES] Channels", "[YES] Basic forum"),
        # Certs
        ("Formative & Summative Timed Quizzes", "[YES] Native", "[YES] Classic & New", "[YES] Industry Top", "[YES] Tests module", "[YES] Tests engine"),
        ("Rubric-Based Grading & SpeedGrader", "[PARTIAL] Basic", "[YES] Industry Top", "[YES] Advanced", "[PARTIAL] Standard", "[PARTIAL] Standard"),
        ("Instant Verifiable PDF Completion Certs", "[YES] Built-in", "[PARTIAL] Badgr LTI", "[PARTIAL] Plugin", "[YES] Certs app", "[YES] Templates"),
        # UI
        ("Real-Time Live CSS Appearance Customizer", "[YES] Zero-Reload", "[NO] Admin reload", "[NO] Theme reload", "[NO] Admin backend", "[NO] Admin reload"),
        ("Instant Dark / Light Theme Toggle", "[YES] Native", "[NO] Custom CSS", "[PARTIAL] Theme dep.", "[NO] Light only", "[NO] Light only"),
        ("Dynamic Multi-Language Localization Engine", "[YES] EN/ES/HI/KN", "[YES] 30+ Langs", "[YES] 100+ Langs", "[YES] 40+ Langs", "[YES] 30+ Langs"),
        # Architecture
        ("3-Tier Multi-Tenancy Hierarchy", "[YES] Native 3-Tier", "[YES] Sub-accounts", "[YES] Role matrix", "[YES] Branches", "[YES] Branches"),
        ("Dual-Mode Resilient Hosting Fallback", "[YES] Resilient", "[NO] Cloud SaaS", "[NO] Server dep.", "[NO] Cloud SaaS", "[NO] Cloud SaaS"),
        ("LTI 1.3 Advantage & SCORM Standard", "[PARTIAL] Roadmap", "[YES] Gold Standard", "[YES] Full SCORM/LTI", "[YES] Full SCORM/xAPI", "[YES] Full SCORM")
    ]
    render_comp_table(c2_headers, c2_widths, c2_data)

    # 5. Detailed Analytical Evaluation by Pillar
    add_heading_1("5. In-Depth Analytical Evaluation Across Key Pillars")

    evaluations = [
        ("Pillar 1: Synchronous Virtual Classroom & Live Webcasting",
         "The Reality across Commercial Platforms (Udemy, Teachable, Coursera):\n"
         "• Udemy is entirely pre-recorded; instructors have zero live webcasting capabilities.\n"
         "• Teachable has no native live studio; creators must embed an unlisted YouTube/Vimeo stream or share external Zoom links.\n"
         "• Coursera office hours are conducted via external Zoom links; it lacks an in-house browser-native WebRTC broadcast studio.\n\n"
         "The Reality across Enterprise LMSs (Canvas, Docebo, TalentLMS):\n"
         "• Live video conferencing is an external dependency requiring paid Zoom Pro, Microsoft Teams, or BigBlueButton server clusters.\n\n"
         "XLURN's Native Architecture:\n"
         "Instructors click 'Go Live' directly inside their Admin portal. XLURN captures webcam, mic, or screen sharing via browser-native WebRTC "
         "and broadcasts directly to enrolled learners. Questions enter an organized 'Priority Doubt Queue' on the instructor's console, "
         "and in-stream interactive polls render as HUD overlays with real-time vote tallying."),

        ("Pillar 2: Content Protection & Dynamic Anti-Piracy Watermarking",
         "The Reality across Competitors:\n"
         "None of the evaluated platforms (Udemy, Coursera, Teachable, Canvas, Moodle, Docebo) offer client-side dynamic forensic watermarking on video streams. "
         "Courses hosted on Wistia, Vimeo, or standard HTML5 players are routinely captured using screen-recording software (OBS Studio, Camtasia) "
         "or HDMI capture cards and illicitly redistributed.\n\n"
         "XLURN's Forensic Watermarking:\n"
         "XLURN dynamically projects a semi-transparent watermark containing the learner's User ID, registered email, and session timestamp "
         "moving across the video player at randomized coordinates and opacity. Any screen recording permanently brands the user's verified identity, "
         "making illicit redistribution immediately traceable and legally actionable."),

        ("Pillar 3: Multi-Tab Inactivity Heartbeat & Account Security",
         "The Reality across Competitors:\n"
         "Competitor platforms rely on passive HTTP session cookies that stay open indefinitely until explicit logout or page refresh. "
         "On shared library terminals, university computer labs, or office workstations, unattended student accounts are vulnerable to session hijacking.\n\n"
         "XLURN's Cross-Tab Inactivity Guard:\n"
         "XLURN implements active cross-tab heartbeat synchronization utilizing localStorage and window storage event listeners. "
         "If no keyboard, touch, or mouse interaction occurs across any open tab for 10 consecutive minutes, the active session "
         "securely terminates across all open tabs simultaneously, paired with mandatory Two-Factor Authentication (2FA) numeric OTP verification."),

        ("Pillar 4: Real-Time UI Theme Engine & Sensory Accessibility",
         "The Reality across Competitors:\n"
         "Udemy, Coursera, and Canvas offer no real-time client-side theme customizer. Theme updates on Teachable or Moodle require administrative "
         "dashboard reconfigurations and page reloads.\n\n"
         "XLURN's Dynamic Customizer:\n"
         "XLURN includes a zero-latency Appearance Customizer Drawer manipulating CSS root variables live. "
         "Learners can switch between 6 color palettes, toggle Light/Dark mode instantly, scale typography from 85% to 125%, "
         "and choose typefaces without reloading the application or interrupting video playback.")
    ]

    for title, text in evaluations:
        add_heading_2(title)
        p = doc.add_paragraph(text)
        p.paragraph_format.space_after = Pt(8)

    # 6. Objective Strengths Analysis
    add_heading_1("6. Objective Strengths: Where Competitors Lead vs. Where XLURN Leads")
    
    add_heading_2("Where Commercial & Enterprise Competitors Excel:")
    comp_leads = [
        ("Accredited Degrees & Cloud Proctored Exams (Coursera): ", "Coursera delivers fully accredited university Master's degrees, proctored exams (ProctorU), and interactive cloud Guided Projects."),
        ("Consumer Course Discovery & Marketplace Scale (Udemy): ", "Udemy offers over 200,000 consumer courses and millions of students worldwide, providing unmatched organic marketplace discovery."),
        ("Creator Sales Funnels & Checkout Bumps (Teachable): ", "Teachable provides advanced checkout order bumps, 1-click upsells, affiliate management, and automated tax handling (Teachable Pay)."),
        ("Academic SpeedGrader & Rubric Grading (Canvas LMS): ", "Canvas provides the academic gold standard for rubric-based grading, annotation feedback, and gradebook workflows."),
        ("Open-Source Extensibility (Moodle): ", "Moodle's 2,000+ community plugins and translation into 100+ languages offer unmatched institutional customizability.")
    ]
    for b_title, b_desc in comp_leads:
        bp = doc.add_paragraph(style='List Bullet')
        bp.paragraph_format.space_after = Pt(3)
        r1 = bp.add_run(b_title)
        r1.font.bold = True
        r1.font.color.rgb = AMBER_TEXT
        bp.add_run(b_desc)

    add_heading_2("Where XLURN Delivers Clear Differentiators:")
    xlurn_leads = [
        ("Zero-SaaS Live Classroom Consolidation: ", "Eliminates multi-thousand dollar external Zoom/Teams subscriptions by embedding WebRTC broadcasting and studio controls directly into core LMS administration."),
        ("Synchronized In-Stream Doubt Clearance: ", "Replaces noisy meeting chatrooms with an organized Priority Doubt Queue tied directly to the instructor's studio console."),
        ("Forensic Dynamic Anti-Piracy Watermarking: ", "Prevents illicit course screen-recording by dynamically projecting user identity credentials across playback without expensive DRM licensing."),
        ("Cross-Tab Inactivity Heartbeat: ", "Protects shared devices via multi-tab idle detection and coordinated auto-logout."),
        ("Instant Live Appearance Customization: ", "Empowers learners with immediate, client-side control over typography scale, color palettes, and dark mode without page refreshes.")
    ]
    for b_title, b_desc in xlurn_leads:
        bp = doc.add_paragraph(style='List Bullet')
        bp.paragraph_format.space_after = Pt(3)
        r1 = bp.add_run(b_title)
        r1.font.bold = True
        r1.font.color.rgb = NAVY
        bp.add_run(b_desc)

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # 7. Economic Value Proposition
    add_heading_1("7. Economic Value Proposition & Total Cost of Ownership (TCO)")
    p_tco = doc.add_paragraph(
        "A typical institution or academy delivering interactive digital education must license and maintain multiple disconnected software subscriptions:\n"
        "• LMS or Course Hosting Platform (Teachable/Canvas/Docebo): $1,200 – $15,000+/year\n"
        "• Video Conferencing Licenses (Zoom Pro/Teams Webinar): $240 – $1,200/instructor/year\n"
        "• Video Hosting & CDN Streaming (Vimeo OTT/Wistia/AWS): $600 – $3,000+/year\n"
        "• Live Audience Polling Tool (Slido/Mentimeter): $300 – $1,200/year\n"
        "• Digital Credential Verification Service (Accredible/Badgr): $500 – $2,500/year"
    )
    p_tco.paragraph_format.space_after = Pt(8)

    add_callout(
        "Consolidation Dividend",
        "XLURN consolidates these 5 separate subscription costs into a single, cohesive web platform. "
        "Beyond direct license savings, organizations eliminate single sign-on (SSO) integration failures, "
        "fragmented student data pipelines, and the administrative burden of managing multi-vendor contracts."
    )

    # 8. Conclusion
    add_heading_1("8. Conclusion & Strategic Positioning")
    p_conc = doc.add_paragraph(
        "By consolidating on-demand course delivery with Browser-Native WebRTC Live Broadcasting, "
        "Dynamic Anti-Piracy Watermarking, and Real-Time Learner Theme Customization, XLURN successfully bridges "
        "the gap between commercial course marketplaces (Udemy, Teachable), academic giants (Coursera, Canvas), "
        "and enterprise training platforms (Docebo, TalentLMS)."
    )
    p_conc.paragraph_format.space_after = Pt(14)

    # Signature / Metadata Box
    p_meta = doc.add_paragraph()
    p_meta.paragraph_format.space_before = Pt(12)
    p_meta_border = parse_xml(f'<w:pBdr {nsdecls("w")}><w:top w:val="single" w:sz="6" w:space="1" w:color="E2E8F0"/></w:pBdr>')
    p_meta._p.get_or_add_pPr().append(p_meta_border)
    r_meta = p_meta.add_run("Document generated for XLURN Engineering & Product Governance | Benchmark Version: 2.1 (Fact-Checked & Expanded)")
    r_meta.font.size = Pt(8.5)
    r_meta.font.color.rgb = MUTED_TEXT

    doc.save(filename)
    print(f"Document saved successfully as: {filename}")

if __name__ == '__main__':
    create_comparison_docx('PLATFORM_COMPARISON_XLURN.docx')
