<?php
// messages.php
// API for messaging functionality
// GET: Get conversations and messages
// POST: Send a new message
//
// Conversations are allowed between:
// - Client of a project AND any contributor who has bid on it
// - This allows pre-assignment discussions

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not logged in']);
    exit;
}

$user_id = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $action = isset($_GET['action']) ? $_GET['action'] : 'conversations';
        
        if ($action === 'conversations') {
            // Get role filter from query param (optional)
            $role_filter = isset($_GET['role']) ? $_GET['role'] : null;
            
            // Build WHERE clause based on role filter
            if ($role_filter === 'Client') {
                // Only show projects where user is the client
                $where_clause = "p.client_id = :user_id";
                $params = [':user_id' => $user_id];
            } elseif ($role_filter === 'Contributor') {
                // Only show projects where user has bid
                $where_clause = "b.contributor_id = :user_id";
                $params = [':user_id' => $user_id];
            } else {
                // Show all (both client and contributor conversations)
                $where_clause = "p.client_id = :user_id OR b.contributor_id = :user_id2";
                $params = [':user_id' => $user_id, ':user_id2' => $user_id];
            }
            
            $stmt = $pdo->prepare("
                SELECT DISTINCT
                    p.project_id,
                    p.title as project_title,
                    p.client_id,
                    client_user.name as client_name,
                    b.bid_id,
                    b.contributor_id,
                    b.status as bid_status,
                    contributor_user.name as contributor_name,
                    (
                        SELECT body FROM message 
                        WHERE project_id = p.project_id 
                        ORDER BY created_at DESC LIMIT 1
                    ) as last_message,
                    (
                        SELECT created_at FROM message 
                        WHERE project_id = p.project_id 
                        ORDER BY created_at DESC LIMIT 1
                    ) as last_message_time
                FROM project p
                JOIN user client_user ON p.client_id = client_user.user_id
                LEFT JOIN bid b ON b.project_id = p.project_id
                LEFT JOIN user contributor_user ON b.contributor_id = contributor_user.user_id
                WHERE $where_clause
                ORDER BY 
                    CASE WHEN b.status = 'Accepted' THEN 0 ELSE 1 END,
                    CASE WHEN b.status = 'Rejected' THEN 1 ELSE 0 END,
                    CASE WHEN last_message_time IS NULL THEN 1 ELSE 0 END,
                    last_message_time DESC
            ");
            
            $stmt->execute($params);
            
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Process rows - group by project for clients, keep separate for contributors
            $conversations = [];
            $seen_projects = [];
            
            foreach ($rows as $row) {
                $isClient = ($row['client_id'] == $user_id);
                
                // For clients: show one conversation per bidder
                // For contributors: show their projects
                if ($isClient) {
                    // Skip if no bidder on this project
                    if (empty($row['contributor_id'])) {
                        // Still show project but mark as no bidders yet
                        $key = 'project_' . $row['project_id'] . '_nobids';
                        if (!isset($seen_projects[$key])) {
                            $seen_projects[$key] = true;
                            $conversations[] = [
                                'project_id' => $row['project_id'],
                                'project_title' => $row['project_title'],
                                'my_role' => 'Client',
                                'other_party_name' => 'No bids yet',
                                'other_party_id' => null,
                                'last_message' => null,
                                'last_message_time' => null,
                                'unread_count' => 0,
                                'bid_status' => null,
                                'can_message' => false
                            ];
                        }
                        continue;
                    }
                    
                    // Show each bidder as a separate conversation
                    $key = 'project_' . $row['project_id'] . '_bidder_' . $row['contributor_id'];
                    if (isset($seen_projects[$key])) continue;
                    $seen_projects[$key] = true;
                    
                    $other_name = $row['contributor_name'];
                    $other_id = $row['contributor_id'];
                    $my_role = 'Client';
                } else {
                    // Contributor sees their bid projects
                    $key = 'project_' . $row['project_id'];
                    if (isset($seen_projects[$key])) continue;
                    $seen_projects[$key] = true;
                    
                    $other_name = $row['client_name'];
                    $other_id = $row['client_id'];
                    $my_role = 'Contributor';
                }
                
                // Calculate unread count
                $unread = 0;
                if ($row['project_id']) {
                    $unreadStmt = $pdo->prepare("
                        SELECT COUNT(*) as cnt FROM message 
                        WHERE project_id = :project_id 
                        AND sender_id != :user_id
                        AND created_at > COALESCE(
                            (SELECT MAX(created_at) FROM message 
                             WHERE project_id = :project_id2 AND sender_id = :user_id2),
                            '1970-01-01'
                        )
                    ");
                    $unreadStmt->execute([
                        ':project_id' => $row['project_id'],
                        ':project_id2' => $row['project_id'],
                        ':user_id' => $user_id,
                        ':user_id2' => $user_id
                    ]);
                    $unreadResult = $unreadStmt->fetch(PDO::FETCH_ASSOC);
                    $unread = (int)$unreadResult['cnt'];
                }
                
                // Check if conversation is closed (rejected bid)
                $is_closed = ($row['bid_status'] === 'Rejected');
                
                $conversations[] = [
                    'project_id' => $row['project_id'],
                    'project_title' => $row['project_title'],
                    'my_role' => $my_role,
                    'other_party_name' => $other_name,
                    'other_party_id' => $other_id,
                    'last_message' => $row['last_message'],
                    'last_message_time' => $row['last_message_time'],
                    'unread_count' => $unread,
                    'bid_status' => $row['bid_status'],
                    'can_message' => !$is_closed, // Can't message if bid is rejected
                    'is_closed' => $is_closed
                ];
            }
            
            echo json_encode(['success' => true, 'conversations' => $conversations]);
            
        } elseif ($action === 'messages') {
            $project_id = isset($_GET['project_id']) ? (int)$_GET['project_id'] : null;
            
            if (!$project_id) {
                http_response_code(400);
                echo json_encode(['error' => 'project_id required']);
                exit;
            }
            
            // Verify user has access (client OR has bid on project)
            $access = $pdo->prepare("
                SELECT 1 FROM project p
                LEFT JOIN bid b ON b.project_id = p.project_id
                WHERE p.project_id = :project_id
                AND (p.client_id = :user_id OR b.contributor_id = :user_id2)
            ");
            $access->execute([
                ':project_id' => $project_id,
                ':user_id' => $user_id,
                ':user_id2' => $user_id
            ]);
            
            if (!$access->fetch()) {
                http_response_code(403);
                echo json_encode(['error' => 'Access denied']);
                exit;
            }
            
            // Get messages
            $stmt = $pdo->prepare("
                SELECT 
                    m.message_id,
                    m.body,
                    m.created_at,
                    m.sender_id,
                    u.name as sender_name,
                    CASE WHEN m.sender_id = :user_id THEN 1 ELSE 0 END as is_mine
                FROM message m
                JOIN user u ON m.sender_id = u.user_id
                WHERE m.project_id = :project_id
                ORDER BY m.created_at ASC
            ");
            
            $stmt->execute([
                ':project_id' => $project_id,
                ':user_id' => $user_id
            ]);
            
            $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'messages' => $messages]);
            
        } elseif ($action === 'unread_count') {
            // Get total unread message count
            $stmt = $pdo->prepare("
                SELECT COALESCE(SUM(unread), 0) as total FROM (
                    SELECT 
                        (SELECT COUNT(*) FROM message m2 
                         WHERE m2.project_id = p.project_id 
                         AND m2.sender_id != :user_id
                         AND m2.created_at > COALESCE(
                             (SELECT MAX(created_at) FROM message 
                              WHERE project_id = p.project_id AND sender_id = :user_id2),
                             '1970-01-01'
                         )
                        ) as unread
                    FROM project p
                    LEFT JOIN bid b ON b.project_id = p.project_id
                    WHERE p.client_id = :user_id3 OR b.contributor_id = :user_id4
                    GROUP BY p.project_id
                ) as counts
            ");
            
            $stmt->execute([
                ':user_id' => $user_id,
                ':user_id2' => $user_id,
                ':user_id3' => $user_id,
                ':user_id4' => $user_id
            ]);
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'unread_count' => (int)$result['total']]);
        }
        
    } elseif ($method === 'POST') {
        $body = file_get_contents('php://input');
        $data = json_decode($body, true);
        
        $project_id = isset($data['project_id']) ? (int)$data['project_id'] : null;
        $message_body = isset($data['body']) ? $data['body'] : null;
        
        if (!$project_id || !$message_body) {
            http_response_code(400);
            echo json_encode(['error' => 'project_id and body required']);
            exit;
        }
        
        // Verify user has access and check bid status
        // If client: can message if they own the project
        // If contributor: can only message if their bid is Accepted or Pending (not Rejected)
        $access = $pdo->prepare("
            SELECT 
                p.client_id,
                b.status as bid_status,
                (SELECT COUNT(*) FROM bid WHERE project_id = :project_id AND status = 'Accepted') as has_accepted_bid
            FROM project p
            LEFT JOIN bid b ON b.project_id = p.project_id AND b.contributor_id = :user_id2
            WHERE p.project_id = :project_id
        ");
        $access->execute([
            ':project_id' => $project_id,
            ':user_id2' => $user_id
        ]);
        
        $access_result = $access->fetch(PDO::FETCH_ASSOC);
        
        if (!$access_result) {
            http_response_code(403);
            echo json_encode(['error' => 'Access denied']);
            exit;
        }
        
        $is_client = ($access_result['client_id'] == $user_id);
        $has_accepted_bid = $access_result['has_accepted_bid'] > 0;
        
        // If user is a contributor with rejected bid, block messaging
        if (!$is_client && $access_result['bid_status'] === 'Rejected') {
            http_response_code(403);
            echo json_encode(['error' => 'This conversation is closed. Your bid was not accepted.']);
            exit;
        }
        
        // If user is a contributor without a bid, block messaging
        if (!$is_client && !$access_result['bid_status']) {
            http_response_code(403);
            echo json_encode(['error' => 'Access denied']);
            exit;
        }
        
        // If client and there's an accepted bid, they should focus on that conversation
        // (This is handled by the frontend showing accepted bids first)
        
        $stmt = $pdo->prepare("
            INSERT INTO message (project_id, sender_id, body)
            VALUES (:project_id, :sender_id, :body)
        ");
        
        $stmt->execute([
            ':project_id' => $project_id,
            ':sender_id' => $user_id,
            ':body' => $message_body
        ]);
        
        $message_id = $pdo->lastInsertId();
        
        // Create notification for other party
        $project = $pdo->prepare("SELECT client_id, title FROM project WHERE project_id = :id");
        $project->execute([':id' => $project_id]);
        $proj = $project->fetch(PDO::FETCH_ASSOC);
        
        if ($proj) {
            // Notify the other party
            $notify_user = ($proj['client_id'] == $user_id) ? null : $proj['client_id'];
            
            // If sender is client, notify all bidders
            if ($proj['client_id'] == $user_id) {
                $bidders = $pdo->prepare("SELECT contributor_id FROM bid WHERE project_id = :pid");
                $bidders->execute([':pid' => $project_id]);
                while ($bidder = $bidders->fetch(PDO::FETCH_ASSOC)) {
                    $notif = $pdo->prepare("
                        INSERT INTO notifications (user_id, type, payload_json)
                        VALUES (:user_id, 'NewMessage', :payload)
                    ");
                    $notif->execute([
                        ':user_id' => $bidder['contributor_id'],
                        ':payload' => json_encode(['project_id' => $project_id, 'project_title' => $proj['title']])
                    ]);
                }
            } else {
                // Notify client
                $notif = $pdo->prepare("
                    INSERT INTO notifications (user_id, type, payload_json)
                    VALUES (:user_id, 'NewMessage', :payload)
                ");
                $notif->execute([
                    ':user_id' => $proj['client_id'],
                    ':payload' => json_encode(['project_id' => $project_id, 'project_title' => $proj['title']])
                ]);
            }
        }
        
        echo json_encode([
            'success' => true,
            'message_id' => $message_id
        ]);
        
    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
