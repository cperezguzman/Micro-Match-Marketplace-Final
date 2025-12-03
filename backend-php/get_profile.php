<?php
// get_profile.php
// Get user profile information including skills, bio, reviews, and portfolio

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_check.php';

// Suppress any output before JSON
error_reporting(E_ALL);
ini_set('display_errors', 0);

require_login();

$user_id = $_SESSION['user_id'];
$target_user_id = isset($_GET['user_id']) ? (int)$_GET['user_id'] : $user_id;

// Allow users to view their own profile or other users' profiles
try {
    // Get user basic info
    $stmt = $pdo->prepare("
        SELECT 
            user_id,
            name,
            email,
            primary_role,
            bio,
            profile_picture_url,
            experience_level,
            rating_avg,
            created_at
        FROM user
        WHERE user_id = :user_id
    ");
    $stmt->execute([':user_id' => $target_user_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'User not found', 'debug' => ['target_user_id' => $target_user_id, 'session_user_id' => $user_id]]);
        exit;
    }
    
    // Get user skills
    $stmt = $pdo->prepare("
        SELECT s.skill_name
        FROM user_skill us
        JOIN skill s ON us.skill_id = s.skill_id
        WHERE us.user_id = :user_id
    ");
    $stmt->execute([':user_id' => $target_user_id]);
    $skills = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $user['skills'] = $skills;
    
    // Get reviews for this user (as reviewee)
    $stmt = $pdo->prepare("
        SELECT 
            r.review_id,
            r.stars as rating,
            r.comment,
            r.created_at,
            u.name as reviewer_name,
            u.email as reviewer_email
        FROM review r
        JOIN user u ON r.reviewer_id = u.user_id
        WHERE r.reviewee_id = :user_id
        ORDER BY r.created_at DESC
    ");
    $stmt->execute([':user_id' => $target_user_id]);
    $reviews = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $user['reviews'] = $reviews;
    
    // Get portfolio (completed projects where user is the contributor)
    $stmt = $pdo->prepare("
        SELECT 
            p.project_id,
            p.title,
            p.description,
            p.status,
            p.created_at,
            p.updated_at as completed_at
        FROM project p
        JOIN assignment a ON p.project_id = a.project_id
        JOIN bid b ON a.bid_id = b.bid_id
        WHERE b.contributor_id = :user_id
        AND p.status = 'Completed'
        ORDER BY p.updated_at DESC
    ");
    $stmt->execute([':user_id' => $target_user_id]);
    $portfolio = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $user['portfolio'] = $portfolio;
    
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'user' => $user]);
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

