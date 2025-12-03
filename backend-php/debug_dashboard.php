<?php
// debug_dashboard.php - Debug dashboard stats
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not logged in']);
    exit;
}

$user_id = $_SESSION['user_id'];
$role = $_SESSION['primary_role'] ?? 'Contributor';

header('Content-Type: application/json');

try {
    if ($role === 'Client') {
        // Get all projects for this client
        $stmt = $pdo->prepare("SELECT project_id, title, status FROM project WHERE client_id = :user_id");
        $stmt->execute([':user_id' => $user_id]);
        $projects = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get stats
        $stmt = $pdo->prepare("
            SELECT 
                COUNT(*) as total,
                IFNULL(SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END), 0) as completed,
                IFNULL(SUM(CASE WHEN status = 'InProgress' THEN 1 ELSE 0 END), 0) as in_progress,
                IFNULL(SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END), 0) as pending
            FROM project
            WHERE client_id = :user_id
        ");
        $stmt->execute([':user_id' => $user_id]);
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'user_id' => $user_id,
            'role' => $role,
            'projects' => $projects,
            'stats_raw' => $stats,
            'stats_processed' => [
                'total' => (int)($stats['total'] ?? 0),
                'completed' => (int)($stats['completed'] ?? 0),
                'in_progress' => (int)($stats['in_progress'] ?? 0),
                'pending' => (int)($stats['pending'] ?? 0)
            ]
        ]);
    } else {
        // Contributor stats
        $stmt = $pdo->prepare("SELECT bid_id, project_id, status FROM bid WHERE contributor_id = :user_id");
        $stmt->execute([':user_id' => $user_id]);
        $bids = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $stmt = $pdo->prepare("
            SELECT 
                COUNT(*) as total,
                IFNULL(SUM(CASE WHEN status = 'Accepted' THEN 1 ELSE 0 END), 0) as completed,
                IFNULL(SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END), 0) as pending,
                0 as in_progress
            FROM bid
            WHERE contributor_id = :user_id
        ");
        $stmt->execute([':user_id' => $user_id]);
        $bidStats = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'user_id' => $user_id,
            'role' => $role,
            'bids' => $bids,
            'stats_raw' => $bidStats,
            'stats_processed' => [
                'total' => (int)($bidStats['total'] ?? 0),
                'completed' => (int)($bidStats['completed'] ?? 0),
                'in_progress' => 0,
                'pending' => (int)($bidStats['pending'] ?? 0)
            ]
        ]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}

