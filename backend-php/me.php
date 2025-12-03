<?php
// me.php - Check current session
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

// Suppress any output before JSON
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Start session
session_start();

if (!isset($_SESSION['user_id'])) {
    header('Content-Type: application/json');
    echo json_encode(['logged_in' => false]);
    exit;
}

try {
    // Get user data including profile picture
    $stmt = $pdo->prepare("
        SELECT user_id, name, email, primary_role, profile_picture_url 
        FROM user 
        WHERE user_id = :user_id
    ");
    $stmt->execute([':user_id' => $_SESSION['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user) {
        header('Content-Type: application/json');
        echo json_encode([
            'logged_in'    => true,
            'user_id'      => $user['user_id'],
            'name'         => $user['name'],
            'primary_role' => $user['primary_role'],
            'email'        => $user['email'] || '',
            'profile_picture_url' => $user['profile_picture_url'] || null
        ]);
    } else {
        header('Content-Type: application/json');
        echo json_encode(['logged_in' => false]);
    }
    exit;
} catch (PDOException $e) {
    // Fallback to session data if DB query fails
    header('Content-Type: application/json');
    echo json_encode([
        'logged_in'    => true,
        'user_id'      => $_SESSION['user_id'],
        'name'         => $_SESSION['name'],
        'primary_role' => $_SESSION['primary_role'],
        'email'        => isset($_SESSION['email']) ? $_SESSION['email'] : '',
        'profile_picture_url' => null
    ]);
    exit;
}
