<?php
// get_project.php
// Get a single project with full details including bids, skills, etc.

// Suppress any output before JSON
error_reporting(E_ALL);
ini_set('display_errors', 0);

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_check.php';

require_login();

$project_id = isset($_GET['project_id']) ? (int)$_GET['project_id'] : null;

if (!$project_id) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'project_id required']);
    exit;
}

try {
    // Get project details
    $stmt = $pdo->prepare("
        SELECT 
            p.project_id,
            p.client_id,
            p.title,
            p.description,
            p.budget_min,
            p.budget_max,
            p.deadline,
            p.status,
            p.created_at,
            u.name as client_name,
            u.email as client_email
        FROM project p
        JOIN user u ON p.client_id = u.user_id
        WHERE p.project_id = :project_id
    ");
    $stmt->execute([':project_id' => $project_id]);
    $project = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$project) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'Project not found']);
        exit;
    }
    
    // Get bids for this project (only Pending and Accepted - Rejected bids are kept in DB for history but hidden from UI)
    $bidStmt = $pdo->prepare("
        SELECT 
            b.bid_id,
            b.contributor_id,
            b.amount,
            b.timeline_days,
            b.proposal_text,
            b.status,
            b.created_at,
            b.created_at as updated_at,
            u.name as contributor_name,
            u.email as contributor_email
        FROM bid b
        JOIN user u ON b.contributor_id = u.user_id
        WHERE b.project_id = :project_id
        AND b.status IN ('Pending', 'Accepted')
        ORDER BY b.created_at DESC
    ");
    $bidStmt->execute([':project_id' => $project_id]);
    $project['bids'] = $bidStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get skills for this project
    $skillStmt = $pdo->prepare("
        SELECT s.skill_id, s.skill_name
        FROM project_skill ps
        JOIN skill s ON ps.skill_id = s.skill_id
        WHERE ps.project_id = :project_id
    ");
    $skillStmt->execute([':project_id' => $project_id]);
    $skills = $skillStmt->fetchAll(PDO::FETCH_ASSOC);
    $project['skills'] = array_column($skills, 'skill_name');
    
    // Get recent messages count (for activity)
    $msgStmt = $pdo->prepare("
        SELECT COUNT(*) as message_count
        FROM message
        WHERE project_id = :project_id
    ");
    $msgStmt->execute([':project_id' => $project_id]);
    $msgCount = $msgStmt->fetch(PDO::FETCH_ASSOC);
    $project['message_count'] = (int)$msgCount['message_count'];
    
    // Get assignment and contributor info if project has an accepted bid
    $assignStmt = $pdo->prepare("
        SELECT 
            b.contributor_id,
            u.name as contributor_name,
            u.email as contributor_email
        FROM assignment a
        JOIN bid b ON a.bid_id = b.bid_id
        JOIN user u ON b.contributor_id = u.user_id
        WHERE a.project_id = :project_id
        AND b.status = 'Accepted'
        LIMIT 1
    ");
    $assignStmt->execute([':project_id' => $project_id]);
    $assignment = $assignStmt->fetch(PDO::FETCH_ASSOC);
    if ($assignment) {
        $project['contributor_id'] = $assignment['contributor_id'];
        $project['contributor_name'] = $assignment['contributor_name'];
        $project['contributor_email'] = $assignment['contributor_email'];
    }
    
    // Get attachments for this project
    $attachStmt = $pdo->prepare("
        SELECT 
            attachment_id,
            url,
            uploaded_by,
            uploaded_at,
            u.name as uploaded_by_name
        FROM attachment
        LEFT JOIN user u ON attachment.uploaded_by = u.user_id
        WHERE project_id = :project_id
        ORDER BY uploaded_at DESC
    ");
    $attachStmt->execute([':project_id' => $project_id]);
    $attachments = $attachStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Extract filename from URL for each attachment
    foreach ($attachments as &$att) {
        $att['filename'] = basename(parse_url($att['url'], PHP_URL_PATH));
    }
    $project['attachments'] = $attachments;
    
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'project' => $project]);
    exit;
    
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Error: ' . $e->getMessage()]);
    exit;
}

