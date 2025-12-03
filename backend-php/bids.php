<?php
// bids.php
// API for bid operations
// GET: Get bids (for a project or by contributor)
// POST: Place a new bid
// PUT: Accept/Reject a bid

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_check.php';
//session_start();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Get bids - can filter by project_id or contributor_id
    // Admins can see all bids regardless of status
    $project_id = isset($_GET['project_id']) ? (int)$_GET['project_id'] : null;
    $contributor_id = isset($_GET['contributor_id']) ? (int)$_GET['contributor_id'] : null;
    $status = isset($_GET['status']) ? $_GET['status'] : null;
    
    $user_id = $_SESSION['user_id'] ?? null;
    $user_role = $_SESSION['primary_role'] ?? null;
    $isAdmin = ($user_role === 'Admin');
    
    try {
        $sql = "
            SELECT 
                b.bid_id,
                b.project_id,
                b.contributor_id,
                b.amount,
                b.timeline_days,
                b.proposal_text,
                b.status,
                b.created_at,
                u.name as contributor_name,
                u.rating_avg as contributor_rating,
                p.title as project_title,
                p.client_id
            FROM bid b
            JOIN user u ON b.contributor_id = u.user_id
            JOIN project p ON b.project_id = p.project_id
            WHERE 1=1
        ";
        
        $params = [];
        
        if ($project_id) {
            $sql .= " AND b.project_id = :project_id";
            $params[':project_id'] = $project_id;
        }
        
        if ($contributor_id) {
            $sql .= " AND b.contributor_id = :contributor_id";
            $params[':contributor_id'] = $contributor_id;
            // For "My Bids" page, exclude rejected bids (they can re-bid, but shouldn't see old rejected bids)
            // Only exclude if no explicit status filter is provided AND user is not admin
            if (!$status && !$isAdmin) {
                $sql .= " AND b.status != 'Rejected'";
            }
        }
        
        if ($status) {
            $sql .= " AND b.status = :status";
            $params[':status'] = $status;
        }
        
        $sql .= " ORDER BY b.created_at DESC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $bids = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'bids' => $bids]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
    
} elseif ($method === 'POST') {
    // Place a new bid - requires login as Contributor
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Not logged in']);
        exit;
    }
    
    $user_id = $_SESSION['user_id'];
    
    $body = file_get_contents('php://input');
    $data = json_decode($body, true);
    
    $project_id = $data['project_id'] ?? null;
    $amount = $data['amount'] ?? null;
    $timeline_days = $data['timeline_days'] ?? null;
    $proposal_text = $data['proposal_text'] ?? null;
    
    if (!$project_id || !$amount || !$timeline_days || !$proposal_text) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields']);
        exit;
    }
    
    try {
        // Check if user already has a bid on this project (any status)
        $check = $pdo->prepare("
            SELECT bid_id, status FROM bid 
            WHERE project_id = :project_id 
            AND contributor_id = :contributor_id
        ");
        $check->execute([
            ':project_id' => $project_id,
            ':contributor_id' => $user_id
        ]);
        
        $existing_bid = $check->fetch(PDO::FETCH_ASSOC);
        
        if ($existing_bid) {
            // If there's a Pending or Accepted bid, don't allow re-bidding
            if (in_array($existing_bid['status'], ['Pending', 'Accepted'])) {
                http_response_code(400);
                echo json_encode(['error' => 'You already have a pending or accepted bid on this project']);
                exit;
            }
            
            // If there's a Rejected bid, update it to Pending with new values
            // This preserves the bid_id for history while allowing re-bidding
            $stmt = $pdo->prepare("
                UPDATE bid 
                SET amount = :amount,
                    timeline_days = :timeline_days,
                    proposal_text = :proposal_text,
                    status = 'Pending',
                    created_at = NOW()
                WHERE bid_id = :bid_id
            ");
            
            $stmt->execute([
                ':bid_id' => $existing_bid['bid_id'],
                ':amount' => $amount,
                ':timeline_days' => $timeline_days,
                ':proposal_text' => $proposal_text
            ]);
            
            $bid_id = $existing_bid['bid_id'];
        } else {
            // No existing bid, insert a new one
            $stmt = $pdo->prepare("
                INSERT INTO bid (project_id, contributor_id, amount, timeline_days, proposal_text)
                VALUES (:project_id, :contributor_id, :amount, :timeline_days, :proposal_text)
            ");
            
            $stmt->execute([
                ':project_id' => $project_id,
                ':contributor_id' => $user_id,
                ':amount' => $amount,
                ':timeline_days' => $timeline_days,
                ':proposal_text' => $proposal_text
            ]);
            
            $bid_id = $pdo->lastInsertId();
        }
        
        // Notify project owner
        $project = $pdo->prepare("SELECT client_id, title FROM project WHERE project_id = :id");
        $project->execute([':id' => $project_id]);
        $proj = $project->fetch(PDO::FETCH_ASSOC);
        
        if ($proj) {
            $notif = $pdo->prepare("
                INSERT INTO notifications (user_id, type, payload_json)
                VALUES (:user_id, 'BidPending', :payload)
            ");
            // Get contributor info for notification
            $contributor = $pdo->prepare("SELECT name FROM user WHERE user_id = :user_id");
            $contributor->execute([':user_id' => $user_id]);
            $contrib = $contributor->fetch(PDO::FETCH_ASSOC);
            $contributor_name = ($contrib && isset($contrib['name']) && !empty($contrib['name'])) 
                ? $contrib['name'] 
                : 'A contributor';
            
            $notif->execute([
                ':user_id' => $proj['client_id'],
                ':payload' => json_encode([
                    'bid_id' => $bid_id,
                    'project_title' => $proj['title'],
                    'amount' => $amount,
                    'timeline_days' => $timeline_days,
                    'contributor_name' => $contributor_name
                ])
            ]);
        }
        
        echo json_encode(['success' => true, 'bid_id' => $bid_id]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
    
} elseif ($method === 'PUT') {
    // Accept or reject a bid - requires user to be in Client mode (via active_role)
    error_reporting(E_ALL);
    ini_set('display_errors', 0);
    
    // Check that user is in Client mode
    require_active_role('Client');
    
    $user_id = $_SESSION['user_id'];
    
    $body = file_get_contents('php://input');
    $data = json_decode($body, true);
    
    $bid_id = $data['bid_id'] ?? null;
    $action = $data['action'] ?? null; // 'accept' or 'reject'
    
    if (!$bid_id || !$action) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'bid_id and action required']);
        exit;
    }
    
    if (!in_array($action, ['accept', 'reject'])) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Invalid action']);
        exit;
    }
    
    try {
        $pdo->beginTransaction();
        
        // Verify user owns the project
        $check = $pdo->prepare("
            SELECT b.bid_id, b.project_id, b.contributor_id, p.client_id, p.title
            FROM bid b
            JOIN project p ON b.project_id = p.project_id
            WHERE b.bid_id = :bid_id
        ");
        $check->execute([':bid_id' => $bid_id]);
        $bid = $check->fetch(PDO::FETCH_ASSOC);
        
        if (!$bid) {
            $pdo->rollBack();
            http_response_code(404);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Bid not found']);
            exit;
        }
        
        if ($bid['client_id'] != $user_id) {
            $pdo->rollBack();
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Not authorized']);
            exit;
        }
        
        // If accepting a bid, handle other bids FIRST (before updating the accepted bid)
        // This avoids trigger conflicts - we reject other bids BEFORE accepting, so when
        // the trigger fires, there are no pending bids for it to update
        if ($action === 'accept') {
            // Get all other pending bids BEFORE we reject them (for notifications)
            $other_bids_stmt = $pdo->prepare("
                SELECT bid_id, contributor_id 
                FROM bid 
                WHERE project_id = :project_id 
                AND bid_id != :bid_id 
                AND status = 'Pending'
            ");
            $other_bids_stmt->execute([
                ':project_id' => $bid['project_id'],
                ':bid_id' => $bid_id
            ]);
            $other_bids_list = $other_bids_stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Reject all other pending bids FIRST (before accepting the selected bid)
            // This prevents the trigger from trying to update bids we're already updating
            // We keep them as 'Rejected' for historical/analytics purposes
            if (count($other_bids_list) > 0) {
                $reject_others = $pdo->prepare("
                    UPDATE bid SET status = 'Rejected' 
                    WHERE project_id = :project_id 
                    AND bid_id != :bid_id 
                    AND status = 'Pending'
                ");
                $reject_others->execute([
                    ':project_id' => $bid['project_id'],
                    ':bid_id' => $bid_id
                ]);
            }
            
            // Create assignment if it doesn't exist (before accepting, so trigger sees it)
            $assign_check = $pdo->prepare("
                SELECT assignment_id FROM assignment WHERE project_id = :project_id
            ");
            $assign_check->execute([':project_id' => $bid['project_id']]);
            $existing_assignment = $assign_check->fetch(PDO::FETCH_ASSOC);
            
            if (!$existing_assignment) {
                $assign_insert = $pdo->prepare("
                    INSERT INTO assignment (project_id, bid_id) 
                    VALUES (:project_id, :bid_id)
                ");
                $assign_insert->execute([
                    ':project_id' => $bid['project_id'],
                    ':bid_id' => $bid_id
                ]);
                $assignment_id = $pdo->lastInsertId();
                
                // Create milestones from project definition if they exist
                $project_stmt = $pdo->prepare("SELECT description FROM project WHERE project_id = :project_id");
                $project_stmt->execute([':project_id' => $bid['project_id']]);
                $project = $project_stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($project && isset($project['description'])) {
                    // Parse milestones from description
                    if (preg_match('/\[MILESTONES\]\s*\n(.*?)(?:\n\n|$)/s', $project['description'], $matches)) {
                        $milestones_json = trim($matches[1]);
                        $milestones = json_decode($milestones_json, true);
                        
                        if (is_array($milestones)) {
                            foreach ($milestones as $milestone) {
                                if (isset($milestone['title']) && isset($milestone['due']) && $milestone['title'] && $milestone['due']) {
                                    // Convert date format if needed (from MM/DD/YYYY to YYYY-MM-DD)
                                    $due_date = $milestone['due'];
                                    if (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', $due_date, $date_parts)) {
                                        $due_date = $date_parts[3] . '-' . $date_parts[1] . '-' . $date_parts[2];
                                    }
                                    
                                    // Check if milestone already exists to prevent duplicates
                                    $check_milestone = $pdo->prepare("
                                        SELECT milestone_id FROM milestone 
                                        WHERE assignment_id = :assignment_id 
                                        AND title = :title 
                                        AND due_date = :due_date
                                    ");
                                    $check_milestone->execute([
                                        ':assignment_id' => $assignment_id,
                                        ':title' => $milestone['title'],
                                        ':due_date' => $due_date
                                    ]);
                                    
                                    if (!$check_milestone->fetch()) {
                                        $milestone_stmt = $pdo->prepare("
                                            INSERT INTO milestone (assignment_id, title, due_date, status)
                                            VALUES (:assignment_id, :title, :due_date, 'Open')
                                        ");
                                        $milestone_stmt->execute([
                                            ':assignment_id' => $assignment_id,
                                            ':title' => $milestone['title'],
                                            ':due_date' => $due_date
                                        ]);
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                $assignment_id = $existing_assignment['assignment_id'];
            }
            
            // Update project status to 'InProgress' when bid is accepted
            $update_project = $pdo->prepare("
                UPDATE project SET status = 'InProgress' 
                WHERE project_id = :project_id AND status = 'Open'
            ");
            $update_project->execute([':project_id' => $bid['project_id']]);
        }
        
        // Set session variable to tell the stored procedure to skip the UPDATE
        // (we've already rejected other bids manually to avoid MySQL error 1442)
        if ($action === 'accept') {
            $pdo->exec("SET @DISABLE_TRIGGER = 1");
        }
        
        // Update the bid status (keep rejected bids in database for history/analytics)
        if ($action === 'reject') {
            // Mark the bid as rejected (soft delete - keep in database)
            $new_status = 'Rejected';
            $stmt = $pdo->prepare("UPDATE bid SET status = :status WHERE bid_id = :bid_id");
            $stmt->execute([':status' => $new_status, ':bid_id' => $bid_id]);
            
            // Send a message to the rejected contributor
            $client_stmt = $pdo->prepare("SELECT name FROM user WHERE user_id = :user_id");
            $client_stmt->execute([':user_id' => $user_id]);
            $client = $client_stmt->fetch(PDO::FETCH_ASSOC);
            $client_name = $client['name'] ?? 'The client';
            
            $reject_message = $pdo->prepare("
                INSERT INTO message (project_id, sender_id, body)
                VALUES (:project_id, :sender_id, :body)
            ");
            $reject_message->execute([
                ':project_id' => $bid['project_id'],
                ':sender_id' => $user_id,
                ':body' => "Thank you for your interest in this project. We've decided to go with another contributor for this opportunity. We appreciate your time and effort, and we hope to work with you on future projects."
            ]);
        } else {
            // Accept the bid (this will fire the trigger)
            // The trigger will call sp_on_bid_accepted, but it will skip the UPDATE
            // because @DISABLE_TRIGGER is set to 1. It will still create the assignment if needed.
            $new_status = 'Accepted';
            $stmt = $pdo->prepare("UPDATE bid SET status = :status WHERE bid_id = :bid_id");
            $stmt->execute([':status' => $new_status, ':bid_id' => $bid_id]);
        }
        
        if ($action === 'accept') {
            $pdo->exec("SET @DISABLE_TRIGGER = 0");
        }
        
        // If accepting, notify rejected contributors and send them a message
        if ($action === 'accept' && isset($other_bids_list) && count($other_bids_list) > 0) {
            // Get client name for the message
            $client_stmt = $pdo->prepare("SELECT name FROM user WHERE user_id = :user_id");
            $client_stmt->execute([':user_id' => $user_id]);
            $client = $client_stmt->fetch(PDO::FETCH_ASSOC);
            $client_name = $client['name'] ?? 'The client';
            
            foreach ($other_bids_list as $other_bid) {
                // Send notification
                $notif = $pdo->prepare("
                    INSERT INTO notifications (user_id, type, payload_json)
                    VALUES (:user_id, 'BidRejected', :payload)
                ");
                $notif->execute([
                    ':user_id' => $other_bid['contributor_id'],
                    ':payload' => json_encode(['bid_id' => $other_bid['bid_id'], 'project_title' => $bid['title']])
                ]);
                
                // Send a message to the declined contributor
                $message = $pdo->prepare("
                    INSERT INTO message (project_id, sender_id, body)
                    VALUES (:project_id, :sender_id, :body)
                ");
                $message->execute([
                    ':project_id' => $bid['project_id'],
                    ':sender_id' => $user_id,
                    ':body' => "Thank you for your interest in this project. We've decided to go with another contributor for this opportunity. We appreciate your time and effort, and we hope to work with you on future projects."
                ]);
            }
        }
        
        // Notify the accepted/rejected contributor
        $notif_type = ($action === 'accept') ? 'BidAccepted' : 'BidRejected';
        $notif = $pdo->prepare("
            INSERT INTO notifications (user_id, type, payload_json)
            VALUES (:user_id, :type, :payload)
        ");
        $notif->execute([
            ':user_id' => $bid['contributor_id'],
            ':type' => $notif_type,
            ':payload' => json_encode(['bid_id' => $bid_id, 'project_title' => $bid['title']])
        ]);
        
        // If accepting, send a message to the accepted contributor
        if ($action === 'accept') {
            // Get client name for the message
            $client_stmt = $pdo->prepare("SELECT name FROM user WHERE user_id = :user_id");
            $client_stmt->execute([':user_id' => $user_id]);
            $client = $client_stmt->fetch(PDO::FETCH_ASSOC);
            $client_name = $client['name'] ?? 'The client';
            
            $accept_message = $pdo->prepare("
                INSERT INTO message (project_id, sender_id, body)
                VALUES (:project_id, :sender_id, :body)
            ");
            $accept_message->execute([
                ':project_id' => $bid['project_id'],
                ':sender_id' => $user_id,
                ':body' => "Congratulations! Your bid has been accepted for this project. We're excited to work with you. Please review the project details and let's get started!"
            ]);
        }
        
        $pdo->commit();
        
        header('Content-Type: application/json');
        echo json_encode(['success' => true]);
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
    
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}

