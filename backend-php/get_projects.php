<?php
// get_projects.php
// Returns all projects with optional filtering
// Admins can see all projects regardless of status or accepted bids

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_check.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
// Require login for all requests (but admins can see everything)
require_login();
$user_id = $_SESSION['user_id'];
$user_role = $_SESSION['primary_role'] ?? null;
$isAdmin = ($user_role === 'Admin');

// Get filter parameters
$status = isset($_GET['status']) ? $_GET['status'] : null;
$client_id = isset($_GET['client_id']) ? (int)$_GET['client_id'] : null;

try {
    $params = [];
    
    // Admins always see ALL projects regardless of filters
    if ($isAdmin) {
        // Admins see ALL projects regardless of status or accepted bids
        $sql = "
            SELECT DISTINCT
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
                (SELECT COUNT(*) FROM bid WHERE project_id = p.project_id) as bid_count
            FROM project p
            JOIN user u ON p.client_id = u.user_id
            WHERE 1=1
        ";
        if ($status) {
            $sql .= " AND p.status = :status";
            $params[':status'] = $status;
        }
        if ($client_id) {
            $sql .= " AND p.client_id = :client_id";
            $params[':client_id'] = $client_id;
        }
    } else if ($client_id) {
        // If filtering by client_id (client viewing their own projects), show all projects including those with accepted bids
        $sql = "
            SELECT DISTINCT
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
                (SELECT COUNT(*) FROM bid WHERE project_id = p.project_id) as bid_count
            FROM project p
            JOIN user u ON p.client_id = u.user_id
            WHERE p.client_id = :client_id
        ";
        $params[':client_id'] = $client_id;
        if ($status) {
            $sql .= " AND p.status = :status";
            $params[':status'] = $status;
        }
    } else {
        // For browsing (no client_id filter) - regular users only (admins handled above)
        // Regular users: exclude projects that have an accepted bid
        // BUT: If filtering by status='Completed', include ALL completed projects (needed for completed projects page)
        $sql = "
            SELECT DISTINCT
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
                (SELECT COUNT(*) FROM bid WHERE project_id = p.project_id) as bid_count
            FROM project p
            JOIN user u ON p.client_id = u.user_id
        ";
        
        // If filtering by Completed status, show all completed projects (needed for completed projects page)
        // Otherwise, exclude projects with accepted bids (for browsing page)
        if ($status === 'Completed') {
            $sql .= " WHERE p.status = :status";
            $params[':status'] = $status;
        } else {
            $sql .= "
                LEFT JOIN bid b_accepted ON p.project_id = b_accepted.project_id AND b_accepted.status = 'Accepted'
                WHERE b_accepted.bid_id IS NULL
            ";
            if ($status) {
                $sql .= " AND p.status = :status";
                $params[':status'] = $status;
            }
        }
    }
    
    $sql .= " ORDER BY p.created_at DESC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $projects = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'projects' => $projects]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
