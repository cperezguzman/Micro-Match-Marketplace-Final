<?php
// fix_passwords.php - Update all user passwords to 'password'
require_once __DIR__ . '/db.php';

$newHash = password_hash('password', PASSWORD_DEFAULT);

try {
    $stmt = $pdo->prepare("UPDATE user SET password_hash = ?");
    $stmt->execute([$newHash]);
    
    $count = $stmt->rowCount();
    echo "SUCCESS! Updated $count user passwords to 'password'\n";
    echo "New hash: $newHash\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}

