<?php
// fix_old_project_status.php
// Updates old projects that have accepted bids but still have status 'Open'

require_once __DIR__ . '/db.php';

try {
    $stmt = $pdo->prepare("
        UPDATE project p
        JOIN assignment a ON p.project_id = a.project_id
        JOIN bid b ON a.bid_id = b.bid_id
        SET p.status = 'InProgress'
        WHERE p.status = 'Open'
        AND b.status = 'Accepted'
    ");
    $stmt->execute();
    
    $count = $stmt->rowCount();
    echo "Updated $count project(s) from 'Open' to 'InProgress' status.\n";
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

