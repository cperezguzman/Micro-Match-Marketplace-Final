<?php
// cleanup_duplicates.php
// Clean up duplicate milestones and projects

error_reporting(E_ALL);
ini_set('display_errors', 0);

require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

try {
    $pdo->beginTransaction();
    
    $cleaned = [
        'milestones_removed' => 0,
        'projects_removed' => 0,
        'milestone_details' => [],
        'project_details' => []
    ];
    
    // Clean up duplicate milestones - keep the first one, delete the rest
    $stmt = $pdo->prepare("
        SELECT 
            assignment_id,
            title,
            due_date,
            MIN(milestone_id) as keep_id,
            GROUP_CONCAT(milestone_id ORDER BY milestone_id) as all_ids
        FROM milestone
        GROUP BY assignment_id, title, due_date
        HAVING COUNT(*) > 1
    ");
    $stmt->execute();
    $duplicateMilestones = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($duplicateMilestones as $dup) {
        $allIds = explode(',', $dup['all_ids']);
        $keepId = $dup['keep_id'];
        
        // Remove all IDs except the first one
        $idsToDelete = array_filter($allIds, function($id) use ($keepId) {
            return (int)$id !== (int)$keepId;
        });
        
        if (!empty($idsToDelete)) {
            $placeholders = implode(',', array_fill(0, count($idsToDelete), '?'));
            $deleteStmt = $pdo->prepare("
                DELETE FROM milestone 
                WHERE milestone_id IN ($placeholders)
            ");
            $deleteStmt->execute($idsToDelete);
            $cleaned['milestones_removed'] += $deleteStmt->rowCount();
            $cleaned['milestone_details'][] = [
                'assignment_id' => $dup['assignment_id'],
                'title' => $dup['title'],
                'removed_count' => count($idsToDelete),
                'kept_id' => $keepId
            ];
        }
    }
    
    // Clean up duplicate projects - keep the first one, delete the rest
    // Only delete if they have no accepted bids (to be safe)
    $stmt2 = $pdo->prepare("
        SELECT 
            p.project_id,
            p.title,
            p.client_id,
            p.created_at,
            (SELECT COUNT(*) FROM assignment a JOIN bid b ON a.bid_id = b.bid_id 
             WHERE a.project_id = p.project_id AND b.status = 'Accepted') as has_assignment
        FROM project p
        WHERE (p.title, p.client_id, DATE(p.created_at)) IN (
            SELECT title, client_id, DATE(created_at)
            FROM project
            GROUP BY title, client_id, DATE(created_at)
            HAVING COUNT(*) > 1
        )
        ORDER BY p.created_at ASC
    ");
    $stmt2->execute();
    $allDuplicateProjects = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    
    // Group by title + client_id + date
    $projectGroups = [];
    foreach ($allDuplicateProjects as $proj) {
        $key = $proj['title'] . '|' . $proj['client_id'] . '|' . date('Y-m-d', strtotime($proj['created_at']));
        if (!isset($projectGroups[$key])) {
            $projectGroups[$key] = [];
        }
        $projectGroups[$key][] = $proj;
    }
    
    foreach ($projectGroups as $key => $group) {
        // Sort by created_at to keep the oldest one
        usort($group, function($a, $b) {
            return strtotime($a['created_at']) - strtotime($b['created_at']);
        });
        
        $keepProject = $group[0];
        $toDelete = array_slice($group, 1);
        
        foreach ($toDelete as $proj) {
            // Only delete if no accepted bids/assignments AND no bids at all (to be safe)
            $bidCheck = $pdo->prepare("SELECT COUNT(*) as cnt FROM bid WHERE project_id = ?");
            $bidCheck->execute([$proj['project_id']]);
            $bidCount = $bidCheck->fetch(PDO::FETCH_ASSOC)['cnt'];
            
            if ($proj['has_assignment'] == 0 && $bidCount == 0) {
                // Delete related records first (in reverse order of foreign keys)
                // Note: notifications might reference project_id in JSON, but we'll skip deleting them
                // as the JSON extraction might not work in all MySQL versions
                $pdo->prepare("DELETE FROM project_skill WHERE project_id = ?")->execute([$proj['project_id']]);
                $pdo->prepare("DELETE FROM attachment WHERE project_id = ?")->execute([$proj['project_id']]);
                $pdo->prepare("DELETE FROM message WHERE project_id = ?")->execute([$proj['project_id']]);
                
                // Delete milestones via assignments
                $assignStmt = $pdo->prepare("SELECT assignment_id FROM assignment WHERE project_id = ?");
                $assignStmt->execute([$proj['project_id']]);
                $assignments = $assignStmt->fetchAll(PDO::FETCH_COLUMN);
                foreach ($assignments as $assignId) {
                    $pdo->prepare("DELETE FROM milestone WHERE assignment_id = ?")->execute([$assignId]);
                }
                
                $pdo->prepare("DELETE FROM assignment WHERE project_id = ?")->execute([$proj['project_id']]);
                $pdo->prepare("DELETE FROM bid WHERE project_id = ?")->execute([$proj['project_id']]);
                $pdo->prepare("DELETE FROM project WHERE project_id = ?")->execute([$proj['project_id']]);
                
                $cleaned['projects_removed']++;
                $cleaned['project_details'][] = [
                    'project_id' => $proj['project_id'],
                    'title' => $proj['title'],
                    'kept_id' => $keepProject['project_id']
                ];
            }
        }
    }
    
    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'cleaned' => $cleaned
    ]);
    
} catch (PDOException $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}

