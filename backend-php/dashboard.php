<?php
// dashboard.php
// API for dashboard statistics and data
// Returns stats based on user role

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_check.php';

require_login();

$user_id = $_SESSION['user_id'];
// Use active_role from query param if provided (for role switching), otherwise use primary_role from session
$active_role = isset($_GET['active_role']) ? $_GET['active_role'] : null;
$primary_role = $_SESSION['primary_role'] ?? 'Contributor';
$role = $active_role ?? $primary_role;
$isAdmin = ($primary_role === 'Admin');

try {
    if ($isAdmin) {
        // Admin stats: ALL projects, ALL bids, ALL assignments
        // Total projects
        $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM project");
        $stmt->execute();
        $projectTotal = (int)$stmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Total bids
        $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM bid");
        $stmt->execute();
        $bidTotal = (int)$stmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Total assignments
        $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM assignment");
        $stmt->execute();
        $assignmentTotal = (int)$stmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Completed projects
        $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM project WHERE status = 'Completed'");
        $stmt->execute();
        $completedProjects = (int)$stmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // In progress projects
        $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM project WHERE status = 'InProgress'");
        $stmt->execute();
        $inProgressProjects = (int)$stmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Open projects
        $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM project WHERE status = 'Open'");
        $stmt->execute();
        $openProjects = (int)$stmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Completed bids (accepted)
        $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM bid WHERE status = 'Accepted'");
        $stmt->execute();
        $acceptedBids = (int)$stmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Pending bids
        $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM bid WHERE status = 'Pending'");
        $stmt->execute();
        $pendingBids = (int)$stmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        $stats = [
            'total_projects' => $projectTotal,
            'completed_projects' => $completedProjects,
            'in_progress_projects' => $inProgressProjects,
            'open_projects' => $openProjects,
            'total_bids' => $bidTotal,
            'accepted_bids' => $acceptedBids,
            'pending_bids' => $pendingBids,
            'total_assignments' => $assignmentTotal
        ];
        
        // Get all upcoming deadlines (from all projects and milestones)
        $stmt = $pdo->prepare("
            SELECT 
                'Project' as type,
                CAST(p.title AS CHAR) as title,
                p.deadline as due_date,
                CAST(p.status AS CHAR) as status
            FROM project p
            WHERE p.deadline >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            AND p.status NOT IN ('Completed', 'Canceled')
            
            UNION ALL
            
            SELECT 
                'Milestone' as type,
                CAST(CONCAT(p.title, ' - ', m.title) AS CHAR) as title,
                m.due_date,
                CAST(m.status AS CHAR) as status
            FROM milestone m
            JOIN assignment a ON m.assignment_id = a.assignment_id
            JOIN project p ON a.project_id = p.project_id
            WHERE m.due_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            AND m.status != 'Approved'
            
            ORDER BY due_date ASC
            LIMIT 10
        ");
        $stmt->execute();
        $deadlines = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
    } else if ($role === 'Client') {
        // Client stats: their projects
        // Use IFNULL to handle NULL from SUM when no rows match
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
        $statsRaw = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Ensure all values are integers
        $stats = [
            'total' => (int)($statsRaw['total'] ?? 0),
            'completed' => (int)($statsRaw['completed'] ?? 0),
            'in_progress' => (int)($statsRaw['in_progress'] ?? 0),
            'pending' => (int)($statsRaw['pending'] ?? 0)
        ];
        
        // Get upcoming deadlines for client's projects
        $stmt = $pdo->prepare("
            SELECT 
                'Project' as type,
                CAST(p.title AS CHAR) as title,
                p.deadline as due_date,
                CAST(p.status AS CHAR) as status
            FROM project p
            WHERE p.client_id = :user_id
            AND p.deadline >= CURDATE()
            AND p.status NOT IN ('Completed', 'Canceled')
            
            UNION ALL
            
            SELECT 
                'Milestone' as type,
                CAST(CONCAT(p.title, ' - ', m.title) AS CHAR) as title,
                m.due_date,
                CAST(m.status AS CHAR) as status
            FROM milestone m
            JOIN assignment a ON m.assignment_id = a.assignment_id
            JOIN project p ON a.project_id = p.project_id
            WHERE p.client_id = :user_id2
            AND m.due_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            AND m.status != 'Approved'
            
            ORDER BY due_date ASC
            LIMIT 10
        ");
        $stmt->execute([':user_id' => $user_id, ':user_id2' => $user_id]);
        $deadlines = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
    } else {
        // Contributor stats: their bids and assignments
        // Get total bids count
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as total
            FROM bid
            WHERE contributor_id = :user_id
            AND status != 'Rejected'
        ");
        $stmt->execute([':user_id' => $user_id]);
        $totalBids = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Count pending bids (exclude rejected)
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as count
            FROM bid
            WHERE contributor_id = :user_id
            AND status = 'Pending'
        ");
        $stmt->execute([':user_id' => $user_id]);
        $pendingBids = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Count completed projects (accepted bids where project is Completed)
        // IMPORTANT: Exclude projects where the user is the client
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as count
            FROM bid b
            JOIN project p ON b.project_id = p.project_id
            WHERE b.contributor_id = :user_id
            AND b.status = 'Accepted'
            AND p.status = 'Completed'
            AND p.client_id != :user_id
        ");
        $stmt->execute([':user_id' => $user_id]);
        $completedBids = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Count in-progress assignments (accepted bids where project is InProgress)
        // IMPORTANT: Exclude projects where the user is the client
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as count
            FROM assignment a
            JOIN bid b ON a.bid_id = b.bid_id
            JOIN project p ON a.project_id = p.project_id
            WHERE b.contributor_id = :user_id
            AND p.status = 'InProgress'
            AND p.client_id != :user_id
        ");
        $stmt->execute([':user_id' => $user_id]);
        $inProgress = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $stats = [
            'total' => (int)$totalBids['total'],
            'completed' => (int)$completedBids['count'],
            'in_progress' => (int)$inProgress['count'],
            'pending' => (int)$pendingBids['count']
        ];
        
        // Get upcoming deadlines for contributor's assignments
        // IMPORTANT: Exclude projects where the user is the client (only show projects they bid on)
        $stmt = $pdo->prepare("
            SELECT 
                'Project' as type,
                CAST(p.title AS CHAR) as title,
                p.deadline as due_date,
                CAST(p.status AS CHAR) as status
            FROM project p
            JOIN assignment a ON a.project_id = p.project_id
            JOIN bid b ON a.bid_id = b.bid_id
            WHERE b.contributor_id = :user_id
            AND p.client_id != :user_id
            AND p.deadline >= CURDATE()
            AND p.status NOT IN ('Completed', 'Canceled')
            
            UNION ALL
            
            SELECT 
                'Milestone' as type,
                CAST(CONCAT(p.title, ' - ', m.title) AS CHAR) as title,
                m.due_date,
                CAST(m.status AS CHAR) as status
            FROM milestone m
            JOIN assignment a ON m.assignment_id = a.assignment_id
            JOIN bid b ON a.bid_id = b.bid_id
            JOIN project p ON a.project_id = p.project_id
            WHERE b.contributor_id = :user_id2
            AND p.client_id != :user_id2
            AND m.due_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            AND m.status != 'Approved'
            
            UNION ALL
            
            SELECT 
                'Bid' as type,
                CAST(CONCAT(p.title, ' - Bid Expires') AS CHAR) as title,
                p.deadline as due_date,
                CAST(b2.status AS CHAR) as status
            FROM bid b2
            JOIN project p ON b2.project_id = p.project_id
            WHERE b2.contributor_id = :user_id3
            AND p.client_id != :user_id3
            AND b2.status = 'Pending'
            AND p.deadline >= CURDATE()
            
            ORDER BY due_date ASC
            LIMIT 10
        ");
        $stmt->execute([
            ':user_id' => $user_id, 
            ':user_id2' => $user_id,
            ':user_id3' => $user_id
        ]);
        $deadlines = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    // Get unread notification count
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count
        FROM notifications
        WHERE user_id = :user_id AND is_read = 0
    ");
    $stmt->execute([':user_id' => $user_id]);
    $notifCount = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Get recent notifications - already filtered by user_id when created
    // Notifications are created with the correct user_id for the recipient
    $stmt = $pdo->prepare("
        SELECT 
            notification_id,
            type,
            payload_json,
            is_read,
            created_at
        FROM notifications
        WHERE user_id = :user_id
        ORDER BY created_at DESC
        LIMIT 5
    ");
    $stmt->execute([':user_id' => $user_id]);
    $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($notifications as &$n) {
        $n['payload'] = json_decode($n['payload_json'], true);
        unset($n['payload_json']);
    }
    
    // Format stats based on role
    if ($isAdmin) {
        // Admin stats format
        echo json_encode([
            'success' => true,
            'role' => $role,
            'stats' => [
                'total_projects' => (int)$stats['total_projects'],
                'completed_projects' => (int)$stats['completed_projects'],
                'in_progress_projects' => (int)$stats['in_progress_projects'],
                'open_projects' => (int)$stats['open_projects'],
                'total_bids' => (int)$stats['total_bids'],
                'accepted_bids' => (int)$stats['accepted_bids'],
                'pending_bids' => (int)$stats['pending_bids'],
                'total_assignments' => (int)$stats['total_assignments']
            ],
            'deadlines' => $deadlines,
            'notifications' => $notifications,
            'unread_notifications' => (int)$notifCount['count']
        ]);
    } else {
        // Regular user stats format
        echo json_encode([
            'success' => true,
            'role' => $role,
            'stats' => [
                'total' => (int)$stats['total'],
                'completed' => (int)$stats['completed'],
                'in_progress' => (int)$stats['in_progress'],
                'pending' => (int)$stats['pending']
            ],
            'deadlines' => $deadlines,
            'notifications' => $notifications,
            'unread_notifications' => (int)$notifCount['count']
        ]);
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}

