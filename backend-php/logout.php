<?php
// logout.php - Handle user logout
require_once __DIR__ . '/cors.php';

// Start session
session_start();

// Remove all session variables
session_unset();

// Destroy the session
session_destroy();

echo json_encode(['success' => true]);
