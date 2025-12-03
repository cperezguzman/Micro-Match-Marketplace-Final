<?php
// register.php - Handle user registration
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

// Suppress any output before JSON
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Start session
session_start();

$body = file_get_contents('php://input');
$data = json_decode($body, true);

$name     = isset($data['name']) ? $data['name'] : null;
$email    = isset($data['email']) ? $data['email'] : null;
$password = isset($data['password']) ? $data['password'] : null;
$role     = isset($data['primary_role']) ? $data['primary_role'] : 'Client';

if (!$email || !$password) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Email and password are required']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Invalid email format']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT user_id FROM user WHERE email = :email");
    $stmt->execute([':email' => $email]);
    if ($stmt->fetch()) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Email already registered']);
        exit;
    }

    $passwordHash = password_hash($password, PASSWORD_BCRYPT);

    $stmt = $pdo->prepare("
        INSERT INTO user (name, email, password_hash, primary_role)
        VALUES (:name, :email, :password_hash, :role)
    ");
    
    $result = $stmt->execute([
        ':name'  => $name ? $name : 'New User',
        ':email' => $email,
        ':role'  => $role,
        ':password_hash'  => $passwordHash
    ]);
    
    if (!$result) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Failed to insert user']);
        exit;
    }

    // Auto-login after registration
    $userId = $pdo->lastInsertId();
    
    if (!$userId) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Failed to get user ID after registration']);
        exit;
    }
    
    $_SESSION['user_id']      = $userId;
    $_SESSION['name']         = $name ? $name : 'New User';
    $_SESSION['primary_role'] = $role;
    $_SESSION['email']        = $email;

    header('Content-Type: application/json');
    echo json_encode([
        'success' => true, 
        'user_id' => $userId,
        'user' => [
            'user_id'      => $userId,
            'name'         => $name ? $name : 'New User',
            'primary_role' => $role,
            'email'        => $email
        ]
    ]);
    exit;
    
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    error_log("Registration error: " . $e->getMessage());
    echo json_encode([
        'error' => 'Database error: ' . $e->getMessage(),
        'details' => 'Check server logs for more information'
    ]);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    error_log("Registration error: " . $e->getMessage());
    echo json_encode([
        'error' => 'Error: ' . $e->getMessage()
    ]);
    exit;
}
