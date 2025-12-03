<?php
// debug.php - Check what data exists for the logged-in user
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
session_start();

echo "<h2>Debug Info</h2>";

// Show database name
echo "<h3>Database Connection</h3>";
echo "<p>Connected to database: <strong>$dbname</strong></p>";

// Show session info
echo "<h3>Session Info</h3>";
echo "<pre>";
print_r($_SESSION);
echo "</pre>";

$user_id = $_SESSION['user_id'] ?? null;

if (!$user_id) {
    echo "<p style='color:red'>Not logged in! Please log in first.</p>";
    exit;
}

echo "<p>Logged in as user_id: <strong>$user_id</strong></p>";

// Check user
echo "<h3>User Record</h3>";
$stmt = $pdo->prepare("SELECT * FROM user WHERE user_id = ?");
$stmt->execute([$user_id]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
echo "<pre>";
print_r($user);
echo "</pre>";

// Check projects owned by this user
echo "<h3>Projects owned by user (as Client)</h3>";
$stmt = $pdo->prepare("SELECT project_id, title, status FROM project WHERE client_id = ?");
$stmt->execute([$user_id]);
$projects = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "<p>Found " . count($projects) . " projects</p>";
echo "<pre>";
print_r($projects);
echo "</pre>";

// Check assignments for this user (as Contributor)
echo "<h3>Assignments (as Contributor via accepted bids)</h3>";
$stmt = $pdo->prepare("
    SELECT a.assignment_id, p.project_id, p.title, b.bid_id
    FROM assignment a
    JOIN bid b ON a.bid_id = b.bid_id
    JOIN project p ON a.project_id = p.project_id
    WHERE b.contributor_id = ?
");
$stmt->execute([$user_id]);
$assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "<p>Found " . count($assignments) . " assignments</p>";
echo "<pre>";
print_r($assignments);
echo "</pre>";

// Check all projects in database
echo "<h3>All Projects in Database</h3>";
$stmt = $pdo->query("SELECT project_id, client_id, title FROM project LIMIT 10");
$allProjects = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "<p>Total projects: " . count($allProjects) . "</p>";
echo "<pre>";
print_r($allProjects);
echo "</pre>";

// Check all users
echo "<h3>All Users in Database</h3>";
$stmt = $pdo->query("SELECT user_id, name, email, primary_role FROM user LIMIT 15");
$allUsers = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "<p>Total users shown: " . count($allUsers) . "</p>";
echo "<pre>";
print_r($allUsers);
echo "</pre>";

