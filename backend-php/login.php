<?php
// login.php - Handle user login
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

// Start session
session_start();

$body = file_get_contents('php://input');
$data = json_decode($body, true);

$email    = isset($data['email']) ? $data['email'] : null;
$password = isset($data['password']) ? $data['password'] : null;

if (!$email || !$password) {
    http_response_code(400);
    echo json_encode(['error' => 'Email and password required']);
    exit;
}

try {
    $stmt = $pdo->prepare("
        SELECT user_id, name, primary_role, password_hash, email, profile_picture_url
        FROM user
        WHERE email = :email
    ");
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !isset($user['password_hash'])) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Invalid credentials']);
        exit;
    }

    if (!password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Invalid credentials']);
        exit;
    }

    if (password_verify($password, $user['password_hash'])) {
        $_SESSION['user_id'] = $user['user_id'];
        $_SESSION['primary_role'] = $user['primary_role'];
    }
    
    $_SESSION['name']  = $user['name'];
    $_SESSION['email'] = $user['email'];

    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'user' => [
            'user_id'      => $user['user_id'],
            'name'         => $user['name'],
            'primary_role' => $user['primary_role'],
            'email'        => $user['email'],
            'profile_picture_url' => $user['profile_picture_url'] || null
        ]
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
