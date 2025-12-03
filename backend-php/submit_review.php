<?php
// submit_review.php
// API for submitting a review after project finalization
// POST: Submit a review from client to contributor

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
    $stars = $data['stars'] ?? null;
    $comment = $data['comment'] ?? null;
    
    if (!$project_id || !$stars) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'project_id and stars are required']);
        exit;
    }
    
    if (!is_numeric($stars) || $stars < 1 || $stars > 5) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'stars must be a number between 1 and 5']);
        exit;
    }
    
    try {
        // Get project details to verify authorization and get contributor
        $stmt = $pdo->prepare("
            SELECT p.client_id, p.status, p.title,
                   b.contributor_id
            FROM project p
            JOIN assignment a ON p.project_id = a.project_id
            JOIN bid b ON a.bid_id = b.bid_id
            WHERE p.project_id = :project_id
        ");
        $stmt->execute([':project_id' => $project_id]);
        $project = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$project) {
            http_response_code(404);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Project not found']);
            exit;
        }
        
        // Verify user is the client
        if ($project['client_id'] != $user_id) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Only the project owner can submit a review']);
            exit;
        }
        
        // Verify project is completed
        if ($project['status'] !== 'Completed') {
            http_response_code(400);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Project must be completed before submitting a review']);
            exit;
        }
        
        $contributor_id = $project['contributor_id'];
        
        if (!$contributor_id) {
            http_response_code(400);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Contributor not found for this project']);
            exit;
        }
        
        // Check if review already exists (unique constraint)
        $check = $pdo->prepare("
            SELECT review_id 
            FROM review 
            WHERE project_id = :project_id 
            AND reviewer_id = :reviewer_id 
            AND reviewee_id = :reviewee_id
        ");
        $check->execute([
            ':project_id' => $project_id,
            ':reviewer_id' => $user_id,
            ':reviewee_id' => $contributor_id
        ]);
        
        if ($check->fetch()) {
            http_response_code(400);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'You have already submitted a review for this project']);
            exit;
        }
        
        // Insert review
        $stmt = $pdo->prepare("
            INSERT INTO review (project_id, reviewer_id, reviewee_id, role, stars, comment)
            VALUES (:project_id, :reviewer_id, :reviewee_id, 'ClientToContributor', :stars, :comment)
        ");
        $stmt->execute([
            ':project_id' => $project_id,
            ':reviewer_id' => $user_id,
            ':reviewee_id' => $contributor_id,
            ':stars' => (int)$stars,
            ':comment' => $comment ? trim($comment) : null
        ]);
        
        $review_id = $pdo->lastInsertId();
        
        // Update contributor's average rating
        $updateRating = $pdo->prepare("
            UPDATE user 
            SET rating_avg = (
                SELECT AVG(stars) 
                FROM review 
                WHERE reviewee_id = :user_id
            )
            WHERE user_id = :user_id
        ");
        $updateRating->execute([':user_id' => $contributor_id]);
        
        // Notify contributor
        $notif = $pdo->prepare("
            INSERT INTO notifications (user_id, type, payload_json)
            VALUES (:user_id, 'ReviewReceived', :payload)
        ");
        $notif->execute([
            ':user_id' => $contributor_id,
            ':payload' => json_encode([
                'review_id' => $review_id,
                'project_id' => $project_id,
                'project_title' => $project['title'],
                'rating' => (int)$stars
            ])
        ]);
        
        header('Content-Type: application/json');
        echo json_encode([
            'success' => true, 
            'message' => 'Review submitted successfully',
            'review_id' => $review_id
        ]);
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

