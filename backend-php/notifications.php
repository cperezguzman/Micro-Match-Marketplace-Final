<?php
// notifications.php
// API for notifications
// GET: Get notifications or unread count
// PUT: Mark notification as read

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not logged in']);
    exit;
}

$user_id = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $action = $_GET['action'] ?? 'list';
    
    if ($action === 'list') {
        // Get all notifications for user
        // Notifications are already created with the correct user_id for the recipient
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        
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
            LIMIT :limit
        ");
        $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Parse JSON payload for each notification
        foreach ($notifications as &$n) {
            $n['payload'] = json_decode($n['payload_json'], true);
            unset($n['payload_json']);
            $n['is_read'] = (bool)$n['is_read'];
        }
        
        echo json_encode(['success' => true, 'notifications' => $notifications]);
        
    } elseif ($action === 'unread_count') {
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as count
            FROM notifications
            WHERE user_id = :user_id AND is_read = 0
        ");
        $stmt->execute([':user_id' => $user_id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'unread_count' => (int)$result['count']]);
    }
    
} elseif ($method === 'PUT') {
    // Mark notification(s) as read
    $body = file_get_contents('php://input');
    $data = json_decode($body, true);
    
    $notification_id = $data['notification_id'] ?? null;
    $mark_all = $data['mark_all'] ?? false;
    
    try {
        if ($mark_all) {
            // Mark all as read
            $stmt = $pdo->prepare("
                UPDATE notifications SET is_read = 1
                WHERE user_id = :user_id
            ");
            $stmt->execute([':user_id' => $user_id]);
        } elseif ($notification_id) {
            // Mark specific notification as read
            $stmt = $pdo->prepare("
                UPDATE notifications SET is_read = 1
                WHERE notification_id = :notification_id AND user_id = :user_id
            ");
            $stmt->execute([
                ':notification_id' => $notification_id,
                ':user_id' => $user_id
            ]);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'notification_id or mark_all required']);
            exit;
        }
        
        echo json_encode(['success' => true]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error']);
    }
    
} elseif ($method === 'POST') {
    // Create a notification (for internal use / testing)
    $body = file_get_contents('php://input');
    $data = json_decode($body, true);
    
    $target_user_id = $data['user_id'] ?? null;
    $type = $data['type'] ?? null;
    $payload = $data['payload'] ?? [];
    
    if (!$target_user_id || !$type) {
        http_response_code(400);
        echo json_encode(['error' => 'user_id and type required']);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("
            INSERT INTO notifications (user_id, type, payload_json)
            VALUES (:user_id, :type, :payload)
        ");
        $stmt->execute([
            ':user_id' => $target_user_id,
            ':type' => $type,
            ':payload' => json_encode($payload)
        ]);
        
        echo json_encode(['success' => true, 'notification_id' => $pdo->lastInsertId()]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error']);
    }
    
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}

