<?php
// update_bid.php
// Update bid details (amount, timeline, proposal) - requires Client acceptance
// POST/PATCH: Update bid details (creates a pending update that needs client approval)

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_check.php';

error_reporting(E_ALL);
ini_set('display_errors', 0);

require_login();

// Accept both POST and PATCH methods
$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'POST' && $method !== 'PATCH') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Method not allowed. Use POST or PATCH.']);
    exit;
}

$user_id = $_SESSION['user_id'];
$body = file_get_contents('php://input');
$data = json_decode($body, true);

$bid_id = isset($data['bid_id']) ? (int)$data['bid_id'] : null;
$amount = isset($data['amount']) ? (float)$data['amount'] : null;
$timeline_days = isset($data['timeline_days']) ? (int)$data['timeline_days'] : null;
$proposal_text = isset($data['proposal_text']) ? trim($data['proposal_text']) : null;

if (!$bid_id) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Bid ID required']);
    exit;
}

try {
    // Verify the bid belongs to the current user (contributor)
    $stmt = $pdo->prepare("
        SELECT b.bid_id, b.project_id, b.contributor_id, b.status, p.client_id, p.title
        FROM bid b
        JOIN project p ON b.project_id = p.project_id
        WHERE b.bid_id = :bid_id
    ");
    $stmt->execute([':bid_id' => $bid_id]);
    $bid = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$bid) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Bid not found']);
        exit;
    }
    
    if ($bid['contributor_id'] != $user_id) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'You can only update your own bids']);
        exit;
    }
    
    // Check if bid is already accepted (can't update accepted bids)
    if ($bid['status'] === 'Accepted') {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Cannot update an accepted bid']);
        exit;
    }
    
    $pdo->beginTransaction();
    
    // Build update query
    $updateFields = [];
    $params = [':bid_id' => $bid_id];
    
    if ($amount !== null) {
        $updateFields[] = "amount = :amount";
        $params[':amount'] = $amount;
    }
    
    if ($timeline_days !== null) {
        $updateFields[] = "timeline_days = :timeline_days";
        $params[':timeline_days'] = $timeline_days;
    }
    
    if ($proposal_text !== null) {
        $updateFields[] = "proposal_text = :proposal_text";
        $params[':proposal_text'] = $proposal_text;
    }
    
    if (count($updateFields) === 0) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'No fields to update']);
        exit;
    }
    
    // Update the bid
    // Note: updated_at column doesn't exist in bid table, so we don't set it
    $sql = "UPDATE bid SET " . implode(", ", $updateFields) . " WHERE bid_id = :bid_id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    // Notify the client about the bid update
    $notif = $pdo->prepare("
        INSERT INTO notifications (user_id, type, payload_json)
        VALUES (:user_id, 'BidUpdated', :payload)
    ");
    $notif->execute([
        ':user_id' => $bid['client_id'],
        ':payload' => json_encode([
            'bid_id' => $bid_id,
            'project_title' => $bid['title'],
            'contributor_name' => $_SESSION['name'] ?? 'A contributor'
        ])
    ]);
    
    $pdo->commit();
    
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'message' => 'Bid updated successfully. Client will be notified.']);
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

