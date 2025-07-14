--
-- Comprehensive Seed Data for LawTime Application
-- File: seed_data.sql
-- Description: Extensive test data covering all tables and edge cases for development and testing
--

-- IMPORTANT: This script assumes auth.users records exist
-- You may need to create auth users first via Supabase Auth API or dashboard

-- ================================
-- 1. PROFILES TABLE SEED DATA
-- ================================
-- Test users with different configurations and edge cases

INSERT INTO public.profiles (id, status, default_alert_offset_minutes, updated_at) VALUES
-- Active users with various alert settings
('11111111-1111-1111-1111-111111111111', 'active', 1440, '2025-01-15 09:00:00+00:00'), -- Standard 1 day alert
('22222222-2222-2222-2222-222222222222', 'active', 60, '2025-01-20 14:30:00+00:00'),   -- 1 hour alert (urgent lawyer)
('33333333-3333-3333-3333-333333333333', 'active', 10080, '2025-01-10 08:15:00+00:00'), -- 1 week alert (conservative)
('44444444-4444-4444-4444-444444444444', 'active', 30, '2025-01-25 16:45:00+00:00'),    -- 30 min alert (last minute type)
('55555555-5555-5555-5555-555555555555', 'active', 4320, '2025-01-18 11:20:00+00:00'),  -- 3 days alert
-- Edge cases
('66666666-6666-6666-6666-666666666666', 'deleted', 1440, '2025-01-12 10:00:00+00:00'), -- Deleted user
('77777777-7777-7777-7777-777777777777', 'active', 0, '2025-01-22 13:30:00+00:00'),     -- No alert (immediate only)
('88888888-8888-8888-8888-888888888888', 'active', 43200, '2025-01-14 15:45:00+00:00'); -- 30 days alert (very conservative)

-- ================================
-- 2. CLIENTS TABLE SEED DATA  
-- ================================
-- Diverse client types and naming patterns

INSERT INTO public.clients (user_id, client_name, created_at) VALUES
-- User 1 clients (Standard lawyer with various client types)
('11111111-1111-1111-1111-111111111111', 'Zhang Wei Legal Corp', '2024-12-01 09:00:00+00:00'),
('11111111-1111-1111-1111-111111111111', 'Beijing Municipal Government', '2024-12-03 10:15:00+00:00'),
('11111111-1111-1111-1111-111111111111', 'Tech Innovations Ltd', '2024-12-05 14:30:00+00:00'),
('11111111-1111-1111-1111-111111111111', 'Li Ming (Personal)', '2024-12-08 11:45:00+00:00'),

-- User 2 clients (Urgent lawyer with corporate clients)
('22222222-2222-2222-2222-222222222222', 'Shanghai Steel Manufacturing', '2024-11-15 08:30:00+00:00'),
('22222222-2222-2222-2222-222222222222', 'Global Trade Partners', '2024-11-20 16:20:00+00:00'),
('22222222-2222-2222-2222-222222222222', 'Emergency Legal Services', '2024-12-10 19:45:00+00:00'),

-- User 3 clients (Conservative lawyer with long-term clients)
('33333333-3333-3333-3333-333333333333', 'Wang Family Trust', '2023-06-12 09:30:00+00:00'),
('33333333-3333-3333-3333-333333333333', 'Heritage Property Development', '2023-08-25 14:15:00+00:00'),
('33333333-3333-3333-3333-333333333333', 'Chen & Associates Law Firm', '2024-01-08 10:00:00+00:00'),

-- User 4 clients (Last minute lawyer with small clients)
('44444444-4444-4444-4444-444444444444', 'Small Business Owner Liu', '2025-01-15 12:00:00+00:00'),
('44444444-4444-4444-4444-444444444444', 'Start-up Legal Consultancy', '2025-01-18 15:30:00+00:00'),

