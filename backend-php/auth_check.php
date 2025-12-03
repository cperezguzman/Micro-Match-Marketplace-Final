<?php
// auth_check.php
// Central helpers to enforce authentication and authorization

require_once __DIR__ . '/cors.php';
session_start();

/**
 * Ensure the user is logged in.
 */
function require_login() {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        exit(json_encode(['error' => 'Not logged in']));
    }
}

/**
 * Ensure the user is logged in AND has the required role.
 * $requiredRole should be 'Client', 'Contributor', or 'Admin'.
 * Enhanced internally to support dual-role functionality.
 */
function require_role(string $requiredRole) {
    require_login();
    
    // Support dual-role: check active_role first (from query param or POST body)
    $active_role = $_GET['active_role'] ?? null;
    if (!$active_role && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $postData = json_decode(file_get_contents('php://input'), true);
        $active_role = $postData['active_role'] ?? null;
    }
    
    // Use active_role if available, otherwise use primary_role
    $currentRole = $active_role ?? $_SESSION['primary_role'];
    
    
    if (!isset($currentRole) || $currentRole !== $requiredRole) {
        http_response_code(403);
        exit(json_encode(['error' => 'Forbidden']));
    }
}

/**
 * Ensure the user is logged in AND their active_role (from query param) matches the required role.
 * This allows users to switch roles in the UI and perform actions in either role.
 * Falls back to primary_role if active_role is not provided.
 * $requiredRole should be 'Client' or 'Contributor'.
 */
function require_active_role(string $requiredRole) {
    require_login();
    
    // Get active_role from query param, POST body, or fall back to primary_role
    $active_role = $_GET['active_role'] ?? null;
    if (!$active_role) {
        // Try to get from POST body if it's a POST request
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $postData = json_decode(file_get_contents('php://input'), true);
            $active_role = $postData['active_role'] ?? null;
        }
    }
    
    // Fall back to primary_role if active_role not provided
    $currentRole = $active_role ?? ($_SESSION['primary_role'] ?? null);
    
    if (!$currentRole || $currentRole !== $requiredRole) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden: insufficient role. Please switch to ' . $requiredRole . ' mode to perform this action.']);
        exit;
    }
}

/**
 * Get current user ID from session
 */
function get_user_id() {
    return $_SESSION['user_id'] ?? null;
}

/**
 * Get current user role from session
 */
function get_user_role() {
    return $_SESSION['primary_role'] ?? null;
}
