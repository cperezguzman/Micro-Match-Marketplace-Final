<?php
// add_project.php
// Inserts a new project ONLY if a user is logged in as Client.

// Suppress any output before JSON
error_reporting(E_ALL);
ini_set('display_errors', 0);

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_check.php';

// Require login
require_login();

// Get client id from session
$client_id = $_SESSION['user_id'];

// Read JSON body once
$body = file_get_contents('php://input');
$data = json_decode($body, true);

// Allow admins OR users in Client mode to create projects
$user_role = $_SESSION['primary_role'] ?? null;
$isAdmin = ($user_role === 'Admin');

// Get active_role from request (for dual-role users)
$active_role = $data['active_role'] ?? null;

// Check if user is admin OR in Client mode
if (!$isAdmin) {
    // For non-admins, require Client mode
    $currentRole = $active_role ?? $user_role;
    if ($currentRole !== 'Client') {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Forbidden: insufficient role. Please switch to Client mode to perform this action.']);
        exit;
    }
}

// Extract and validate fields
$title       = $data['title']       ?? null;
$description = $data['description'] ?? null;
$scope       = $data['scope']       ?? null; // Optional field
$budget_min  = $data['budget_min']  ?? null;
$budget_max  = $data['budget_max']  ?? null;
$deadline    = $data['deadline']    ?? null;

if (!$title || !$description || !$budget_min || !$budget_max || !$deadline) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

if (!is_numeric($budget_min) || !is_numeric($budget_max)) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Budget must be numeric']);
    exit;
}

try {
    $pdo->beginTransaction();

    // Insert project
    // Store scope and milestones in description with markers for later parsing
    $final_description = $description;
    if ($scope && trim($scope) !== '') {
        // Store scope with a marker
        $final_description = $description . "\n\n[SCOPE]\n" . $scope;
    }
    
    // Store milestones as JSON in description (we'll parse them when assignment is created)
    $milestones = $data['milestones'] ?? [];
    if (is_array($milestones) && count($milestones) > 0) {
        $milestones_json = json_encode($milestones);
        $final_description .= "\n\n[MILESTONES]\n" . $milestones_json;
    }
    
    $stmt = $pdo->prepare("
        INSERT INTO project
            (client_id, title, description, budget_min, budget_max, deadline)
        VALUES
            (:client_id, :title, :description, :budget_min, :budget_max, :deadline)
    ");

    $stmt->execute([
        ':client_id'   => $client_id,
        ':title'       => $title,
        ':description' => $final_description,
        ':budget_min'  => $budget_min,
        ':budget_max'  => $budget_max,
        ':deadline'    => $deadline
    ]);

    $project_id = $pdo->lastInsertId();

    // Add skills if provided
    $skills = $data['skills'] ?? [];
    if (is_array($skills) && count($skills) > 0) {
        foreach ($skills as $skillName) {
            // First, get or create the skill
            $skillStmt = $pdo->prepare("
                SELECT skill_id FROM skill WHERE skill_name = :skill_name
            ");
            $skillStmt->execute([':skill_name' => $skillName]);
            $skill = $skillStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$skill) {
                // Create skill if it doesn't exist
                $createSkillStmt = $pdo->prepare("
                    INSERT INTO skill (skill_name) VALUES (:skill_name)
                ");
                $createSkillStmt->execute([':skill_name' => $skillName]);
                $skill_id = $pdo->lastInsertId();
            } else {
                $skill_id = $skill['skill_id'];
            }
            
            // Link skill to project
            $linkStmt = $pdo->prepare("
                INSERT IGNORE INTO project_skill (project_id, skill_id)
                VALUES (:project_id, :skill_id)
            ");
            $linkStmt->execute([
                ':project_id' => $project_id,
                ':skill_id' => $skill_id
            ]);
        }
    }

    $pdo->commit();

    header('Content-Type: application/json');
    echo json_encode([
        'success'    => true,
        'project_id' => $project_id
    ]);
    exit;
} catch (PDOException $e) {
    $pdo->rollBack();
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