-- User 5 clients (Regular activity)
('55555555-5555-5555-5555-555555555555', 'International Trade Corp', '2024-10-05 11:00:00+00:00'),
('55555555-5555-5555-5555-555555555555', 'Municipal Court Services', '2024-11-12 09:45:00+00:00'),
('55555555-5555-5555-5555-555555555555', 'Legal Aid Foundation', '2024-12-20 13:15:00+00:00'),

-- Edge case clients (test various naming patterns)
('11111111-1111-1111-1111-111111111111', 'Client with Very Long Corporate Name Including Multiple Business Units and Subsidiaries Ltd', '2024-12-15 10:00:00+00:00'),
('22222222-2222-2222-2222-222222222222', '李明 (Chinese Characters)', '2024-12-18 11:30:00+00:00'),
('33333333-3333-3333-3333-333333333333', 'Special Chars & Symbols! @#$%', '2024-12-22 14:45:00+00:00');

-- ================================
-- 3. TASKS TABLE SEED DATA
-- ================================
-- Comprehensive task scenarios covering all source types and edge cases

INSERT INTO public.tasks (user_id, client_id, title, event_time, location, note, completed_at, source_type, notification_sent, created_at) VALUES

-- === UPCOMING TASKS (not completed) ===

-- Court hearings and legal proceedings (various time ranges)
('11111111-1111-1111-1111-111111111111', 1, 'Contract Review Meeting', '2025-09-05 09:00:00+08:00', 'Chaoyang District Court Room 5', 'Case: (2025)J0105S0001 - Review final contract terms', NULL, 'ocr', false, '2025-01-15 10:30:00+00:00'),
('11111111-1111-1111-1111-111111111111', 2, 'Municipal Compliance Hearing', '2025-09-12 14:30:00+08:00', 'Beijing Municipal Building Floor 3', 'Bring all environmental compliance documents', NULL, 'manual', false, '2025-01-18 09:15:00+00:00'),
('11111111-1111-1111-1111-111111111111', 3, 'Patent Application Filing', '2025-09-20 10:00:00+08:00', 'IP Office Beijing', 'Tech patent #CN2025001234 - Final submission', NULL, 'asr', false, '2025-01-20 16:20:00+00:00'),

-- Urgent tasks (User 2 with 1 hour alerts)
('22222222-2222-2222-2222-222222222222', 5, 'Emergency Contract Dispute', '2025-09-03 08:00:00+08:00', 'Shanghai High Court', 'Urgent: Steel supply contract breach - Case #2025SH0892', NULL, 'manual', false, '2025-01-25 07:30:00+00:00'),
('22222222-2222-2222-2222-222222222222', 6, 'Trade Agreement Deadline', '2025-09-08 17:00:00+08:00', 'Global Trade Office', 'Final submission for international trade agreement', NULL, 'ocr', true, '2025-01-22 14:45:00+00:00'),

-- Conservative lawyer tasks (User 3 with 1 week alerts)
('33333333-3333-3333-3333-333333333333', 8, 'Trust Fund Review', '2025-10-15 11:00:00+08:00', 'Wang Family Office', 'Annual trust fund performance review and adjustments', NULL, 'manual', false, '2024-12-20 09:00:00+00:00'),
('33333333-3333-3333-3333-333333333333', 9, 'Property Development Meeting', '2025-11-20 15:30:00+08:00', 'Heritage Office Tower A', 'Q4 development milestone review', NULL, 'asr', false, '2025-01-10 11:30:00+00:00'),

-- Last minute lawyer (User 4 with 30 min alerts)
('44444444-4444-4444-4444-444444444444', 11, 'Small Business Consultation', '2025-09-02 13:00:00+08:00', 'Client Office', 'Business incorporation guidance for Liu', NULL, 'asr', false, '2025-01-28 12:30:00+00:00'),

-- Various edge case scenarios
('55555555-5555-5555-5555-555555555555', 13, 'International Arbitration', '2025-12-01 09:00:00+08:00', 'Beijing Arbitration Center', 'Complex cross-border dispute resolution', NULL, 'ocr', false, '2025-01-16 08:45:00+00:00'),

