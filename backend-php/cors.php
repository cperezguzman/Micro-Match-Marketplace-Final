<?php
// cors.php - Include this at the very top of each PHP endpoint

// Must be called before ANY output
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

// Allow localhost on common React dev server ports
$allowed_origins = [
    'http://localhost:3000', 
    'http://localhost:3001', 
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002'
];

// Allow local network access (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
$is_local_network = false;
if ($origin) {
    $host = parse_url($origin, PHP_URL_HOST);
    if ($host) {
        // Check if it's a local network IP
        $is_local_network = (
            preg_match('/^10\./', $host) ||
            preg_match('/^192\.168\./', $host) ||
            preg_match('/^172\.(1[6-9]|2[0-9]|3[0-1])\./', $host) ||
            $host === 'localhost' ||
            $host === '127.0.0.1'
        );
    }
}

if (in_array($origin, $allowed_origins) || $is_local_network) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: http://localhost:3000");
}

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

