<?php
// finalize_project.php
// API for finalizing a project (setting status to 'Completed')
// POST: Finalize project

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
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $body = file_get_contents('php://input');
    $data = json_decode($body, true);
    
    $project_id = $data['project_id'] ?? null;
    
    if (!$project_id) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'project_id required']);
        exit;
    }
    
    try {
        // Get project details to check authorization and milestone status
        $check = $pdo->prepare("
            SELECT p.*, 
                   (SELECT COUNT(*) FROM milestone m 
                    JOIN assignment a ON m.assignment_id = a.assignment_id 
                    WHERE a.project_id = p.project_id) as total_milestones,
                   (SELECT COUNT(*) FROM milestone m 
                    JOIN assignment a ON m.assignment_id = a.assignment_id 
                    WHERE a.project_id = p.project_id AND m.status = 'Approved') as completed_milestones
            FROM project p
            WHERE p.project_id = :project_id
        ");
        $check->execute([':project_id' => $project_id]);
        $project = $check->fetch(PDO::FETCH_ASSOC);
        
        if (!$project) {
            http_response_code(404);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Project not found']);
            exit;
        }
        
        // Only client can finalize (check active_role for dual-role support)
        $active_role = $_GET['active_role'] ?? null;
        if (!$active_role && $_SERVER['REQUEST_METHOD'] === 'POST') {
            $postData = json_decode(file_get_contents('php://input'), true);
            $active_role = $postData['active_role'] ?? null;
        }
        $currentRole = $active_role ?? $_SESSION['primary_role'] ?? null;
        
        if ($currentRole !== 'Client' || $project['client_id'] != $user_id) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Not authorized. Only the project owner can finalize.']);
            exit;
        }
        
        // Check if all milestones are completed
        if ($project['total_milestones'] == 0) {
            http_response_code(400);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Project has no milestones']);
            exit;
        }
        
        if ($project['completed_milestones'] != $project['total_milestones']) {
            http_response_code(400);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'All milestones must be completed before finalizing']);
            exit;
        }
        
        // Update project status to Completed
        $stmt = $pdo->prepare("
            UPDATE project 
            SET status = 'Completed', updated_at = NOW()
            WHERE project_id = :project_id
        ");
        $stmt->execute([':project_id' => $project_id]);
        
        // Get assignment and contributor info for notification
        $assign_stmt = $pdo->prepare("
            SELECT b.contributor_id
            FROM assignment a
            JOIN bid b ON a.bid_id = b.bid_id
            WHERE a.project_id = :project_id
        ");
        $assign_stmt->execute([':project_id' => $project_id]);
        $assignment = $assign_stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($assignment) {
            // Notify contributor
            $notif = $pdo->prepare("
                INSERT INTO notifications (user_id, type, payload_json)
                VALUES (:user_id, 'ProjectCompleted', :payload)
            ");
            $notif->execute([
                ':user_id' => $assignment['contributor_id'],
                ':payload' => json_encode([
                    'project_id' => $project_id,
                    'project_title' => $project['title']
                ])
            ]);
        }
        
        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'message' => 'Project finalized successfully']);
        exit;
        
    } catch (PDOException $e) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        exit;
    }
} else {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