-- Tasks without clients (personal tasks)
('11111111-1111-1111-1111-111111111111', NULL, 'Bar Association Meeting', '2025-09-10 18:00:00+08:00', 'Legal Association Building', 'Monthly professional development meeting', NULL, 'manual', false, '2025-01-19 12:00:00+00:00'),
('22222222-2222-2222-2222-222222222222', NULL, 'Legal Research Session', '2025-09-07 10:00:00+08:00', 'Law Library', 'Research new intellectual property regulations', NULL, 'asr', false, '2025-01-21 15:30:00+00:00'),

-- Tasks without specific time (unscheduled)
('33333333-3333-3333-3333-333333333333', 8, 'Review Trust Documents', NULL, NULL, 'Need to review updated trust documentation when available', NULL, 'manual', false, '2025-01-17 10:15:00+00:00'),
('44444444-4444-4444-4444-444444444444', 11, 'Follow up Business Registration', NULL, NULL, 'Check status of business registration application', NULL, 'asr', false, '2025-01-26 09:30:00+00:00'),

-- Tasks with very long content (edge case testing)
('11111111-1111-1111-1111-111111111111', 1, 'Complex Multi-Party Contract Negotiation with International Jurisdictional Considerations', '2025-10-05 09:30:00+08:00', 'International Trade Center Conference Room 12A-B Complex', 'This is an extremely detailed case involving multiple international parties across different jurisdictions including US, China, and EU regulations. The contract involves technology transfer agreements with specific IP protection clauses, environmental compliance requirements, and complex financial arrangements including escrow services, currency hedging, and multi-year payment schedules. All parties must be present including: primary contractors, secondary subcontractors, legal representatives from each jurisdiction, financial advisors, and technical consultants. Required documents include: all previous correspondence, technical specifications, financial projections, regulatory compliance certificates, and translated versions in Chinese, English, and applicable local languages.', NULL, 'ocr', false, '2025-01-12 14:20:00+00:00'),

-- === COMPLETED TASKS ===

-- Recently completed tasks
('11111111-1111-1111-1111-111111111111', 1, 'Initial Client Consultation', '2025-01-20 10:00:00+08:00', 'Law Office Conference Room', 'Contract review discussion completed successfully', '2025-01-20 11:30:00+00:00', 'manual', true, '2025-01-18 09:00:00+00:00'),
('22222222-2222-2222-2222-222222222222', 5, 'Steel Contract Analysis', '2025-01-22 15:00:00+08:00', 'Shanghai Office', 'Identified key issues in supply agreement', '2025-01-22 16:45:00+00:00', 'ocr', true, '2025-01-21 11:15:00+00:00'),
('33333333-3333-3333-3333-333333333333', 8, 'Quarterly Trust Review', '2025-01-25 14:00:00+08:00', 'Wang Family Office', 'Performance review completed, recommendations provided', '2025-01-25 15:30:00+00:00', 'manual', true, '2025-01-24 10:00:00+00:00'),

-- Older completed tasks (for history)
('44444444-4444-4444-4444-444444444444', 11, 'Business License Application', '2025-01-15 11:00:00+08:00', 'Government Service Center', 'Application submitted successfully', '2025-01-15 12:00:00+00:00', 'asr', true, '2025-01-14 16:30:00+00:00'),
('55555555-5555-5555-5555-555555555555', 13, 'Trade Documentation Review', '2025-01-18 13:30:00+08:00', 'International Office', 'All documents verified and approved', '2025-01-18 14:45:00+00:00', 'ocr', true, '2025-01-17 08:30:00+00:00'),

-- === OVERDUE TASKS (past event_time but not completed) ===

-- Overdue tasks that should trigger alerts
('22222222-2222-2222-2222-222222222222', 6, 'Missed Deadline Documentation', '2025-01-28 16:00:00+08:00', 'Trade Office', 'URGENT: This was supposed to be completed yesterday', NULL, 'ocr', true, '2025-01-27 08:00:00+00:00'),
('44444444-4444-4444-4444-444444444444', 12, 'Startup Legal Consultation', '2025-01-29 09:00:00+08:00', 'Startup Office', 'Initial legal framework discussion - client has been waiting', NULL, 'manual', false, '2025-01-28 08:30:00+00:00'),

