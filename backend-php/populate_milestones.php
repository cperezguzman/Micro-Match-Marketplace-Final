<?php
// populate_milestones.php
// Script to populate milestones for old projects that have assignments but no milestones
// Run this once to backfill milestones for existing projects

error_reporting(E_ALL);
ini_set('display_errors', 0);

require_once __DIR__ . '/db.php';

try {
    // Find assignments that have no milestones
    $stmt = $pdo->prepare("
        SELECT 
            a.assignment_id,
            a.project_id,
            p.description,
            p.title as project_title
        FROM assignment a
        JOIN project p ON a.project_id = p.project_id
        WHERE NOT EXISTS (
            SELECT 1 FROM milestone m WHERE m.assignment_id = a.assignment_id
        )
        AND p.description IS NOT NULL
        AND p.description != ''
    ");
    $stmt->execute();
    $assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $created = 0;
    $skipped = 0;
    
    foreach ($assignments as $assignment) {
        $description = $assignment['description'];
        
        // Try to parse milestones from [MILESTONES] marker
        if (preg_match('/\[MILESTONES\]\s*\n(.*?)$/s', $description, $matches)) {
            $milestones_json = trim($matches[1]);
            $milestones = json_decode($milestones_json, true);
            
            if (is_array($milestones) && count($milestones) > 0) {
                foreach ($milestones as $milestone) {
                    if (isset($milestone['title']) && isset($milestone['due']) && $milestone['title'] && $milestone['due']) {
                        // Convert date format if needed (from MM/DD/YYYY to YYYY-MM-DD)
                        $due_date = $milestone['due'];
                        if (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', $due_date, $date_parts)) {
                            $due_date = $date_parts[3] . '-' . $date_parts[1] . '-' . $date_parts[2];
                        }
                        
                        // Check if milestone already exists
                        $check_stmt = $pdo->prepare("
                            SELECT milestone_id FROM milestone 
                            WHERE assignment_id = :assignment_id 
                            AND title = :title 
                            AND due_date = :due_date
                        ");
                        $check_stmt->execute([
                            ':assignment_id' => $assignment['assignment_id'],
                            ':title' => $milestone['title'],
                            ':due_date' => $due_date
                        ]);
                        
                        if (!$check_stmt->fetch()) {
                            $milestone_stmt = $pdo->prepare("
                                INSERT INTO milestone (assignment_id, title, due_date, status)
                                VALUES (:assignment_id, :title, :due_date, 'Open')
                            ");
                            $milestone_stmt->execute([
                                ':assignment_id' => $assignment['assignment_id'],
                                ':title' => $milestone['title'],
                                ':due_date' => $due_date
                            ]);
                            $created++;
                        } else {
                            $skipped++;
                        }
                    }
                }
            } else {
                // If no milestones in JSON, create default milestones
                $default_milestones = [
                    ['title' => 'Initial Setup', 'days' => 7],
                    ['title' => 'Development Phase', 'days' => 14],
                    ['title' => 'Testing & Review', 'days' => 7],
                    ['title' => 'Final Delivery', 'days' => 3]
                ];
                
                // Get project deadline or use current date + 30 days
                $project_stmt = $pdo->prepare("SELECT deadline FROM project WHERE project_id = :project_id");
                $project_stmt->execute([':project_id' => $assignment['project_id']]);
                $project = $project_stmt->fetch(PDO::FETCH_ASSOC);
                
                $base_date = $project && $project['deadline'] 
                    ? new DateTime($project['deadline'])
                    : new DateTime('+30 days');
                
                $current_date = clone $base_date;
                $total_days = array_sum(array_column($default_milestones, 'days'));
                $current_date->modify("-{$total_days} days");
                
                foreach ($default_milestones as $idx => $milestone) {
                    $due_date = clone $current_date;
                    $due_date->modify("+{$milestone['days']} days");
                    
                    // Check if milestone already exists
                    $check_stmt = $pdo->prepare("
                        SELECT milestone_id FROM milestone 
                        WHERE assignment_id = :assignment_id 
                        AND title = :title 
                        AND due_date = :due_date
                    ");
                    $check_stmt->execute([
                        ':assignment_id' => $assignment['assignment_id'],
                        ':title' => $milestone['title'],
                        ':due_date' => $due_date->format('Y-m-d')
                    ]);
                    
                    if (!$check_stmt->fetch()) {
                        $milestone_stmt = $pdo->prepare("
                            INSERT INTO milestone (assignment_id, title, due_date, status)
                            VALUES (:assignment_id, :title, :due_date, 'Open')
                        ");
                        $milestone_stmt->execute([
                            ':assignment_id' => $assignment['assignment_id'],
                            ':title' => $milestone['title'],
                            ':due_date' => $due_date->format('Y-m-d')
                        ]);
                        $created++;
                    } else {
                        $skipped++;
                    }
                }
            }
        } else {
            // No [MILESTONES] marker, create default milestones
            $default_milestones = [
                ['title' => 'Initial Setup', 'days' => 7],
                ['title' => 'Development Phase', 'days' => 14],
                ['title' => 'Testing & Review', 'days' => 7],
                ['title' => 'Final Delivery', 'days' => 3]
            ];
            
            // Get project deadline or use current date + 30 days
            $project_stmt = $pdo->prepare("SELECT deadline FROM project WHERE project_id = :project_id");
            $project_stmt->execute([':project_id' => $assignment['project_id']]);
            $project = $project_stmt->fetch(PDO::FETCH_ASSOC);
            
            $base_date = $project && $project['deadline'] 
                ? new DateTime($project['deadline'])
                : new DateTime('+30 days');
            
            $current_date = clone $base_date;
            $total_days = array_sum(array_column($default_milestones, 'days'));
            $current_date->modify("-{$total_days} days");
            
            foreach ($default_milestones as $idx => $milestone) {
                $due_date = clone $current_date;
                $due_date->modify("+{$milestone['days']} days");
                
                $milestone_stmt = $pdo->prepare("
                    INSERT INTO milestone (assignment_id, title, due_date, status)
                    VALUES (:assignment_id, :title, :due_date, 'Open')
                ");
                $milestone_stmt->execute([
                    ':assignment_id' => $assignment['assignment_id'],
                    ':title' => $milestone['title'],
                    ':due_date' => $due_date->format('Y-m-d')
                ]);
                $created++;
            }
        }
    }
    
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'message' => "Populated milestones for assignments",
        'assignments_processed' => count($assignments),
        'milestones_created' => $created,
        'skipped' => $skipped
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}

