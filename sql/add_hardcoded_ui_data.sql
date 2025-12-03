-- =====================================================
-- Add Hard-Coded UI Data to Database
-- This script adds all the sample data from UI files
-- =====================================================

USE micro_match;

-- =====================================================
-- 1. ADD NEW USERS (from hard-coded UI data)
-- =====================================================

-- Users from BrowsingPage.jsx
INSERT IGNORE INTO user (name, email, primary_role, password_hash, rating_avg) VALUES
('Sarah Johnson', 'sarah.johnson@example.com', 'Client', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4.8),
('Mike Chen', 'mike.chen@example.com', 'Client', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4.9),
('Karen Thompson', 'karen.thompson@example.com', 'Client', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4.8),
('Alexei Lebedev', 'alexei.lebedev@example.com', 'Client', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4.9);

-- Contributors from ProjectDetailPage.jsx and ProjectListPage.jsx
INSERT IGNORE INTO user (name, email, primary_role, password_hash, rating_avg) VALUES
('Nora A.', 'nora.a@example.com', 'Contributor', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4.7),
('Rami S.', 'rami.s@example.com', 'Contributor', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4.6),
('Lina K.', 'lina.k@example.com', 'Contributor', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4.8);

-- Contributors from AssignmentPage.jsx (using simplified names)
INSERT IGNORE INTO user (name, email, primary_role, password_hash, rating_avg) VALUES
('Schema Squad', 'schemasquad@example.com', 'Contributor', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4.9),
('Data Wizard', 'datawizard@example.com', 'Contributor', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4.8),
('Insight Dev', 'insightdev@example.com', 'Contributor', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4.7),
('HR Tech Pro', 'hrtechpro@example.com', 'Contributor', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4.6),
('Conversio AI', 'conversioai@example.com', 'Contributor', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4.9);

-- =====================================================
-- 2. ADD PROJECTS (from various UI files)
-- =====================================================

