// src/api.js
// API functions for communicating with the PHP backend

// Change this to match your XAMPP setup
// If backend-php is in htdocs: "http://localhost/backend-php"
// If using a different port: "http://localhost:8080/backend-php"
const API_BASE = "http://localhost/backend-php";

/**
 * Handle API response - throws on error, returns data on success
 */
async function handleResponse(res) {
  // Check if response is ok
  if (!res.ok) {
    // Try to parse error message from JSON
    try {
      const data = await res.json();
      throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
    } catch (e) {
      if (e.message.includes('HTTP')) throw e;
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
  }
  
  // Parse successful response
  try {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse JSON. Response text:', text.substring(0, 500));
      throw new Error("Invalid JSON response from server: " + text.substring(0, 100));
    }
  } catch (e) {
    if (e.message.includes('Invalid JSON')) throw e;
    throw new Error("Invalid JSON response from server");
  }
}

/**
 * Login user with email and password
 * POST /login.php
 */
export async function apiLogin(email, password) {
  try {
    const res = await fetch(`${API_BASE}/login.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  } catch (err) {
    // Handle network/CORS errors
    if (err.message.includes('Failed to fetch') || err.name === 'TypeError') {
      throw new Error("Cannot connect to server. Check if XAMPP is running.");
    }
    throw err;
  }
}

/**
 * Check current session
 * GET /me.php
 */
export async function apiMe() {
  try {
    const res = await fetch(`${API_BASE}/me.php`, {
      method: "GET",
      credentials: "include",
    });
    return handleResponse(res);
  } catch (err) {
    // Handle network/CORS errors - return not logged in instead of throwing
    if (err.message.includes('Failed to fetch') || err.name === 'TypeError') {
      console.warn("Session check failed - server may be unavailable");
      return { logged_in: false };
    }
    throw err;
  }
}

/**
 * Logout user
 * POST /logout.php
 */
export async function apiLogout() {
  try {
    const res = await fetch(`${API_BASE}/logout.php`, {
      method: "POST",
      credentials: "include",
    });
    return handleResponse(res);
  } catch (err) {
    // If logout fails due to network, still consider it a success locally
    console.warn("Logout API failed:", err);
    return { success: true };
  }
}

/**
 * Register new user
 * POST /register.php
 */
export async function apiRegister(name, email, password, primaryRole = "Contributor") {
  try {
    const res = await fetch(`${API_BASE}/register.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password, primary_role: primaryRole }),
    });
    return handleResponse(res);
  } catch (err) {
    if (err.message.includes('Failed to fetch') || err.name === 'TypeError') {
      throw new Error("Cannot connect to server. Check if XAMPP is running.");
    }
    throw err;
  }
}

// ============================================
// DASHBOARD API
// ============================================

/**
 * Get dashboard data (stats, deadlines, notifications)
 */
export async function apiGetDashboard(activeRole = null) {
  const url = activeRole 
    ? `${API_BASE}/dashboard.php?active_role=${encodeURIComponent(activeRole)}`
    : `${API_BASE}/dashboard.php`;
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
  });
  return handleResponse(res);
}

// ============================================
// MESSAGES API
// ============================================

/**
 * Get all conversations for current user
 */
export async function apiGetConversations(role = null) {
  let url = `${API_BASE}/messages.php?action=conversations`;
  if (role) {
    url += `&role=${encodeURIComponent(role)}`;
  }
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
  });
  return handleResponse(res);
}

/**
 * Get messages for a specific project
 */
export async function apiGetMessages(projectId) {
  const res = await fetch(`${API_BASE}/messages.php?action=messages&project_id=${projectId}`, {
    method: "GET",
    credentials: "include",
  });
  return handleResponse(res);
}

/**
 * Send a message to a project
 */
