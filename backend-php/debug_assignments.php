<?php
// debug_assignments.php
// Debug script to check assignments and bids

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_check.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_login();

$user_id = $_SESSION['user_id'];
$user_role = $_SESSION['primary_role'] ?? 'Contributor';

header('Content-Type: application/json');

try {
    // Get all assignments
    $stmt = $pdo->prepare("
        SELECT 
            a.assignment_id,
            a.project_id,
            a.bid_id,
            p.title as project_title,
            p.client_id,
            b.contributor_id,
            b.status as bid_status,
            u.name as contributor_name
        FROM assignment a
        JOIN project p ON a.project_id = p.project_id
        JOIN bid b ON a.bid_id = b.bid_id
        JOIN user u ON b.contributor_id = u.user_id
        ORDER BY a.assignment_id DESC
        LIMIT 20
    ");
    $stmt->execute();
    $all_assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get user's assignments
    $stmt = $pdo->prepare("
        SELECT 
            a.assignment_id,
            a.project_id,
            a.bid_id,
            p.title as project_title,
            p.client_id,
            b.contributor_id,
            b.status as bid_status,
            u.name as contributor_name
        FROM assignment a
        JOIN project p ON a.project_id = p.project_id
        JOIN bid b ON a.bid_id = b.bid_id
        JOIN user u ON b.contributor_id = u.user_id
        WHERE b.contributor_id = :user_id
        AND b.status = 'Accepted'
        ORDER BY a.assignment_id DESC
    ");
    $stmt->execute([':user_id' => $user_id]);
    $user_assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get user's accepted bids
    $stmt = $pdo->prepare("
        SELECT 
            b.bid_id,
            b.project_id,
            b.status,
            p.title as project_title,
            p.client_id
        FROM bid b
        JOIN project p ON b.project_id = p.project_id
        WHERE b.contributor_id = :user_id
        AND b.status = 'Accepted'
        ORDER BY b.bid_id DESC
    ");
    $stmt->execute([':user_id' => $user_id]);
    $accepted_bids = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'user_id' => $user_id,
        'user_role' => $user_role,
        'all_assignments' => $all_assignments,
        'user_assignments' => $user_assignments,
        'accepted_bids' => $accepted_bids,
        'count_all' => count($all_assignments),
        'count_user' => count($user_assignments),
        'count_accepted_bids' => count($accepted_bids)
    ], JSON_PRETTY_PRINT);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}

