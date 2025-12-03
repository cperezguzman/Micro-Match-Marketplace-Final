<?php
// add_milestone.php
// Adds a milestone for an assignment.

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_check.php';

// Only a Client can add milestones to their project
require_role('Client');

// Read JSON body
$body = file_get_contents('php://input');
$data = json_decode($body, true);

// Extract fields
$assignment_id = $data['assignment_id'] ?? null;
$title         = $data['title']         ?? null;
$due_date      = $data['due_date']      ?? null;
$status        = $data['status']        ?? 'Open';

if (!$assignment_id || !$title || !$due_date) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

try {
    $stmt = $pdo->prepare("
        INSERT INTO milestone (assignment_id, title, due_date, status)
        VALUES (:assignment_id, :title, :due_date, :status)
    ");

    $stmt->execute([
        ':assignment_id' => $assignment_id,
        ':title'         => $title,
        ':due_date'      => $due_date,
        ':status'        => $status
    ]);

    echo json_encode([
        'success'      => true,
        'milestone_id' => $pdo->lastInsertId()
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