-- === TASKS WITH SPECIAL CHARACTERS AND EDGE CASES ===

-- Unicode and special characters
('11111111-1111-1111-1111-111111111111', 4, '李明案件听证会', '2025-09-15 10:00:00+08:00', '朝阳区法院第三法庭', '案件编号：(2025)京0105民初001号 - 合同纠纷案', NULL, 'ocr', false, '2025-01-16 13:45:00+00:00'),
('22222222-2222-2222-2222-222222222222', 10, 'Contract Review: "Special Terms & Conditions"', '2025-09-18 14:00:00+08:00', 'Client Office (Building A)', 'Review contract with special symbols: @, #, $, %, &, *, +, =', NULL, 'asr', false, '2025-01-23 10:20:00+00:00'),

-- Tasks with HTML-like content (testing injection safety)
('33333333-3333-3333-3333-333333333333', 9, 'Legal Document with <script>alert("test")</script>', '2025-09-25 11:00:00+08:00', 'Heritage Office <Room 1>', 'Note with potential injection: <img src="x" onerror="alert(1)">', NULL, 'ocr', false, '2025-01-24 12:15:00+00:00'),

-- Tasks with empty and minimal content
('55555555-5555-5555-5555-555555555555', 14, 'Meeting', NULL, '', '', NULL, 'manual', false, '2025-01-27 14:00:00+00:00'),
('55555555-5555-5555-5555-555555555555', 15, 'X', '2025-09-30 12:00:00+08:00', 'Y', 'Z', NULL, 'asr', false, '2025-01-27 14:05:00+00:00'),

-- === NOTIFICATION TESTING SCENARIOS ===

-- Tasks that need notifications (event_time in near future, not completed, notification not sent)
('11111111-1111-1111-1111-111111111111', 1, 'Tomorrow Morning Court Hearing', '2025-08-30 09:00:00+08:00', 'District Court Room 2', 'Important hearing - final arguments', NULL, 'ocr', false, '2025-01-28 15:00:00+00:00'),
('22222222-2222-2222-2222-222222222222', 5, 'Urgent Client Call', '2025-08-29 18:00:00+08:00', 'Phone Conference', 'Emergency consultation about contract breach', NULL, 'asr', false, '2025-01-28 17:30:00+00:00'),

-- Tasks that shouldn't trigger notifications (various reasons)
('33333333-3333-3333-3333-333333333333', 8, 'Already Notified Task', '2025-09-01 10:00:00+08:00', 'Trust Office', 'This task already sent notification', NULL, 'manual', true, '2025-01-20 09:00:00+00:00'),
('44444444-4444-4444-4444-444444444444', 11, 'Completed Task', '2025-01-29 14:00:00+08:00', 'Business Center', 'This task was completed', '2025-01-29 15:00:00+00:00', 'asr', true, '2025-01-28 13:00:00+00:00'),
('55555555-5555-5555-5555-555555555555', 13, 'Far Future Task', '2025-12-25 10:00:00+08:00', 'Holiday Office', 'Task too far in future for immediate notification', NULL, 'ocr', false, '2025-01-15 11:00:00+00:00');

-- ================================
-- 4. TASK_FILES TABLE SEED DATA
-- ================================
-- File attachments covering all roles and file types

INSERT INTO public.task_files (task_id, user_id, role, file_name, storage_path, mime_type, created_at) VALUES

-- === SOURCE FILES (from AI processing) ===

-- OCR source files
(1, '11111111-1111-1111-1111-111111111111', 'source', 'court_notice_zhang_wei.pdf', '11111111-1111-1111-1111-111111111111/tasks/1/court_notice_zhang_wei.pdf', 'application/pdf', '2025-01-15 10:31:00+00:00'),
(1, '11111111-1111-1111-1111-111111111111', 'source', 'contract_scan_page1.jpg', '11111111-1111-1111-1111-111111111111/tasks/1/contract_scan_page1.jpg', 'image/jpeg', '2025-01-15 10:31:30+00:00'),
(1, '11111111-1111-1111-1111-111111111111', 'source', 'contract_scan_page2.jpg', '11111111-1111-1111-1111-111111111111/tasks/1/contract_scan_page2.jpg', 'image/jpeg', '2025-01-15 10:31:45+00:00'),

