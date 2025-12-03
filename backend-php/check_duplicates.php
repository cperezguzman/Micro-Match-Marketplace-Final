<?php
// check_duplicates.php
// Check for duplicate milestones and projects

error_reporting(E_ALL);
ini_set('display_errors', 0);

require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

try {
    // Check for duplicate milestones (same assignment_id, title, and due_date)
    $stmt = $pdo->prepare("
        SELECT 
            assignment_id,
            title,
            due_date,
            COUNT(*) as count,
            GROUP_CONCAT(milestone_id ORDER BY milestone_id) as milestone_ids
        FROM milestone
        GROUP BY assignment_id, title, due_date
        HAVING COUNT(*) > 1
    ");
    $stmt->execute();
    $duplicateMilestones = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Check for duplicate projects (same title, client_id, created_at)
    $stmt2 = $pdo->prepare("
        SELECT 
            title,
            client_id,
            created_at,
            COUNT(*) as count,
            GROUP_CONCAT(project_id ORDER BY project_id) as project_ids
        FROM project
        GROUP BY title, client_id, DATE(created_at)
        HAVING COUNT(*) > 1
        ORDER BY created_at DESC
    ");
    $stmt2->execute();
    $duplicateProjects = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'duplicate_milestones' => $duplicateMilestones,
        'duplicate_projects' => $duplicateProjects,
        'milestone_count' => count($duplicateMilestones),
        'project_count' => count($duplicateProjects)
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}

