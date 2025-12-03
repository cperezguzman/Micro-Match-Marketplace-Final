<?php
// set_passwords.php
// Run this ONCE to set passwords for sample users
// Access via: http://localhost/backend-php/set_passwords.php

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

$password = 'Test123!';
$hash = password_hash($password, PASSWORD_DEFAULT);

echo "<h2>Setting password '$password' for sample users...</h2>";
echo "<p>Generated hash: <code>$hash</code></p>";

try {
    $stmt = $pdo->prepare("
        UPDATE user 
        SET password_hash = :hash 
        WHERE user_id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
    ");
    $stmt->execute([':hash' => $hash]);
    
    $affected = $stmt->rowCount();
    echo "<p style='color:green;'>✅ Updated $affected users!</p>";
    
    // Show which users were updated
    $users = $pdo->query("SELECT user_id, name, email, primary_role FROM user WHERE user_id <= 10")->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<h3>Users you can now log in as:</h3>";
    echo "<table border='1' cellpadding='8'>";
    echo "<tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Password</th></tr>";
    foreach ($users as $u) {
        echo "<tr>";
        echo "<td>{$u['user_id']}</td>";
        echo "<td>{$u['name']}</td>";
        echo "<td>{$u['email']}</td>";
        echo "<td>{$u['primary_role']}</td>";
        echo "<td>Test123!</td>";
        echo "</tr>";
    }
    echo "</table>";
    
    echo "<p><strong>Now go back and log in with any of these emails and password: Test123!</strong></p>";
    
} catch (PDOException $e) {
    echo "<p style='color:red;'>Error: " . $e->getMessage() . "</p>";
}

