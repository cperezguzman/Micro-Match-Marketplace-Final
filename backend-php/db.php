<?php
// db.php - connect to MySQL using PDO

$host = "127.0.0.1";          // use IP instead of localhost to avoid IPv6 issues
$dbname = "micro_match";     // change to your database/schema name
$username = "root";   // change to the MySQL user you use
$password = "";   // that user's password

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 5 // 5 second timeout
        ]
    );
} catch (PDOException $e) {
    // Don't use die() in API endpoints - it breaks JSON responses
    // Instead, throw an exception that can be caught by the calling code
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'Database connection failed',
        'message' => $e->getMessage(),
        'hint' => 'Make sure MySQL is running in XAMPP Control Panel'
    ]);
    exit;
}