<?php
// delete_project.php
// Delete a project (Admin only)

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_check.php';

// Suppress any output before JSON
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Only Admins can delete projects 
require_role('Admin');

$user_id = $_SESSION['user_id'];
$body = file_get_contents('php://input');
$data = json_decode($body, true);

$project_id = isset($data['project_id']) ? (int)$data['project_id'] : null;

if (!$project_id) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'project_id required']);
    exit;
}

try {
    // Verify the project exists
    $stmt = $pdo->prepare("SELECT project_id FROM project WHERE project_id = :project_id");
    $stmt->execute([':project_id' => $project_id]);
    $project = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$project) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Project not found']);
        exit;
    }
    
    // Admins can delete any project, including those with assignments
    // No additional checks needed since require_role('Admin') already ensures only admins can access this endpoint
    
    // Delete project (cascade will handle related records)
    // Note: We'll set status to 'Canceled' instead of actually deleting
    // to preserve data integrity, or we can actually delete if no assignments exist
    
    $pdo->beginTransaction();
    
    // Delete related records in correct order (respecting foreign key constraints)
    
    // 1. Delete attachments that reference milestones (via assignments)
    $stmt = $pdo->prepare("
        DELETE a FROM attachment a
        INNER JOIN milestone m ON a.milestone_id = m.milestone_id
        INNER JOIN assignment ass ON m.assignment_id = ass.assignment_id
        WHERE ass.project_id = :project_id
    ");
    $stmt->execute([':project_id' => $project_id]);
    
    // 2. Delete milestones (they reference assignments)
    $stmt = $pdo->prepare("
        DELETE m FROM milestone m
        INNER JOIN assignment a ON m.assignment_id = a.assignment_id
        WHERE a.project_id = :project_id
    ");
    $stmt->execute([':project_id' => $project_id]);
    
    // 3. Delete attachments that reference bids for this project
    $stmt = $pdo->prepare("
        DELETE a FROM attachment a
        INNER JOIN bid b ON a.bid_id = b.bid_id
        WHERE b.project_id = :project_id
    ");
    $stmt->execute([':project_id' => $project_id]);
    
    // 4. Delete assignments (they reference bids and block bid deletion)
    $stmt = $pdo->prepare("DELETE FROM assignment WHERE project_id = :project_id");
    $stmt->execute([':project_id' => $project_id]);
    
    // 5. Delete bids (now safe since assignments are deleted)
    $stmt = $pdo->prepare("DELETE FROM bid WHERE project_id = :project_id");
    $stmt->execute([':project_id' => $project_id]);
    
    // 6. Delete other project-related records
    $stmt = $pdo->prepare("DELETE FROM project_skill WHERE project_id = :project_id");
    $stmt->execute([':project_id' => $project_id]);
    
    $stmt = $pdo->prepare("DELETE FROM attachment WHERE project_id = :project_id");
    $stmt->execute([':project_id' => $project_id]);
    
    // 7. Delete notifications related to this project
    $stmt = $pdo->prepare("
        DELETE FROM notifications 
        WHERE payload_json LIKE CONCAT('%\"project_id\":', :project_id, '%')
           OR payload_json LIKE CONCAT('%\"project_id\": ', :project_id, '%')
    ");
    $stmt->execute([':project_id' => $project_id]);
    
    // 8. Delete messages
    $stmt = $pdo->prepare("DELETE FROM message WHERE project_id = :project_id");
    $stmt->execute([':project_id' => $project_id]);
    
    // 9. Delete reviews related to this project
    $stmt = $pdo->prepare("DELETE FROM review WHERE project_id = :project_id");
    $stmt->execute([':project_id' => $project_id]);
    
    // 10. Finally delete the project
    $stmt = $pdo->prepare("DELETE FROM project WHERE project_id = :project_id");
    $stmt->execute([':project_id' => $project_id]);
    
    $pdo->commit();
    
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'message' => 'Project deleted successfully']);
    exit;
    
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    exit;
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Error: ' . $e->getMessage()]);
    exit;
}
