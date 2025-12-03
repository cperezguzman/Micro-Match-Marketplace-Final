<?php
// assignments.php
// API for getting assignments (projects assigned to contributors or owned by clients)
// GET: Get assignments for current user

error_reporting(E_ALL);
ini_set('display_errors', 0);

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_check.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_login();

$user_id = $_SESSION['user_id'];
// Use active_role from query param if provided (for role switching), otherwise use primary_role from session
$active_role = isset($_GET['active_role']) ? $_GET['active_role'] : null;
$primary_role = $_SESSION['primary_role'] ?? 'Contributor';
$user_role = $active_role ?? $primary_role;
$isAdmin = ($primary_role === 'Admin');
$adminView = isset($_GET['admin']) && $_GET['admin'] === 'true';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        if ($isAdmin && $adminView) {
            // Admin viewing ALL assignments
            $stmt = $pdo->prepare("
                SELECT 
                    a.assignment_id,
                    a.project_id,
                    p.title as project_title,
                    p.description,
                    p.status as project_status,
                    p.deadline,
                    p.updated_at,
                    p.created_at,
                    b.bid_id,
                    b.status as bid_status,
                    b.contributor_id,
                    contrib.name as contributor_name,
                    contrib.email as contributor_email,
                    client.name as client_name,
                    client.email as client_email,
                    p.client_id,
                    (SELECT COUNT(*) FROM milestone m WHERE m.assignment_id = a.assignment_id) as milestone_count,
                    (SELECT COUNT(*) FROM milestone m WHERE m.assignment_id = a.assignment_id AND m.status = 'Approved') as completed_milestones,
                    (SELECT COUNT(*) FROM milestone m WHERE m.assignment_id = a.assignment_id) as total_milestones
                FROM assignment a
                JOIN project p ON a.project_id = p.project_id
                JOIN bid b ON a.bid_id = b.bid_id
                JOIN user contrib ON b.contributor_id = contrib.user_id
                JOIN user client ON p.client_id = client.user_id
                ORDER BY p.created_at DESC
            ");
            $stmt->execute();
        } else if ($user_role === 'Client') {
            // Get assignments for projects owned by this client
            // Only show assignments where the bid is Accepted (not Pending or Rejected)
            $stmt = $pdo->prepare("
                SELECT 
                    a.assignment_id,
                    a.project_id,
                    p.title as project_title,
                    p.description,
                    p.status as project_status,
                    p.deadline,
                    p.updated_at,
                    b.bid_id,
                    b.status as bid_status,
                    b.contributor_id,
                    u.name as contributor_name,
                    u.email as contributor_email,
                    (SELECT COUNT(*) FROM milestone m WHERE m.assignment_id = a.assignment_id) as milestone_count,
                    (SELECT COUNT(*) FROM milestone m WHERE m.assignment_id = a.assignment_id AND m.status = 'Approved') as completed_milestones,
                    (SELECT COUNT(*) FROM milestone m WHERE m.assignment_id = a.assignment_id) as total_milestones
                FROM assignment a
                JOIN project p ON a.project_id = p.project_id
                JOIN bid b ON a.bid_id = b.bid_id
                JOIN user u ON b.contributor_id = u.user_id
                WHERE p.client_id = :user_id
                AND b.status = 'Accepted'
                AND p.status != 'Completed'
                ORDER BY p.created_at DESC
            ");
            $stmt->execute([':user_id' => $user_id]);
        } else {
            // Get assignments for this contributor
            // Only show assignments where the bid is Accepted (not Pending or Rejected)
            $stmt = $pdo->prepare("
                SELECT 
                    a.assignment_id,
                    a.project_id,
                    p.title as project_title,
                    p.description,
                    p.status as project_status,
                    p.deadline,
                    p.updated_at,
                    b.bid_id,
                    b.status as bid_status,
                    p.client_id,
                    u.name as client_name,
                    u.email as client_email,
                    (SELECT COUNT(*) FROM milestone m WHERE m.assignment_id = a.assignment_id) as milestone_count,
                    (SELECT COUNT(*) FROM milestone m WHERE m.assignment_id = a.assignment_id AND m.status = 'Approved') as completed_milestones,
                    (SELECT COUNT(*) FROM milestone m WHERE m.assignment_id = a.assignment_id) as total_milestones
                FROM assignment a
                JOIN project p ON a.project_id = p.project_id
                JOIN bid b ON a.bid_id = b.bid_id
                JOIN user u ON p.client_id = u.user_id
                WHERE b.contributor_id = :user_id
                AND b.status = 'Accepted'
                AND p.status != 'Completed'
                ORDER BY p.created_at DESC
            ");
            $stmt->execute([':user_id' => $user_id]);
        }
        
        $assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get milestones for each assignment and parse project description
        foreach ($assignments as &$assignment) {
            // Parse project description to remove [SCOPE] and [MILESTONES] markers
            $rawDescription = $assignment['description'] ?? '';
            // Extract summary (everything before [SCOPE] or [MILESTONES])
            $assignment['project_summary'] = preg_split('/\[SCOPE\]|\[MILESTONES\]/', $rawDescription)[0];
            $assignment['project_summary'] = trim($assignment['project_summary']);
            
            $milestoneStmt = $pdo->prepare("
                SELECT 
                    milestone_id,
                    title,
                    due_date,
                    status,
                    submission_notes,
                    submission_url
                FROM milestone
                WHERE assignment_id = :assignment_id
                ORDER BY due_date ASC
            ");
            $milestoneStmt->execute([':assignment_id' => $assignment['assignment_id']]);
            $milestones = $milestoneStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Calculate progress based on deliverables for each milestone
            foreach ($milestones as &$m) {
                $progress = 0;
                
                if ($m['status'] === 'Approved') {
                    $progress = 100;
                } else if ($m['status'] === 'Submitted' || $m['submission_notes']) {
                    // Get total deliverables from project definition
                    $rawDescription = $assignment['description'] ?? '';
                    $totalDeliverables = 0;
                    $submittedDeliverables = 0;
                    
                    // Parse milestones from project description
                    if (preg_match('/\[MILESTONES\]\s*\n(.*?)$/s', $rawDescription, $matches)) {
                        $milestones_json = trim($matches[1]);
                        $milestoneDefs = json_decode($milestones_json, true);
                        
                        if (is_array($milestoneDefs)) {
                            // Find the milestone definition that matches this milestone
                            foreach ($milestoneDefs as $def) {
                                if ($def['title'] === $m['title']) {
                                    $totalDeliverables = isset($def['deliverables']) ? count($def['deliverables']) : 0;
                                    break;
                                }
                            }
                        }
                    }
                    
                    // Count submitted deliverables from submission_notes
                    if ($m['submission_notes']) {
                        $parsed = json_decode($m['submission_notes'], true);
                        if ($parsed && isset($parsed['deliverables']) && is_array($parsed['deliverables'])) {
                            foreach ($parsed['deliverables'] as $deliverable) {
                                // Count as submitted if it has files
                                if (isset($deliverable['files']) && is_array($deliverable['files']) && count($deliverable['files']) > 0) {
                                    $submittedDeliverables++;
                                }
                            }
                        }
                    }
                    
                    // Calculate progress: (submitted / total) * 90% (not 100% until approved)
                    if ($totalDeliverables > 0) {
                        $progress = round(($submittedDeliverables / $totalDeliverables) * 90);
                    } else {
                        // Fallback: if no deliverables defined, use status-based progress
                        $progress = $m['status'] === 'Submitted' ? 90 : 0;
                    }
                }
                
                $m['progress'] = $progress;
            }
            
            $assignment['milestones'] = $milestones;
        }
        
        error_reporting(E_ALL);
        ini_set('display_errors', 0);
        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'assignments' => $assignments]);
        exit;
        
    } catch (PDOException $e) {
        error_reporting(E_ALL);
        ini_set('display_errors', 0);
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        exit;
    }
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', 0);
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