(6, '22222222-2222-2222-2222-222222222222', 'source', 'trade_agreement_deadline.png', '22222222-2222-2222-2222-222222222222/tasks/6/trade_agreement_deadline.png', 'image/png', '2025-01-22 14:46:00+00:00'),
(7, '22222222-2222-2222-2222-222222222222', 'source', 'steel_contract_breach.pdf', '22222222-2222-2222-2222-222222222222/tasks/7/steel_contract_breach.pdf', 'application/pdf', '2025-01-25 07:31:00+00:00'),

(14, '33333333-3333-3333-3333-333333333333', 'source', 'heritage_development_notice.pdf', '33333333-3333-3333-3333-333333333333/tasks/14/heritage_development_notice.pdf', 'application/pdf', '2025-01-24 12:16:00+00:00'),
(20, '55555555-5555-5555-5555-555555555555', 'source', 'arbitration_documents.pdf', '55555555-5555-5555-5555-555555555555/tasks/20/arbitration_documents.pdf', 'application/pdf', '2025-01-16 08:46:00+00:00'),

-- ASR source files  
(3, '11111111-1111-1111-1111-111111111111', 'source', 'voice_note_patent_filing.m4a', '11111111-1111-1111-1111-111111111111/tasks/3/voice_note_patent_filing.m4a', 'audio/mp4', '2025-01-20 16:21:00+00:00'),
(10, '22222222-2222-2222-2222-222222222222', 'source', 'client_call_recording.wav', '22222222-2222-2222-2222-222222222222/tasks/10/client_call_recording.wav', 'audio/wav', '2025-01-21 15:31:00+00:00'),
(8, '33333333-3333-3333-3333-333333333333', 'source', 'meeting_voice_memo.mp3', '33333333-3333-3333-3333-333333333333/tasks/8/meeting_voice_memo.mp3', 'audio/mpeg', '2025-01-10 11:31:00+00:00'),
(11, '44444444-4444-4444-4444-444444444444', 'source', 'consultation_notes.aac', '44444444-4444-4444-4444-444444444444/tasks/11/consultation_notes.aac', 'audio/aac', '2025-01-28 12:31:00+00:00'),

-- === ATTACHMENT FILES (user-added) ===