export async function apiSendMessage(projectId, body, attachments = []) {
  // If there are attachments, include them in the message body
  let messageBody = body;
  if (attachments.length > 0) {
    // Append attachment info to message
    const attachmentText = attachments.map(a => `[File: ${a.filename}](${a.url})`).join('\n');
    messageBody = body + (body ? '\n' : '') + attachmentText;
  }
  
  const res = await fetch(`${API_BASE}/messages.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ project_id: projectId, body: messageBody }),
  });
  return handleResponse(res);
}

/**
 * Upload a file
 */
export async function apiUploadFile(file, projectId, isProfilePicture = false) {
  const formData = new FormData();
  formData.append('file', file);
  if (projectId) {
    formData.append('project_id', projectId);
  }
  if (isProfilePicture) {
    formData.append('is_profile_picture', '1');
  }
  
  const res = await fetch(`${API_BASE}/upload.php`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  return handleResponse(res);
}

/**
 * Get unread message count
 */
export async function apiGetUnreadMessageCount() {
  const res = await fetch(`${API_BASE}/messages.php?action=unread_count`, {
    method: "GET",
    credentials: "include",
  });
  return handleResponse(res);
}

// ============================================
// NOTIFICATIONS API
// ============================================

/**
 * Get notifications for current user
 */
export async function apiGetNotifications(limit = 50) {
  const res = await fetch(`${API_BASE}/notifications.php?action=list&limit=${limit}`, {
    method: "GET",
    credentials: "include",
  });
  return handleResponse(res);
}

/**
 * Get unread notification count
 */
export async function apiGetUnreadNotificationCount() {
  const res = await fetch(`${API_BASE}/notifications.php?action=unread_count`, {
    method: "GET",
    credentials: "include",
  });
  return handleResponse(res);
}

/**
 * Mark notification as read
 */
export async function apiMarkNotificationRead(notificationId) {
  const res = await fetch(`${API_BASE}/notifications.php`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ notification_id: notificationId }),
  });
  return handleResponse(res);
}

/**
 * Mark all notifications as read
 */
export async function apiMarkAllNotificationsRead() {
  const res = await fetch(`${API_BASE}/notifications.php`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ mark_all: true }),
  });
  return handleResponse(res);
}

// ============================================
// PROJECTS API
// ============================================

/**
 * Get all projects (for browsing)
 */
export async function apiGetProjects(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.client_id) params.append('client_id', filters.client_id);
  
  const url = `${API_BASE}/get_projects.php${params.toString() ? '?' + params.toString() : ''}`;
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
  });
  return handleResponse(res);
}

/**
 * Get a single project by ID with full details
 */
export async function apiGetProject(projectId) {
  const res = await fetch(`${API_BASE}/get_project.php?project_id=${projectId}`, {
    method: "GET",
    credentials: "include",
  });
  return handleResponse(res);
}

/**
 * Create a new project (Client mode only)
 */
export async function apiCreateProject(projectData, activeRole = null) {
  // Include activeRole in the request body
  const bodyData = { ...projectData };
  if (activeRole) {
    bodyData.active_role = activeRole;
  }
  
  const res = await fetch(`${API_BASE}/add_project.php${activeRole ? `?active_role=${encodeURIComponent(activeRole)}` : ''}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(bodyData),
  });
  return handleResponse(res);
}

// ============================================
// BIDS API
// ============================================

/**
 * Get bids (optionally filter by project_id or contributor_id)
 */
export async function apiGetBids(filters = {}) {
  const params = new URLSearchParams();
  if (filters.project_id) params.append('project_id', filters.project_id);
  if (filters.contributor_id) params.append('contributor_id', filters.contributor_id);
  if (filters.status) params.append('status', filters.status);
  
  const res = await fetch(`${API_BASE}/bids.php?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });
  return handleResponse(res);
}

/**
 * Place a bid on a project
 */
export async function apiPlaceBid(projectId, amount, timelineDays, proposalText) {
  const res = await fetch(`${API_BASE}/bids.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      project_id: projectId,
      amount,
      timeline_days: timelineDays,
      proposal_text: proposalText
    }),
  });
  return handleResponse(res);
}

/**
 * Accept or reject a bid (Client mode only)
 */
export async function apiUpdateBidStatus(bidId, action, activeRole = null) {
  const url = activeRole 
    ? `${API_BASE}/bids.php?active_role=${encodeURIComponent(activeRole)}`
    : `${API_BASE}/bids.php`;
  
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ bid_id: bidId, action }),
  });
  return handleResponse(res);
}

/**
 * Update bid details (amount, timeline, proposal) - Contributor only
 */
