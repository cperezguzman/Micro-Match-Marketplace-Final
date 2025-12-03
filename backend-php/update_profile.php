<?php
// update_profile.php
// Update user profile information (bio, skills, profile picture, experience)

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth_check.php';

// Suppress any output before JSON
error_reporting(E_ALL);
ini_set('display_errors', 0);

require_login();

$user_id = $_SESSION['user_id'];
$body = file_get_contents('php://input');
$data = json_decode($body, true);

try {
    // Check and add columns if they don't exist (safe migration)
    try {
        $pdo->exec("ALTER TABLE `user` ADD COLUMN IF NOT EXISTS `bio` TEXT NULL");
    } catch (PDOException $e) {
        // Column might already exist, ignore
    }
    try {
        $pdo->exec("ALTER TABLE `user` ADD COLUMN IF NOT EXISTS `profile_picture_url` VARCHAR(500) NULL");
    } catch (PDOException $e) {
        // Column might already exist, ignore
    }
    try {
        $pdo->exec("ALTER TABLE `user` ADD COLUMN IF NOT EXISTS `experience_level` VARCHAR(50) NULL");
    } catch (PDOException $e) {
        // Column might already exist, ignore
    }
    
    $pdo->beginTransaction();
    
    // Update basic user info
    $updateFields = [];
    $params = [':user_id' => $user_id];
    
    if (isset($data['name'])) {
        $updateFields[] = "name = :name";
        $params[':name'] = $data['name'];
    }
    
    if (isset($data['bio'])) {
        $updateFields[] = "bio = :bio";
        $params[':bio'] = $data['bio'];
    }
    
    // Only update profile_picture_url if it's provided and not null
    if (isset($data['profile_picture_url']) && $data['profile_picture_url'] !== null) {
        $updateFields[] = "profile_picture_url = :profile_picture_url";
        $params[':profile_picture_url'] = $data['profile_picture_url'];
    }
    
    if (isset($data['experience_level'])) {
        $updateFields[] = "experience_level = :experience_level";
        $params[':experience_level'] = $data['experience_level'];
    }
    
    if (isset($data['primary_role'])) {
        $updateFields[] = "primary_role = :primary_role";
        $params[':primary_role'] = $data['primary_role'];
    }
    
    if (count($updateFields) > 0) {
        $sql = "UPDATE user SET " . implode(", ", $updateFields) . " WHERE user_id = :user_id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    }
    
    // Handle skills - delete existing and add new ones
    if (isset($data['skills']) && is_array($data['skills'])) {
        // Delete existing user skills
        $stmt = $pdo->prepare("DELETE FROM user_skill WHERE user_id = :user_id");
        $stmt->execute([':user_id' => $user_id]);
        
        // Add new skills
        foreach ($data['skills'] as $skillName) {
            if (empty(trim($skillName))) continue;
            
            // Get or create skill
            $stmt = $pdo->prepare("SELECT skill_id FROM skill WHERE skill_name = :skill_name");
            $stmt->execute([':skill_name' => trim($skillName)]);
            $skill = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$skill) {
                $stmt = $pdo->prepare("INSERT INTO skill (skill_name) VALUES (:skill_name)");
                $stmt->execute([':skill_name' => trim($skillName)]);
                $skill_id = $pdo->lastInsertId();
            } else {
                $skill_id = $skill['skill_id'];
            }
            
            // Link skill to user
            $stmt = $pdo->prepare("INSERT IGNORE INTO user_skill (user_id, skill_id) VALUES (:user_id, :skill_id)");
            $stmt->execute([':user_id' => $user_id, ':skill_id' => $skill_id]);
        }
    }
    
    $pdo->commit();
    
    // Return updated user data
    $stmt = $pdo->prepare("SELECT user_id, name, email, primary_role, bio, profile_picture_url, experience_level FROM user WHERE user_id = :user_id");
    $stmt->execute([':user_id' => $user_id]);
    $updatedUser = $stmt->fetch(PDO::FETCH_ASSOC);
    
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true, 
        'message' => 'Profile updated successfully',
        'user' => $updatedUser
    ]);
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

