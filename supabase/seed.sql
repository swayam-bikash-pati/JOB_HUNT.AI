-- ============================================================
-- JobHunter AI — Seed Data (Development)
-- ============================================================
-- Note: This seed data is for local development only.
-- In production, user data is created through the app.
-- ============================================================

-- Sample source configs (these match worker/config/sources.json)
INSERT INTO source_configs (source_type, name, config, enabled) VALUES
('greenhouse', 'Razorpay', '{"board_token": "razorpay", "filters": {"title_keywords": ["engineer", "ML", "data", "AI", "python"]}}', true),
('greenhouse', 'Swiggy', '{"board_token": "swiggy", "filters": {"title_keywords": ["engineer", "ML", "data", "AI", "python"]}}', true),
('greenhouse', 'CRED', '{"board_token": "cred", "filters": {"title_keywords": ["engineer", "ML", "data", "AI", "python"]}}', true),
('greenhouse', 'Postman', '{"board_token": "postman", "filters": {"title_keywords": ["engineer", "ML", "data", "AI", "python"]}}', true),
('lever', 'Notion', '{"company_slug": "notion", "filters": {"title_keywords": ["engineer", "ML", "data", "AI", "python"]}}', true),
('lever', 'Figma', '{"company_slug": "figma", "filters": {"title_keywords": ["engineer", "ML", "data", "AI", "python"]}}', true)
ON CONFLICT DO NOTHING;
