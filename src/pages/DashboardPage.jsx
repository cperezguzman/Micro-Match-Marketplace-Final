import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import RoleSwitcher from '../components/RoleSwitcher';
import useRoleTheme from '../hooks/useRoleTheme';
import SidebarTab from '../components/SidebarTab';
import { Bell, Clock, MessageCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FloatingProfileButton from "../components/FloatingProfileButton";
import { apiGetDashboard, apiGetUnreadMessageCount } from '../api';
import AdminDashboard from './AdminDashboard';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Check if user is admin
  const isAdmin = user?.primary_role === 'Admin';

  // State for API data - ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, completed: 0, in_progress: 0, pending: 0 });
  const [deadlines, setDeadlines] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Filter state for deadlines
  const [filterDays, setFilterDays] = useState(null);

  const isClient = user?.activeRole === 'Client';
  const isContributor = user?.activeRole === 'Contributor';

  // Track if this is the initial load
  const isInitialLoad = React.useRef(true);
  
  // Fetch dashboard data on mount and when role changes
  useEffect(() => {
    // Don't fetch dashboard data for admins
    if (isAdmin) {
      setLoading(false);
      return;
    }
    
    isInitialLoad.current = true;
    fetchDashboardData(true);
    
    // Poll for updates every 5 seconds (without showing loading state)
    const interval = setInterval(() => {
      isInitialLoad.current = false;
      fetchDashboardData(false);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [user?.activeRole, isAdmin]);

  const fetchDashboardData = async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      // Fetch dashboard data and unread messages in parallel
      const [dashboardData, messageData] = await Promise.all([
        apiGetDashboard(user?.activeRole),
        apiGetUnreadMessageCount()
      ]);
      
      if (dashboardData.success) {
        // Only update state if data actually changed (prevents unnecessary re-renders)
        setStats(prevStats => {
          const newStats = dashboardData.stats;
          if (JSON.stringify(prevStats) !== JSON.stringify(newStats)) {
            return newStats;
          }
          return prevStats;
        });
        
        setDeadlines(prevDeadlines => {
          const newDeadlines = dashboardData.deadlines || [];
          if (JSON.stringify(prevDeadlines) !== JSON.stringify(newDeadlines)) {
            return newDeadlines;
          }
          return prevDeadlines;
        });
        
        setNotifications(prevNotifications => {
          const newNotifications = dashboardData.notifications || [];
          if (JSON.stringify(prevNotifications) !== JSON.stringify(newNotifications)) {
            return newNotifications;
          }
          return prevNotifications;
        });
        
        setUnreadNotifications(prevCount => {
          const newCount = dashboardData.unread_notifications || 0;
          return newCount !== prevCount ? newCount : prevCount;
        });
      }
      
      if (messageData.success) {
        setUnreadMessages(prevCount => {
          const newCount = messageData.unread_count || 0;
          return newCount !== prevCount ? newCount : prevCount;
        });
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Filter and sort deadlines
  const filteredDeadlines = useMemo(() => {
    const now = new Date();
    let filtered = deadlines.map(d => ({
      ...d,
      dueDateObj: new Date(d.due_date)
    }));

    if (filterDays === "overdue") {
      filtered = filtered.filter((d) => d.dueDateObj < now);
    } else if (typeof filterDays === "number") {
      const cutoff = new Date(now.getTime() + filterDays * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(
        (d) => d.dueDateObj >= now && d.dueDateObj <= cutoff
      );
    }

    filtered.sort((a, b) => a.dueDateObj - b.dueDateObj);
    return filtered;
  }, [filterDays, deadlines]);

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatNotificationTime(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function getNotificationSubject(notification) {
    const typeMap = {
      'MilestoneSubmitted': 'Milestone submitted',
      'NewMessage': 'New message received',
      'BidAccepted': 'Your bid was accepted!',
      'BidPending': 'New bid on your project',
      'BidRejected': 'Bid was rejected',
      'AssignmentStarted': 'Assignment started',
      'ReviewReceived': 'You received a review',
      'MilestoneApproved': 'Milestone approved',
      'Reminder': 'Deadline reminder',
      'NewProject': 'New project posted',
      'FileUploaded': 'New file uploaded',
      'Message': 'New message'
    };
    return typeMap[notification.type] || notification.type;
  }

  const {
    gradientBg,
  } = useRoleTheme();

  // If admin, render admin dashboard (AFTER all hooks are called)
  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (loading) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${gradientBg}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen ${gradientBg}`}>
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md p-6 flex flex-col justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-6">Micro-Match</h1>

          {/* Navigation */}
          <nav className="space-y-2">
            {isClient ? (
              <div className="flex flex-col items-start text-left gap-2 pr-4">
                <SidebarTab label="Posted Bids" to="/bids" blue />
                <SidebarTab label="Assignments" to="/assignment" blue />
                <SidebarTab label="Create Project" to="/create-project" blue isButton />
              </div>
            ) : (
              <div className="flex flex-col items-start text-left gap-2 pr-4">
                <SidebarTab label="My Bids" to="/my-bids" amber />
                <SidebarTab label="My Assignments" to="/contributor-assignments" amber />
                <SidebarTab label="Browse Projects" to="/projects" amber isButton />
              </div>
            )}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 relative">
        <div className="absolute top-6 right-10">
          <RoleSwitcher />
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Welcome, {user?.name || 'User'}
          </h2>

          <div className="grid grid-cols-3 gap-6">

            {/* Card 1 - Statistics */}
            <div className={`p-6 rounded-xl shadow flex flex-col ${
              isClient ? "bg-blue-100" : "bg-yellow-100"
            }`}>
              <h3
                className={`text-lg font-semibold mb-4 ${
                  isClient ? "text-blue-800" : "text-yellow-800"
                }`}
              >
                {isClient ? "Project Statistics" : "Bid Statistics"}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Completed */}
                <button
                  onClick={() => navigate('/completed-projects')}
                  className="bg-white rounded-lg border border-gray-200 p-4 text-center hover:bg-gray-50 transition cursor-pointer w-full"
                >
                  <p className="text-2xl font-bold text-green-600">
                    {stats.completed}
                  </p>
                  <p className="text-sm text-gray-600">Completed</p>
                </button>

                {/* In Progress */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.in_progress}
                  </p>
                  <p className="text-sm text-gray-600">In Progress</p>
                </div>

                {/* Pending */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.pending}
                  </p>
                  <p className="text-sm text-gray-600">Pending</p>
                </div>

                {/* Total */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                  <p className="text-2xl font-bold text-gray-800">
                    {stats.total}
                  </p>
                  <p className="text-sm text-gray-600">Total</p>
                </div>
              </div>
            </div>

            {/* Card 2 - Upcoming Deadlines */}
            <div className="p-6 bg-green-100 rounded-xl shadow flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-green-800" />
                  <h3 className="text-lg font-semibold text-green-800">
                    Upcoming Deadlines
                  </h3>
                </div>

                {/* Filter UI */}
                <select
                  value={filterDays ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "overdue") setFilterDays("overdue");
                    else setFilterDays(v ? parseInt(v, 10) : null);
                  }}
                  className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                >
                  <option value="">All</option>
                  <option value="7">Next 7d</option>
                  <option value="30">Next 30d</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>

              <div className="flex flex-col gap-3 overflow-y-auto max-h-[55vh] pr-1">
                {filteredDeadlines.length > 0 ? (
                  filteredDeadlines.map((d, index) => {
                    const isOverdue = new Date(d.due_date) < new Date();
                    return (
                      <div key={index} className={`bg-white border rounded-lg p-3 hover:shadow transition ${isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm text-gray-800">
                            {d.type}: {d.title}
                          </p>
                          {isOverdue && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                              Past Due
                            </span>
                          )}
                        </div>
                        <p className={`text-xs mt-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                          Due: {formatDate(d.due_date)}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-500 text-center py-6">
                    No upcoming deadlines
                  </p>
                )}
              </div>
            </div>

            {/* Card 3 - Notifications */}
            <div
              onClick={() => navigate("/notifications")}
              className="p-6 bg-orange-100 rounded-xl shadow flex flex-col cursor-pointer hover:bg-orange-200 transition"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-orange-700" />
                  <h3 className="text-lg font-semibold text-orange-800">Notifications</h3>
                </div>
                <p className="text-sm text-gray-700">
                  {unreadNotifications > 0 ? `${unreadNotifications} unread` : `${notifications.length} total`}
                </p>
              </div>

              {/* Notification list */}
              <div className="flex flex-col gap-3 overflow-y-auto max-h-[55vh] pr-1">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div
                      key={n.notification_id}
                      className={`bg-white border border-gray-200 rounded-lg p-3 hover:shadow transition ${
                        !n.is_read ? 'border-l-4 border-l-orange-500' : ''
                      }`}
                    >
                      <p className="font-medium text-sm text-gray-800">
                        {getNotificationSubject(n)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatNotificationTime(n.created_at)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-6">
                    No new notifications
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Message Button with real unread count */}
      <div className="group fixed bottom-6 right-6 z-50">
        <button
          onClick={() => navigate("/messages")}
          className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition flex items-center justify-center"
        >
          <MessageCircle className="w-6 h-6" />
          {unreadMessages > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-semibold rounded-full px-1.5 py-0.5">
              {unreadMessages}
            </span>
          )}
        </button>
        <span className="absolute bottom-14 right-0 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition">
          View Messages
        </span>
      </div>
      <FloatingProfileButton />
    </div>
  );
}
