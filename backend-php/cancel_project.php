<?php
// cancel_project.php
// API for canceling a project (setting status to 'Canceled')
// POST: Cancel project

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
    $cancel_reason = $data['reason'] ?? 'Project canceled';
    
    if (!$project_id) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'project_id required']);
        exit;
    }
    
    try {
        // Get project details to check authorization
        $check = $pdo->prepare("
            SELECT p.*, b.contributor_id
            FROM project p
            LEFT JOIN assignment a ON a.project_id = p.project_id
            LEFT JOIN bid b ON a.bid_id = b.bid_id AND b.status = 'Accepted'
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
        
        // Check authorization: either client or contributor can cancel
        $is_client = ($project['client_id'] == $user_id);
        $is_contributor = ($project['contributor_id'] == $user_id);
        
        if (!$is_client && !$is_contributor) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Not authorized. Only the project owner or assigned contributor can cancel.']);
            exit;
        }
        
        // Don't allow canceling if already completed
        if ($project['status'] === 'Completed') {
            http_response_code(400);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Cannot cancel a completed project']);
            exit;
        }
        
        // Update project status to Canceled
        $stmt = $pdo->prepare("
            UPDATE project 
            SET status = 'Canceled', updated_at = NOW()
            WHERE project_id = :project_id
        ");
        $stmt->execute([':project_id' => $project_id]);
        
        // Send message to the other party
        $recipient_id = $is_client ? $project['contributor_id'] : $project['client_id'];
        if ($recipient_id) {
            // Get or create conversation
            $conv_stmt = $pdo->prepare("
                SELECT conversation_id FROM conversation
                WHERE project_id = :project_id
                LIMIT 1
            ");
            $conv_stmt->execute([':project_id' => $project_id]);
            $conversation = $conv_stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($conversation) {
                $conversation_id = $conversation['conversation_id'];
            } else {
                // Create conversation if it doesn't exist
                $create_conv = $pdo->prepare("
                    INSERT INTO conversation (project_id, client_id, contributor_id)
                    VALUES (:project_id, :client_id, :contributor_id)
                ");
                $create_conv->execute([
                    ':project_id' => $project_id,
                    ':client_id' => $project['client_id'],
                    ':contributor_id' => $project['contributor_id']
                ]);
                $conversation_id = $pdo->lastInsertId();
            }
            
            // Send cancellation message
            $message_text = $is_client 
                ? "The project '{$project['title']}' has been canceled by the client. Reason: {$cancel_reason}"
                : "The project '{$project['title']}' has been canceled by the contributor. Reason: {$cancel_reason}";
            
            $msg_stmt = $pdo->prepare("
                INSERT INTO message (conversation_id, sender_id, message_text, created_at)
                VALUES (:conversation_id, :sender_id, :message_text, NOW())
            ");
            $msg_stmt->execute([
                ':conversation_id' => $conversation_id,
                ':sender_id' => $user_id,
                ':message_text' => $message_text
            ]);
            
            // Notify the other party
            $notif = $pdo->prepare("
                INSERT INTO notifications (user_id, type, payload_json)
                VALUES (:user_id, 'ProjectCanceled', :payload)
            ");
            $notif->execute([
                ':user_id' => $recipient_id,
                ':payload' => json_encode([
                    'project_id' => $project_id,
                    'project_title' => $project['title'],
                    'canceled_by' => $is_client ? 'client' : 'contributor'
                ])
            ]);
        }
        
        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'message' => 'Project canceled successfully']);
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

