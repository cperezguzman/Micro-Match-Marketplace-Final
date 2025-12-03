<?php
// clean_rejected_assignments.php
// Remove assignments that are linked to rejected bids

require_once __DIR__ . '/db.php';

try {
    // Find assignments with rejected bids
    $stmt = $pdo->prepare("
        SELECT a.assignment_id, a.project_id, a.bid_id, b.status as bid_status
        FROM assignment a
        JOIN bid b ON a.bid_id = b.bid_id
        WHERE b.status = 'Rejected'
    ");
    $stmt->execute();
    $rejected_assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Found " . count($rejected_assignments) . " assignment(s) with rejected bids:\n";
    foreach ($rejected_assignments as $assign) {
        echo "  - Assignment ID: {$assign['assignment_id']}, Project ID: {$assign['project_id']}, Bid ID: {$assign['bid_id']}, Bid Status: {$assign['bid_status']}\n";
    }
    
    if (count($rejected_assignments) > 0) {
        // Delete these assignments
        $delete_stmt = $pdo->prepare("
            DELETE a FROM assignment a
            JOIN bid b ON a.bid_id = b.bid_id
            WHERE b.status = 'Rejected'
        ");
        $delete_stmt->execute();
        $deleted_count = $delete_stmt->rowCount();
        echo "\nDeleted $deleted_count assignment(s) with rejected bids.\n";
    } else {
        echo "\nNo assignments with rejected bids found. Database is clean.\n";
    }
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

