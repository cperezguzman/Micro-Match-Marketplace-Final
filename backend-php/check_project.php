<?php
// check_project.php - Debug endpoint to check if a project exists
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

$project_id = isset($_GET['project_id']) ? (int)$_GET['project_id'] : null;

if (!$project_id) {
    http_response_code(400);
    echo json_encode(['error' => 'project_id required']);
    exit;
}

try {
    // Check if project exists
    $stmt = $pdo->prepare("SELECT project_id, title, client_id, status FROM project WHERE project_id = :project_id");
    $stmt->execute([':project_id' => $project_id]);
    $project = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($project) {
        echo json_encode([
            'success' => true,
            'exists' => true,
            'project' => $project
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'exists' => false,
            'message' => 'Project not found in database'
        ]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}

