<?php
// milestones.php
// API for milestone operations
// GET: Get milestones for an assignment/project
// PUT: Submit or approve a milestone

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
session_start();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Get milestones - filter by assignment_id or project_id
    $assignment_id = isset($_GET['assignment_id']) ? (int)$_GET['assignment_id'] : null;
    $project_id = isset($_GET['project_id']) ? (int)$_GET['project_id'] : null;
    
    try {
        $sql = "
            SELECT 
                m.milestone_id,
                m.assignment_id,
                m.title,
                m.due_date,
                m.status,
                m.submission_notes,
                m.submission_url,
                m.submitted_at,
                p.project_id,
                p.title as project_title,
                p.client_id,
                b.contributor_id,
                u.name as contributor_name,
                u.email as contributor_email
            FROM milestone m
            JOIN assignment a ON m.assignment_id = a.assignment_id
            JOIN project p ON a.project_id = p.project_id
            JOIN bid b ON a.bid_id = b.bid_id
            JOIN user u ON b.contributor_id = u.user_id
            WHERE 1=1
        ";
        
        $params = [];
        
        if ($assignment_id) {
            $sql .= " AND m.assignment_id = :assignment_id";
            $params[':assignment_id'] = $assignment_id;
        }
        
        if ($project_id) {
            $sql .= " AND p.project_id = :project_id";
            $params[':project_id'] = $project_id;
        }
        
        $sql .= " ORDER BY m.due_date ASC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $milestones = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'milestones' => $milestones]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
    
} elseif ($method === 'POST') {
    // Create a new milestone - requires login
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Not logged in']);
        exit;
    }
    
    $body = file_get_contents('php://input');
    $data = json_decode($body, true);
    
    $assignment_id = $data['assignment_id'] ?? null;
    $title = $data['title'] ?? null;
    $due_date = $data['due_date'] ?? null;
    
    if (!$assignment_id || !$title || !$due_date) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields']);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("
            INSERT INTO milestone (assignment_id, title, due_date)
            VALUES (:assignment_id, :title, :due_date)
        ");
        
        $stmt->execute([
            ':assignment_id' => $assignment_id,
            ':title' => $title,
            ':due_date' => $due_date
        ]);
        
        echo json_encode(['success' => true, 'milestone_id' => $pdo->lastInsertId()]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
    
} elseif ($method === 'PUT') {
    // Submit or approve a milestone
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Not logged in']);
        exit;
    }
    
    $user_id = $_SESSION['user_id'];
    
    $body = file_get_contents('php://input');
    $data = json_decode($body, true);
    
    $milestone_id = $data['milestone_id'] ?? null;
    $action = $data['action'] ?? null; // 'submit' or 'approve'
    
    if (!$milestone_id || !$action) {
        http_response_code(400);
        echo json_encode(['error' => 'milestone_id and action required']);
        exit;
    }
    
    try {
        // Get milestone details
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
            echo json_encode(['error' => 'Milestone not found']);
            exit;
        }
        
        if ($action === 'submit') {
            // Contributor submits the milestone
            if ($milestone['contributor_id'] != $user_id) {
                http_response_code(403);
                echo json_encode(['error' => 'Not authorized']);
                exit;
            }
            
            $submission_notes = $data['submission_notes'] ?? null;
            $submission_url = $data['submission_url'] ?? null;
            
            $stmt = $pdo->prepare("
                UPDATE milestone 
                SET status = 'Submitted', 
                    submission_notes = :notes, 
                    submission_url = :url,
                    submitted_at = NOW()
                WHERE milestone_id = :milestone_id
            ");
            $stmt->execute([
                ':notes' => $submission_notes,
                ':url' => $submission_url,
                ':milestone_id' => $milestone_id
            ]);
            
            // Notify client
            $notif = $pdo->prepare("
                INSERT INTO notifications (user_id, type, payload_json)
                VALUES (:user_id, 'MilestoneSubmitted', :payload)
            ");
            $notif->execute([
                ':user_id' => $milestone['client_id'],
                ':payload' => json_encode([
                    'milestone_id' => $milestone_id, 
                    'milestone_title' => $milestone['title'],
                    'project_title' => $milestone['project_title']
                ])
            ]);
            
        } elseif ($action === 'approve') {
            // Client approves the milestone
            if ($milestone['client_id'] != $user_id) {
                http_response_code(403);
                echo json_encode(['error' => 'Not authorized']);
                exit;
            }
            
            $stmt = $pdo->prepare("
                UPDATE milestone SET status = 'Approved' WHERE milestone_id = :milestone_id
            ");
            $stmt->execute([':milestone_id' => $milestone_id]);
            
            // Notify contributor
            $notif = $pdo->prepare("
                INSERT INTO notifications (user_id, type, payload_json)
                VALUES (:user_id, 'MilestoneApproved', :payload)
            ");
            $notif->execute([
                ':user_id' => $milestone['contributor_id'],
                ':payload' => json_encode([
                    'milestone_id' => $milestone_id,
                    'milestone_title' => $milestone['title'],
                    'project_title' => $milestone['project_title']
                ])
            ]);
            
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid action']);
            exit;
        }
        
        echo json_encode(['success' => true]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
    
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}

