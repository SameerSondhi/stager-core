-- Seed Data for Stager MVP
-- Clean existing mock data if re-running
DELETE FROM broadcast_acknowledgments WHERE user_id = 'u00000000-0000-0000-0000-000000000001';
DELETE FROM broadcasts WHERE org_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM go_links WHERE org_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM profiles WHERE id = 'u00000000-0000-0000-0000-000000000001';
DELETE FROM organizations WHERE id = 'a0000000-0000-0000-0000-000000000001';

-- 1. Insert Mock Organization
INSERT INTO organizations (id, name, slug, brand_color, display_name, logo_url)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Acme Corp',
    'acme',
    '#10b981',
    'Acme Health',
    NULL
) ON CONFLICT (slug) DO UPDATE SET 
    name = EXCLUDED.name,
    brand_color = EXCLUDED.brand_color,
    display_name = EXCLUDED.display_name,
    logo_url = EXCLUDED.logo_url;

-- 2. Insert Mock Profile
INSERT INTO profiles (id, org_id, email, role)
VALUES (
    'u00000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'alex@acme.internal',
    'lead_engineer'
) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- 3. Insert 5 Realistic Go-Links
INSERT INTO go_links (id, org_id, keyword, target_url, description, click_count, created_by)
VALUES 
    (
        'g0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'github',
        'https://github.com/acme-corp',
        'Acme Core GitHub Repositories and monorepos',
        421,
        'u00000000-0000-0000-0000-000000000001'
    ),
    (
        'g0000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000001',
        'docs',
        'https://docs.acme.internal',
        'Internal Architecture & Engineering RFC Documentation',
        318,
        'u00000000-0000-0000-0000-000000000001'
    ),
    (
        'g0000000-0000-0000-0000-000000000003',
        'a0000000-0000-0000-0000-000000000001',
        'standup',
        'https://meet.google.com/acme-standup',
        'Daily Morning Engineering Sync & Standup Room',
        294,
        'u00000000-0000-0000-0000-000000000001'
    ),
    (
        'g0000000-0000-0000-0000-000000000004',
        'a0000000-0000-0000-0000-000000000001',
        'jira',
        'https://acme.atlassian.net',
        'Active Sprint Boards, Epics & Incident Tracker',
        240,
        'u00000000-0000-0000-0000-000000000001'
    ),
    (
        'g0000000-0000-0000-0000-000000000005',
        'a0000000-0000-0000-0000-000000000001',
        'design',
        'https://www.figma.com/@acme',
        'Company Design System, Token Specs & Figma UI Kit',
        185,
        'u00000000-0000-0000-0000-000000000001'
    )
ON CONFLICT (org_id, keyword) DO UPDATE 
SET target_url = EXCLUDED.target_url, description = EXCLUDED.description;

-- 4. Insert 2 Sample Broadcast Announcements
INSERT INTO broadcasts (id, org_id, title, content, department, author_name, author_role, poll_options, is_pinned, expires_at)
VALUES
    (
        'b0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'Q3 Cloud Infrastructure Maintenance Window',
        'Upgrading core production PostgreSQL read replicas and Kubernetes node pools on **Saturday at 10:00 PM UTC**. Expect momentary read-only windows of ~2-3 minutes. SRE team on call in `#infra-war-room`.',
        'Engineering',
        'David Ortiz',
        'Staff SRE',
        NULL,
        true,
        now() + interval '7 days'
    ),
    (
        'b0000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000001',
        'All-Hands Company Strategy & Stager GA Milestone',
        'Join the executive team this **Thursday at 2:00 PM EST** for company-wide updates, product launch showcases, and live Q&A. Remote attendees join via `go/allhands`. Please indicate your attendance format below.',
        'All',
        'Elena Rostova',
        'Chief of Staff',
        '["Attending in Person", "Joining Remotely", "Cannot Attend"]'::jsonb,
        true,
        now() + interval '14 days'
    )
ON CONFLICT (id) DO UPDATE SET 
    title = EXCLUDED.title, 
    content = EXCLUDED.content,
    author_name = EXCLUDED.author_name,
    poll_options = EXCLUDED.poll_options;

