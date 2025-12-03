<?php
// upload.php
// Handle file uploads for messages/projects

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Not logged in']);
    exit;
}

$user_id = $_SESSION['user_id'];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Check if file was uploaded
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    header('Content-Type: application/json');
    $error_msg = isset($_FILES['file']) ? 'Upload error code: ' . $_FILES['file']['error'] : 'No file uploaded';
    echo json_encode(['error' => $error_msg]);
    exit;
}

$file = $_FILES['file'];
$project_id = isset($_POST['project_id']) ? (int)$_POST['project_id'] : null;
$message_id = isset($_POST['message_id']) ? (int)$_POST['message_id'] : null;
$is_profile_picture = isset($_POST['is_profile_picture']) && $_POST['is_profile_picture'] === '1';

// Validate file size (max 10MB)
$max_size = 10 * 1024 * 1024;
if ($file['size'] > $max_size) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'File too large. Maximum size is 10MB']);
    exit;
}

// Allowed file types
$allowed_types = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip', 'application/x-rar-compressed',
    'text/plain', 'text/csv'
];

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime_type = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mime_type, $allowed_types)) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'File type not allowed: ' . $mime_type]);
    exit;
}

// Create uploads directory if it doesn't exist
$upload_dir = __DIR__ . '/uploads/';
if (!is_dir($upload_dir)) {
    mkdir($upload_dir, 0755, true);
}

// Generate unique filename
$extension = pathinfo($file['name'], PATHINFO_EXTENSION);
$safe_name = preg_replace('/[^a-zA-Z0-9_-]/', '_', pathinfo($file['name'], PATHINFO_FILENAME));
$unique_name = $safe_name . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
$file_path = $upload_dir . $unique_name;

// Move uploaded file
if (!move_uploaded_file($file['tmp_name'], $file_path)) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Failed to save file']);
    exit;
}

// Generate URL for the file
// Use network IP for multi-user access, or localhost for local-only
// Update this to match your API_BASE in src/api.js
$base_url = 'http://10.0.0.157/backend-php'; // Change to 'http://localhost/backend-php' for local-only
$file_url = $base_url . '/uploads/' . $unique_name;

try {
    // If it's a profile picture, just return the URL (don't save to attachment table)
    if ($is_profile_picture) {
        header('Content-Type: application/json');
        echo json_encode([
            'success' => true,
            'url' => $file_url,
            'filename' => $file['name']
        ]);
        exit;
    }
    
    // Otherwise, save to attachment table
    $stmt = $pdo->prepare("
        INSERT INTO attachment (project_id, url, uploaded_by)
        VALUES (:project_id, :url, :uploaded_by)
    ");
    $stmt->execute([
        ':project_id' => $project_id,
        ':url' => $file_url,
        ':uploaded_by' => $user_id
    ]);
    
    $attachment_id = $pdo->lastInsertId();
    
    echo json_encode([
        'success' => true,
        'attachment_id' => $attachment_id,
        'url' => $file_url,
        'filename' => $file['name']
    ]);
    
} catch (PDOException $e) {
    // If DB insert fails, delete the uploaded file
    if (isset($file_path) && file_exists($file_path)) {
        unlink($file_path);
    }
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    exit;
}