-- Get user IDs (we'll use variables for clarity)
SET @sarah_id = (SELECT user_id FROM user WHERE email = 'sarah.johnson@example.com');
SET @mike_id = (SELECT user_id FROM user WHERE email = 'mike.chen@example.com');
SET @karen_id = (SELECT user_id FROM user WHERE email = 'karen.thompson@example.com');
SET @alexei_id = (SELECT user_id FROM user WHERE email = 'alexei.lebedev@example.com');
SET @emily_id = (SELECT user_id FROM user WHERE email = 'emily.johnson@example.com' LIMIT 1);

-- Projects from BrowsingPage.jsx
INSERT INTO project (client_id, title, description, budget_min, budget_max, deadline, status) VALUES
(@sarah_id, 'React Native Mobile App Development', 
 'Looking for an experienced React Native developer to build a cross-platform mobile app for our startup.', 
 5000.00, 15000.00, '2026-02-15', 'Open'),
(@mike_id, 'Logo Design for Tech Startup', 
 'Need a modern, minimalist logo design for our AI-powered analytics platform.', 
 500.00, 2000.00, '2026-01-25', 'Open'),
(@karen_id, 'AI Resume Enhancer Tool', 
 'Build a web tool that uses GPT to analyze and improve resumes with tailored suggestions for job seekers.', 
 1000.00, 4000.00, '2026-02-28', 'Open'),
(@alexei_id, 'VR Physics Simulation for Education', 
 'Create an interactive VR module to teach high school students about motion, energy, and force using immersive visuals.', 
 10000.00, 30000.00, '2026-03-10', 'Open');

-- Project from ProjectDetailPage.jsx and ProjectListPage.jsx
INSERT INTO project (client_id, title, description, budget_min, budget_max, deadline, status) VALUES
(@emily_id, 'AI‑Powered Research Assistant', 
 'Build a micro‑tool that parses PDFs, extracts key figures/tables, and generates structured notes with citations. Integrate with a simple web UI and export.', 
 1800.00, 1800.00, '2026-01-31', 'Open'),
(@emily_id, 'Mobile Shopping App', 
 'Develop a mobile shopping application with modern UI/UX.', 
 12000.00, 12000.00, '2026-01-31', 'Open'),
(@emily_id, 'Website Redesign & SEO', 
 'Complete website redesign with SEO optimization.', 
 4500.00, 4500.00, '2026-01-31', 'Open');

-- Projects from AssignmentPage.jsx (these should be InProgress with assignments)
SET @schema_id = (SELECT user_id FROM user WHERE email = 'schemasquad@example.com');
SET @datawizard_id = (SELECT user_id FROM user WHERE email = 'datawizard@example.com');
SET @insight_id = (SELECT user_id FROM user WHERE email = 'insightdev@example.com');
SET @hrtech_id = (SELECT user_id FROM user WHERE email = 'hrtechpro@example.com');
SET @conversio_id = (SELECT user_id FROM user WHERE email = 'conversioai@example.com');

INSERT INTO project (client_id, title, description, budget_min, budget_max, deadline, status) VALUES
(@emily_id, 'Mobile App UI Redesign', 
 'Redesign the mobile app interface to enhance user experience and accessibility. Deliverables include wireframes, prototypes, and developer handoff assets.', 
 5000.00, 8000.00, '2025-10-30', 'InProgress'),
(@emily_id, 'E-Commerce Product Recommendation Engine', 
 'Build a machine-learning powered recommendation engine that analyzes user behavior and provides personalized product suggestions. Includes dashboard integration and performance analytics.', 
 10000.00, 15000.00, '2025-12-02', 'InProgress'),
(@emily_id, 'Marketing Analytics Dashboard', 
 'Develop an interactive analytics dashboard for tracking campaign performance, ROAS, customer acquisition metrics, and multi-channel engagement. Includes exportable reports and role-based access.', 
 8000.00, 12000.00, '2025-11-18', 'InProgress'),
(@emily_id, 'AI-Powered Resume Screening Tool', 
 'Create an AI tool that evaluates resumes based on skill matching, experience relevance, and job-specific criteria. Includes PDF parsing, score explanations, and recruiter review workflow.', 
 12000.00, 18000.00, '2025-12-20', 'InProgress'),
(@emily_id, 'Customer Support Chatbot Deployment', 
 'Deploy an AI-driven customer support chatbot with multilingual support, analytics dashboard, and seamless website integration.', 
 15000.00, 20000.00, '2025-09-25', 'Delivered');

-- =====================================================
-- 3. ADD BIDS (from ProjectDetailPage.jsx)
-- =====================================================

SET @nora_id = (SELECT user_id FROM user WHERE email = 'nora.a@example.com');
SET @rami_id = (SELECT user_id FROM user WHERE email = 'rami.s@example.com');
SET @lina_id = (SELECT user_id FROM user WHERE email = 'lina.k@example.com');

-- Get project ID for "AI‑Powered Research Assistant"
SET @ai_research_project_id = (SELECT project_id FROM project WHERE title = 'AI‑Powered Research Assistant' LIMIT 1);

-- Bids for AI Research Assistant project
INSERT IGNORE INTO bid (project_id, contributor_id, amount, timeline_days, proposal_text, status) VALUES
(@ai_research_project_id, @nora_id, 1400.00, 7, 'Reliable parsing + UI.', 'Pending'),
(@ai_research_project_id, @rami_id, 1600.00, 10, 'Robust table extraction.', 'Pending'),
(@ai_research_project_id, @lina_id, 1300.00, 8, 'UX + citations export.', 'Pending');

-- =====================================================
-- 4. ADD ASSIGNMENTS (for InProgress projects)
-- =====================================================

-- Get project IDs for assigned projects
SET @mobile_ui_project_id = (SELECT project_id FROM project WHERE title = 'Mobile App UI Redesign' LIMIT 1);
SET @ecommerce_project_id = (SELECT project_id FROM project WHERE title = 'E-Commerce Product Recommendation Engine' LIMIT 1);
SET @marketing_project_id = (SELECT project_id FROM project WHERE title = 'Marketing Analytics Dashboard' LIMIT 1);
SET @resume_project_id = (SELECT project_id FROM project WHERE title = 'AI-Powered Resume Screening Tool' LIMIT 1);
SET @chatbot_project_id = (SELECT project_id FROM project WHERE title = 'Customer Support Chatbot Deployment' LIMIT 1);

-- Create bids first (required for assignments)
INSERT IGNORE INTO bid (project_id, contributor_id, amount, timeline_days, proposal_text, status) VALUES
(@mobile_ui_project_id, @schema_id, 6500.00, 30, 'UI redesign with wireframes and prototypes', 'Accepted'),
(@ecommerce_project_id, @datawizard_id, 12500.00, 45, 'ML recommendation engine with dashboard', 'Accepted'),
(@marketing_project_id, @insight_id, 10000.00, 40, 'Analytics dashboard with multi-channel tracking', 'Accepted'),
(@resume_project_id, @hrtech_id, 15000.00, 50, 'AI resume screening with PDF parsing', 'Accepted'),
(@chatbot_project_id, @conversio_id, 17500.00, 35, 'Multilingual chatbot with analytics', 'Accepted');

-- Create assignments (one per project)
INSERT IGNORE INTO assignment (project_id, bid_id) VALUES
(@mobile_ui_project_id, (SELECT bid_id FROM bid WHERE project_id = @mobile_ui_project_id AND contributor_id = @schema_id LIMIT 1)),
(@ecommerce_project_id, (SELECT bid_id FROM bid WHERE project_id = @ecommerce_project_id AND contributor_id = @datawizard_id LIMIT 1)),
(@marketing_project_id, (SELECT bid_id FROM bid WHERE project_id = @marketing_project_id AND contributor_id = @insight_id LIMIT 1)),
(@resume_project_id, (SELECT bid_id FROM bid WHERE project_id = @resume_project_id AND contributor_id = @hrtech_id LIMIT 1)),
(@chatbot_project_id, (SELECT bid_id FROM bid WHERE project_id = @chatbot_project_id AND contributor_id = @conversio_id LIMIT 1));

-- =====================================================
-- 5. ADD MILESTONES (from AssignmentPage.jsx and ContributorAssignmentPage.jsx)
-- =====================================================

-- Milestones for Mobile App UI Redesign
SET @mobile_assignment_id = (SELECT assignment_id FROM assignment WHERE project_id = @mobile_ui_project_id LIMIT 1);
INSERT INTO milestone (assignment_id, title, due_date, status) VALUES
(@mobile_assignment_id, 'Wireframe Draft', '2025-10-15', 'Approved'),
(@mobile_assignment_id, 'Prototype Review', '2025-10-21', 'Submitted'),
(@mobile_assignment_id, 'Final Delivery', '2025-10-30', 'Open');

-- Milestones for E-Commerce Recommendation Engine
SET @ecommerce_assignment_id = (SELECT assignment_id FROM assignment WHERE project_id = @ecommerce_project_id LIMIT 1);
INSERT INTO milestone (assignment_id, title, due_date, status) VALUES
(@ecommerce_assignment_id, 'Dataset Cleaning & Prep', '2025-11-12', 'Approved'),
(@ecommerce_assignment_id, 'Model Training & Benchmarking', '2025-11-22', 'Submitted'),
(@ecommerce_assignment_id, 'Integration with Dashboard', '2025-12-02', 'Open');

-- Milestones for Marketing Analytics Dashboard
SET @marketing_assignment_id = (SELECT assignment_id FROM assignment WHERE project_id = @marketing_project_id LIMIT 1);
INSERT INTO milestone (assignment_id, title, due_date, status) VALUES
(@marketing_assignment_id, 'UI Wireframes', '2025-10-28', 'Approved'),
(@marketing_assignment_id, 'Backend Aggregation Pipeline', '2025-11-05', 'Submitted'),
(@marketing_assignment_id, 'Dashboard Visualizations', '2025-11-18', 'Open');

-- Milestones for AI-Powered Resume Screening Tool
SET @resume_assignment_id = (SELECT assignment_id FROM assignment WHERE project_id = @resume_project_id LIMIT 1);
INSERT INTO milestone (assignment_id, title, due_date, status) VALUES
(@resume_assignment_id, 'Resume Parsing Engine', '2025-12-01', 'Submitted'),
(@resume_assignment_id, 'Ranking Algorithm', '2025-12-10', 'Open'),
(@resume_assignment_id, 'Recruiter Review UI', '2025-12-20', 'Open');

-- Milestones for Customer Support Chatbot (all completed)
SET @chatbot_assignment_id = (SELECT assignment_id FROM assignment WHERE project_id = @chatbot_project_id LIMIT 1);
INSERT INTO milestone (assignment_id, title, due_date, status) VALUES
(@chatbot_assignment_id, 'Conversation Flow Design', '2025-09-10', 'Approved'),
(@chatbot_assignment_id, 'Model Training & Tuning', '2025-09-18', 'Approved'),
(@chatbot_assignment_id, 'Website Integration', '2025-09-25', 'Approved');

-- =====================================================
-- 6. ADD SKILLS AND PROJECT_SKILL RELATIONSHIPS
-- =====================================================

-- Add skills if they don't exist
INSERT IGNORE INTO skill (skill_name) VALUES
('React Native'), ('JavaScript'), ('Firebase'), ('Logo Design'), ('Adobe Illustrator'), ('Branding'),
('GPT'), ('NLP'), ('Resume Parser'), ('Unity'), ('VR'), ('C#'), ('Physics Engine'),
('Python'), ('React'), ('PostgreSQL'), ('Figma'), ('Machine Learning'), ('Data Science'),
('UI/UX Design'), ('Prototyping'), ('Wireframing'), ('Dashboard Development'), ('Analytics');

-- Link skills to AI Research Assistant project
SET @python_skill = (SELECT skill_id FROM skill WHERE skill_name = 'Python' LIMIT 1);
SET @react_skill = (SELECT skill_id FROM skill WHERE skill_name = 'React' LIMIT 1);
SET @nlp_skill = (SELECT skill_id FROM skill WHERE skill_name = 'NLP' LIMIT 1);
SET @postgres_skill = (SELECT skill_id FROM skill WHERE skill_name = 'PostgreSQL' LIMIT 1);
SET @figma_skill = (SELECT skill_id FROM skill WHERE skill_name = 'Figma' LIMIT 1);

INSERT IGNORE INTO project_skill (project_id, skill_id) VALUES
(@ai_research_project_id, @python_skill),
(@ai_research_project_id, @react_skill),
(@ai_research_project_id, @nlp_skill),
(@ai_research_project_id, @postgres_skill),
(@ai_research_project_id, @figma_skill);

-- Link skills to other projects
SET @react_native_skill = (SELECT skill_id FROM skill WHERE skill_name = 'React Native' LIMIT 1);
SET @js_skill = (SELECT skill_id FROM skill WHERE skill_name = 'JavaScript' LIMIT 1);
SET @firebase_skill = (SELECT skill_id FROM skill WHERE skill_name = 'Firebase' LIMIT 1);

SET @react_native_project_id = (SELECT project_id FROM project WHERE title = 'React Native Mobile App Development' LIMIT 1);
INSERT IGNORE INTO project_skill (project_id, skill_id) VALUES
(@react_native_project_id, @react_native_skill),
(@react_native_project_id, @js_skill),
(@react_native_project_id, @firebase_skill);

-- =====================================================
-- 7. ADD SAMPLE NOTIFICATIONS (from NotificationPage.jsx)
-- =====================================================

-- Get some user IDs for notifications
SET @daniel_id = (SELECT user_id FROM user WHERE email = 'daniel.carter@example.com' LIMIT 1);

-- Add sample notifications (these will be user-specific, so we'll add them for Daniel as example)
INSERT INTO notifications (user_id, type, payload_json, created_at) VALUES
(@daniel_id, 'BidPending', CONCAT('{"project_id": ', @ai_research_project_id, ', "project_title": "AI‑Powered Research Assistant"}'), NOW() - INTERVAL 2 HOUR),
(@daniel_id, 'MilestoneApproved', '{"milestone_id": 1, "project_title": "Lab Workflow Tool"}', NOW() - INTERVAL 1 DAY),
(@daniel_id, 'ReviewReceived', '{"review_id": 1, "rating": 5, "client_name": "Nora A."}', '2025-10-10 10:00:00'),
(@daniel_id, 'BidUpdated', '{"bid_id": 1, "old_amount": 1600, "new_amount": 1500, "contributor_name": "Rami S."}', '2025-10-09 10:00:00'),
(@daniel_id, 'MilestoneDue', '{"milestone_id": 2, "milestone_title": "Export to Notion", "due_date": "2025-10-10"}', '2025-10-09 10:00:00');

-- =====================================================
-- 8. ADD SAMPLE MESSAGES (from ProjectDetailPage.jsx)
-- =====================================================

-- Messages for AI Research Assistant project
INSERT INTO message (project_id, sender_id, body, created_at) VALUES
(@ai_research_project_id, @emily_id, 'Clarify citation formats?', '2025-11-18 10:12:00'),
(@ai_research_project_id, @lina_id, 'IEEE or APA—either works. Prefer IEEE?', '2025-11-18 10:20:00');

-- =====================================================
-- SUMMARY
-- =====================================================
SELECT 'Data insertion complete!' AS status;
SELECT COUNT(*) AS total_users FROM user;
SELECT COUNT(*) AS total_projects FROM project;
SELECT COUNT(*) AS total_bids FROM bid;
SELECT COUNT(*) AS total_assignments FROM assignment;
SELECT COUNT(*) AS total_milestones FROM milestone;
SELECT COUNT(*) AS total_notifications FROM notifications;

