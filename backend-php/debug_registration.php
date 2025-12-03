<?php
// debug_registration.php
// Debug endpoint to check registration issues

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

// Check if user table exists and has correct structure
try {
    $stmt = $pdo->query("SHOW COLUMNS FROM user");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $result = [
        'database' => 'micro_match',
        'table_exists' => true,
        'columns' => array_column($columns, 'Field'),
        'recent_users' => []
    ];
    
    // Get recent users
    $stmt = $pdo->query("SELECT user_id, name, email, primary_role, created_at FROM user ORDER BY created_at DESC LIMIT 10");
    $result['recent_users'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Check session info
    session_start();
    $result['session'] = [
        'user_id' => $_SESSION['user_id'] ?? null,
        'name' => $_SESSION['name'] ?? null,
        'email' => $_SESSION['email'] ?? null,
        'primary_role' => $_SESSION['primary_role'] ?? null
    ];
    
    echo json_encode($result, JSON_PRETTY_PRINT);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Database error: ' . $e->getMessage(),
        'table_exists' => false
    ]);
}