export async function apiUpdateBid(bidId, amount, timelineDays, proposalText) {
  const res = await fetch(`${API_BASE}/update_bid.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      bid_id: bidId,
      amount: amount,
      timeline_days: timelineDays,
      proposal_text: proposalText
    }),
  });
  return handleResponse(res);
}

// ============================================
// MILESTONES API
// ============================================

/**
 * Get milestones (filter by project_id or assignment_id)
 */
export async function apiGetMilestones(filters = {}) {
  const params = new URLSearchParams();
  if (filters.project_id) params.append('project_id', filters.project_id);
  if (filters.assignment_id) params.append('assignment_id', filters.assignment_id);
  
  const res = await fetch(`${API_BASE}/milestones.php?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });
  return handleResponse(res);
}

/**
 * Submit a milestone (Contributor)
 */
export async function apiSubmitMilestone(milestoneId, submissionNotes, submissionUrl) {
  const res = await fetch(`${API_BASE}/milestones.php`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      milestone_id: milestoneId,
      action: 'submit',
      submission_notes: submissionNotes,
      submission_url: submissionUrl
    }),
  });
  return handleResponse(res);
}

/**
 * Approve a milestone (Client)
 */
export async function apiApproveMilestone(milestoneId) {
  const res = await fetch(`${API_BASE}/milestones.php`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      milestone_id: milestoneId,
      action: 'approve'
    }),
  });
  return handleResponse(res);
}

// ============================================
// ASSIGNMENTS API
// ============================================

/**
 * Get assignments for current user (Client sees their projects, Contributor sees their assignments)
 */
export async function apiGetAssignments(activeRole = null, adminView = false) {
  const params = new URLSearchParams();
  if (activeRole) {
    params.append('active_role', activeRole);
  }
  if (adminView) {
    params.append('admin', 'true');
  }
  const url = params.toString() 
    ? `${API_BASE}/assignments.php?${params.toString()}`
    : `${API_BASE}/assignments.php`;
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
  });
  return handleResponse(res);
}

/**
 * Update milestone details (deadline, title, etc.)
 */
export async function apiUpdateMilestone(milestoneId, updates, requestType = 'update') {
  const res = await fetch(`${API_BASE}/update_milestone.php`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      milestone_id: milestoneId,
      ...updates,
      request_type: requestType
    }),
  });
  return handleResponse(res);
}

/**
 * Finalize a project (set status to Completed)
 */
export async function apiFinalizeProject(projectId, activeRole = null) {
  const url = activeRole 
    ? `${API_BASE}/finalize_project.php?active_role=${encodeURIComponent(activeRole)}`
    : `${API_BASE}/finalize_project.php`;
  
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      project_id: projectId
    }),
  });
  return handleResponse(res);
}

/**
 * Submit a review for a completed project
 */
export async function apiSubmitReview(projectId, stars, comment) {
  const res = await fetch(`${API_BASE}/submit_review.php`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      project_id: projectId,
      stars: stars,
      comment: comment || null
    }),
  });
  return handleResponse(res);
}

/**
 * Create a new milestone (Client only)
 */
export async function apiCreateMilestone(assignmentId, title, dueDate) {
  const res = await fetch(`${API_BASE}/add_milestone.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      assignment_id: assignmentId,
      title,
      due_date: dueDate
    }),
  });
  return handleResponse(res);
}

/**
 * Delete a project (Admin only)
 */
export async function apiDeleteProject(projectId, activeRole = null) {
  const url = activeRole 
    ? `${API_BASE}/delete_project.php?active_role=${encodeURIComponent(activeRole)}`
    : `${API_BASE}/delete_project.php`;
  
  const res = await fetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ project_id: projectId }),
  });
  return handleResponse(res);
}


/**
 * Get user profile information
 */
export async function apiGetProfile(userId = null) {
  const url = userId 
    ? `${API_BASE}/get_profile.php?user_id=${userId}`
    : `${API_BASE}/get_profile.php`;
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
  });
  return handleResponse(res);
}

/**
 * Update user profile (bio, skills, profile picture, experience, etc.)
 */
export async function apiUpdateProfile(profileData) {
  const res = await fetch(`${API_BASE}/update_profile.php`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(profileData),
  });
  return handleResponse(res);
}

/**
 * Change user password
 */
export async function apiChangePassword(currentPassword, newPassword) {
  const res = await fetch(`${API_BASE}/change_password.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword
    }),
  });
  return handleResponse(res);
}