-- Document attachments
(1, '11111111-1111-1111-1111-111111111111', 'attachment', 'supporting_evidence.pdf', '11111111-1111-1111-1111-111111111111/tasks/1/supporting_evidence.pdf', 'application/pdf', '2025-01-16 09:15:00+00:00'),
(1, '11111111-1111-1111-1111-111111111111', 'attachment', 'client_correspondence.docx', '11111111-1111-1111-1111-111111111111/tasks/1/client_correspondence.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '2025-01-17 11:30:00+00:00'),

(6, '22222222-2222-2222-2222-222222222222', 'attachment', 'financial_statements.xlsx', '22222222-2222-2222-2222-222222222222/tasks/6/financial_statements.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '2025-01-23 10:20:00+00:00'),
(7, '22222222-2222-2222-2222-222222222222', 'attachment', 'expert_witness_report.pdf', '22222222-2222-2222-2222-222222222222/tasks/7/expert_witness_report.pdf', 'application/pdf', '2025-01-25 14:15:00+00:00'),

-- Image attachments
(8, '33333333-3333-3333-3333-333333333333', 'attachment', 'property_photos.jpg', '33333333-3333-3333-3333-333333333333/tasks/8/property_photos.jpg', 'image/jpeg', '2025-01-18 16:45:00+00:00'),
(11, '44444444-4444-4444-4444-444444444444', 'attachment', 'business_license_scan.png', '44444444-4444-4444-4444-444444444444/tasks/11/business_license_scan.png', 'image/png', '2025-01-28 15:20:00+00:00'),

-- Multiple files for single task
(20, '55555555-5555-5555-5555-555555555555', 'attachment', 'contract_draft_v1.pdf', '55555555-5555-5555-5555-555555555555/tasks/20/contract_draft_v1.pdf', 'application/pdf', '2025-01-17 09:30:00+00:00'),
(20, '55555555-5555-5555-5555-555555555555', 'attachment', 'contract_draft_v2.pdf', '55555555-5555-5555-5555-555555555555/tasks/20/contract_draft_v2.pdf', 'application/pdf', '2025-01-18 14:15:00+00:00'),
(20, '55555555-5555-5555-5555-555555555555', 'attachment', 'legal_precedents.pdf', '55555555-5555-5555-5555-555555555555/tasks/20/legal_precedents.pdf', 'application/pdf', '2025-01-19 10:45:00+00:00'),

-- Edge case file types and names
(14, '33333333-3333-3333-3333-333333333333', 'attachment', 'file with spaces and special chars !@#$.txt', '33333333-3333-3333-3333-333333333333/tasks/14/file_with_spaces_and_special_chars.txt', 'text/plain', '2025-01-24 15:30:00+00:00'),
(1, '11111111-1111-1111-1111-111111111111', 'attachment', '文档示例.pdf', '11111111-1111-1111-1111-111111111111/tasks/1/chinese_document.pdf', 'application/pdf', '2025-01-16 12:00:00+00:00'),
(3, '11111111-1111-1111-1111-111111111111', 'attachment', 'very-long-filename-that-tests-system-limits-and-storage-path-handling-capabilities.docx', '11111111-1111-1111-1111-111111111111/tasks/3/very_long_filename.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '2025-01-20 17:00:00+00:00');

-- ================================
-- 5. USER_DEVICES TABLE SEED DATA
-- ================================
-- Push notification tokens for various device types

INSERT INTO public.user_devices (user_id, push_token, created_at) VALUES

-- === iOS DEVICES ===
-- Standard iOS push tokens (64 characters hex)
('11111111-1111-1111-1111-111111111111', 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456', '2025-01-15 08:30:00+00:00'),
('22222222-2222-2222-2222-222222222222', 'f1e2d3c4b5a6988776655443322110099887766554433221100ffeeддccbbaa', '2025-01-20 09:15:00+00:00'),
('33333333-3333-3333-3333-333333333333', '123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01', '2025-01-10 07:45:00+00:00'),

-- === ANDROID DEVICES ===
-- FCM tokens (longer, variable length)
('44444444-4444-4444-4444-444444444444', 'dGhpcyBpcyBhIGZha2UgRkNNIHRva2VuIGZvciB0ZXN0aW5nIHB1cnBvc2VzIG9ubHkgYW5kIHNob3VsZCBub3QgYmUgdXNlZCBpbiBwcm9kdWN0aW9u', '2025-01-25 10:20:00+00:00'),
('55555555-5555-5555-5555-555555555555', 'eXhhbXBsZSBGQ00gdG9rZW4gZm9yIEFuZHJvaWQgZGV2aWNlIHRoYXQgaXMgdXNlZCBmb3IgcHVzaCBub3RpZmljYXRpb24gdGVzdGluZyBwdXJwb3Nlcw==', '2025-01-18 11:50:00+00:00'),

-- === MULTIPLE DEVICES PER USER ===
-- User 1 has multiple devices (iPhone + iPad)
('11111111-1111-1111-1111-111111111111', 'iPad2Token9876543210fedcba0987654321fedcba0987654321fedcba098765432', '2025-01-16 14:20:00+00:00'),

-- User 2 has multiple devices (primary + backup phone)
('22222222-2222-2222-2222-222222222222', 'YmFja3VwIGRldmljZSB0b2tlbiBmb3IgdXNlciAyIHdoaWNoIGlzIGEgc2Vjb25kYXJ5IEFuZHJvaWQgZGV2aWNlIGZvciBlbWVyZ2VuY3kgbm90aWZpY2F0aW9ucw==', '2025-01-21 16:30:00+00:00'),

-- === EDGE CASE TOKENS ===

-- Recently updated device (testing token refresh scenarios)
('55555555-5555-5555-5555-555555555555', 'bmV3VG9rZW5BZnRlckRldmljZVJlZnJlc2hPclJlaW5zdGFsbEZvclRlc3RpbmdUb2tlblJlZnJlc2hGdW5jdGlvbmFsaXR5SW5BcHBsaWNhdGlvbg==', '2025-01-28 09:00:00+00:00'),

-- Minimum and maximum length tokens (testing validation)
('66666666-6666-6666-6666-666666666666', 'min', '2025-01-12 12:00:00+00:00'),
('77777777-7777-7777-7777-777777777777', 'dGhpcyBpcyBhbiBlZXh0cmVtZWx5IGxvbmcgcHVzaCB0b2tlbiB0aGF0IHRlc3RzIHRoZSBtYXhpbXVtIGxlbmd0aCBsaW1pdHMgb2YgdGhlIHN5c3RlbSBhbmQgZW5zdXJlcyB0aGF0IHZlcnkgbG9uZyB0b2tlbnMgY2FuIGJlIGhhbmRsZWQgcHJvcGVybHkgYnkgdGhlIGRhdGFiYXNlIGFuZCBhcHBsaWNhdGlvbiBjb2RlIGJhc2U=', '2025-01-22 15:30:00+00:00');

-- ================================
-- VERIFICATION QUERIES
-- ================================
-- Use these to verify seed data integrity

/*
-- Count records per table
SELECT 'profiles' as table_name, COUNT(*) as record_count FROM public.profiles
UNION ALL
SELECT 'clients', COUNT(*) FROM public.clients  
UNION ALL
SELECT 'tasks', COUNT(*) FROM public.tasks
UNION ALL  
SELECT 'task_files', COUNT(*) FROM public.task_files
UNION ALL
SELECT 'user_devices', COUNT(*) FROM public.user_devices;

-- Check foreign key relationships
SELECT t.title, c.client_name, t.source_type, t.event_time
FROM public.tasks t
LEFT JOIN public.clients c ON t.client_id = c.id
WHERE t.user_id = '11111111-1111-1111-1111-111111111111'
ORDER BY t.event_time;

-- Check file attachments distribution
SELECT tf.role, COUNT(*) as file_count, 
       STRING_AGG(DISTINCT tf.mime_type, ', ') as mime_types
FROM public.task_files tf  
GROUP BY tf.role;

-- Check notification scenarios
SELECT u.id as user_id, p.default_alert_offset_minutes,
       COUNT(CASE WHEN t.notification_sent = false AND t.completed_at IS NULL AND t.event_time IS NOT NULL THEN 1 END) as pending_notifications
FROM auth.users u  
JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.tasks t ON u.id = t.user_id
GROUP BY u.id, p.default_alert_offset_minutes;
*/

-- ================================
-- SEED DATA SUMMARY
-- ================================
/*
PROFILES: 8 users with different alert preferences and statuses
CLIENTS: 15+ clients across different users with various naming patterns  
TASKS: 25+ tasks covering:
  - All source types (manual, ocr, asr)
  - Various time scenarios (upcoming, overdue, unscheduled, completed)
  - Edge cases (special characters, long content, empty fields)
  - Notification test scenarios
TASK_FILES: 20+ files covering:
  - Both roles (source from AI, attachment from users) 
  - Multiple file types (PDF, images, audio, documents)
  - Edge cases (special characters, very long names, unicode)
USER_DEVICES: 10+ push tokens covering:
  - iOS and Android format differences
  - Multiple devices per user
  - Edge cases (min/max length tokens)

TOTAL RECORDS: ~75+ test records across all tables
COVERAGE: All enum values, constraint scenarios, and real-world edge cases
*/