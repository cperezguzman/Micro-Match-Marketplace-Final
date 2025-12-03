<?php
// update_milestone.php
// API for updating milestone details (deadline, title, etc.)
// POST: Update milestone

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
    
    $milestone_id = $data['milestone_id'] ?? null;
    $title = $data['title'] ?? null;
    $due_date = $data['due_date'] ?? null;
    $request_type = $data['request_type'] ?? null; // 'request' (contributor) or 'update' (client)
    
    if (!$milestone_id) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'milestone_id required']);
        exit;
    }
    
    try {
        // Get milestone details to check authorization
        $check = $pdo->prepare("
            SELECT m.*, p.client_id, b.contributor_id, p.title as project_title
            FROM milestone m
            JOIN assignment a ON m.assignment_id = a.assignment_id
            JOIN project p ON a.project_id = p.project_id
            JOIN bid b ON a.bid_id = b.bid_id
            WHERE m.milestone_id = :milestone_id
        ");
        $check->execute([':milestone_id' => $milestone_id]);
        $milestone = $check->fetch(PDO::FETCH_ASSOC);
        
        if (!$milestone) {
            http_response_code(404);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Milestone not found']);
            exit;
        }
        
        // Check authorization
        $is_client = ($milestone['client_id'] == $user_id);
        $is_contributor = ($milestone['contributor_id'] == $user_id);
        
        if (!$is_client && !$is_contributor) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Not authorized']);
            exit;
        }
        
        // Build update query
        $updates = [];
        $params = [':milestone_id' => $milestone_id];
        
        if ($title !== null) {
            $updates[] = "title = :title";
            $params[':title'] = $title;
        }
        
        if ($due_date !== null) {
            $updates[] = "due_date = :due_date";
            $params[':due_date'] = $due_date;
        }
        
        // Allow status update (for returning milestones for changes)
        $status = $data['status'] ?? null;
        if ($status !== null) {
            // Only allow setting status to 'Open' (for returning for changes)
            // Client can return submitted milestones, contributor cannot change approved milestones
            if ($status === 'Open' && $is_client && $milestone['status'] === 'Submitted') {
                $updates[] = "status = :status";
                $params[':status'] = $status;
            } else if ($status !== 'Open') {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Invalid status update']);
                exit;
            }
        }
        
        if (empty($updates)) {
            http_response_code(400);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'No fields to update']);
            exit;
        }
        
        $sql = "UPDATE milestone SET " . implode(", ", $updates) . " WHERE milestone_id = :milestone_id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        // If contributor requested changes, notify client
        if ($request_type === 'request' && $is_contributor) {
            $notif = $pdo->prepare("
                INSERT INTO notifications (user_id, type, payload_json)
                VALUES (:user_id, 'MilestoneChangeRequest', :payload)
            ");
            $notif->execute([
                ':user_id' => $milestone['client_id'],
                ':payload' => json_encode([
                    'milestone_id' => $milestone_id,
                    'milestone_title' => $milestone['title'],
                    'project_title' => $milestone['project_title']
                ])
            ]);
        }
        
        header('Content-Type: application/json');
        echo json_encode(['success' => true]);
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

