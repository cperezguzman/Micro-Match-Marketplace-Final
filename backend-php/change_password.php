<?php
// change_password.php
// API for changing user password
// POST: Change password

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
    
    $current_password = $data['current_password'] ?? null;
    $new_password = $data['new_password'] ?? null;
    
    if (!$current_password || !$new_password) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Current password and new password are required']);
        exit;
    }
    
    if (strlen($new_password) < 6) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'New password must be at least 6 characters']);
        exit;
    }
    
    try {
        // Get current user's password hash
        $stmt = $pdo->prepare("SELECT password_hash FROM user WHERE user_id = :user_id");
        $stmt->execute([':user_id' => $user_id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            http_response_code(404);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'User not found']);
            exit;
        }
        
        // Verify current password
        if (!password_verify($current_password, $user['password_hash'])) {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Current password is incorrect']);
            exit;
        }
        
        // Hash new password
        $new_password_hash = password_hash($new_password, PASSWORD_BCRYPT);
        
        // Update password
        $update_stmt = $pdo->prepare("UPDATE user SET password_hash = :password_hash WHERE user_id = :user_id");
        $update_stmt->execute([
            ':password_hash' => $new_password_hash,
            ':user_id' => $user_id
        ]);
        
        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'message' => 'Password changed successfully']);
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

