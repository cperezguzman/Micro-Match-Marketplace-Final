<?php
// fix_duplicates.php
// Combined script to check and fix duplicate milestones and projects

error_reporting(E_ALL);
ini_set('display_errors', 0);

require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

try {
    $pdo->beginTransaction();
    
    $results = [
        'milestones' => [
            'found' => 0,
            'removed' => 0,
            'details' => []
        ],
        'projects' => [
            'found' => 0,
            'removed' => 0,
            'details' => []
        ]
    ];
    
    // ===== CLEAN UP DUPLICATE MILESTONES =====
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
    $results['milestones']['found'] = count($duplicateMilestones);
    
    foreach ($duplicateMilestones as $dup) {
        $allIds = explode(',', $dup['all_ids']);
        $keepId = $dup['keep_id'];
        
        // Remove all IDs except the first one
        $idsToDelete = array_filter($allIds, function($id) use ($keepId) {
            return (int)$id !== (int)$keepId;
        });
        
        if (!empty($idsToDelete)) {
            // Re-index array to ensure sequential keys (required for PDO parameter binding)
            $idsToDelete = array_values($idsToDelete);
            $placeholders = implode(',', array_fill(0, count($idsToDelete), '?'));
            
            // Delete attachments first (foreign key constraint)
            $pdo->prepare("DELETE FROM attachment WHERE milestone_id IN ($placeholders)")->execute($idsToDelete);
            
            // Then delete milestones
            $deleteStmt = $pdo->prepare("DELETE FROM milestone WHERE milestone_id IN ($placeholders)");
            $deleteStmt->execute($idsToDelete);
            $removed = $deleteStmt->rowCount();
            
            $results['milestones']['removed'] += $removed;
            $results['milestones']['details'][] = [
                'assignment_id' => $dup['assignment_id'],
                'title' => $dup['title'],
                'removed_count' => $removed,
                'kept_id' => $keepId
            ];
        }
    }
    
    // ===== CLEAN UP DUPLICATE PROJECTS =====
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
        ORDER BY p.title, p.client_id, p.created_at ASC
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
    
    $results['projects']['found'] = count($projectGroups);
    
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
                $pdo->prepare("DELETE FROM project_skill WHERE project_id = ?")->execute([$proj['project_id']]);
                $pdo->prepare("DELETE FROM attachment WHERE project_id = ?")->execute([$proj['project_id']]);
                $pdo->prepare("DELETE FROM message WHERE project_id = ?")->execute([$proj['project_id']]);
                
                // Delete milestones via assignments
                $assignStmt = $pdo->prepare("SELECT assignment_id FROM assignment WHERE project_id = ?");
                $assignStmt->execute([$proj['project_id']]);
                $assignments = $assignStmt->fetchAll(PDO::FETCH_COLUMN);
                foreach ($assignments as $assignId) {
                    $pdo->prepare("DELETE FROM attachment WHERE milestone_id IN (SELECT milestone_id FROM milestone WHERE assignment_id = ?)")->execute([$assignId]);
                    $pdo->prepare("DELETE FROM milestone WHERE assignment_id = ?")->execute([$assignId]);
                }
                
                $pdo->prepare("DELETE FROM assignment WHERE project_id = ?")->execute([$proj['project_id']]);
                $pdo->prepare("DELETE FROM bid WHERE project_id = ?")->execute([$proj['project_id']]);
                $pdo->prepare("DELETE FROM project WHERE project_id = ?")->execute([$proj['project_id']]);
                
                $results['projects']['removed']++;
                $results['projects']['details'][] = [
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
        'message' => 'Duplicate cleanup completed',
        'results' => $results
    ], JSON_PRETTY_PRINT);
    
} catch (PDOException $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage()
    ], JSON_PRETTY_PRINT);
}

