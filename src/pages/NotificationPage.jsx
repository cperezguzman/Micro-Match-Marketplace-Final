// NotificationsPage.jsx
import React, { useMemo, useState, useEffect } from "react";
import {
  Bell,
  CheckCheck,
  Flag,
  Star,
  Clock,
  Inbox,
  Hammer,
  ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiGetNotifications, apiMarkAllNotificationsRead } from "../api";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useAuth } from "../context/AuthContext";

/**
 * NotificationsPage
 * - Fetches notifications from backend (role-specific)
 * - Supports filtering, marking all as read
 */
export default function NotificationsPage() {
  const navigate = useNavigate();
  const { activeRole } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | bid | milestone | review | unread

  useEffect(() => {
    fetchNotifications();
  }, [activeRole]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await apiGetNotifications(100);
      if (data.success && data.notifications) {
        // Transform backend format to UI format
        const transformed = data.notifications.map(n => {
          const payload = n.payload || {};
          let title = '';
          let meta = '';
          let type = 'bid'; // default
          
          // Map notification types
          if (n.type.includes('Bid')) {
            type = 'bid';
            if (n.type === 'BidPending') {
              title = `New bid on "${payload.project_title || 'project'}"`;
              // Handle missing payload fields gracefully
              const contributorName = payload.contributor_name || 'A contributor';
              const amount = payload.amount ? `$${payload.amount}` : '';
              const timelineDays = payload.timeline_days ? `${payload.timeline_days} days` : '';
              const parts = [contributorName, amount, timelineDays].filter(Boolean);
              meta = parts.length > 0 ? parts.join(' • ') : 'New bid received';
            } else if (n.type === 'BidAccepted') {
              title = `Bid accepted: "${payload.project_title || 'project'}"`;
              meta = `Project: ${payload.project_title || ''}`;
            } else if (n.type === 'BidRejected') {
              title = `Bid not accepted: "${payload.project_title || 'project'}"`;
              meta = `Project: ${payload.project_title || ''}`;
            } else if (n.type === 'BidUpdated') {
              title = `Bid updated on "${payload.project_title || 'project'}"`;
              meta = `${payload.contributor_name || 'A contributor'} updated their bid`;
            }
          } else if (n.type.includes('Milestone')) {
            type = 'milestone';
            if (n.type === 'MilestoneApproved') {
              title = `Milestone approved: ${payload.milestone_title || ''}`;
              meta = `Project: ${payload.project_title || ''}`;
            } else if (n.type === 'MilestoneDue') {
              title = `Milestone due tomorrow: ${payload.milestone_title || ''}`;
              meta = payload.milestone_title || '';
            } else if (n.type === 'MilestoneSubmitted') {
              title = `Milestone submitted: ${payload.milestone_title || ''}`;
              meta = `Project: ${payload.project_title || ''}`;
            }
          } else if (n.type.includes('Review')) {
            type = 'review';
            title = `You received a ${payload.rating || 5}★ review`;
            meta = `Client: ${payload.client_name || ''}`;
          } else if (n.type === 'NewMessage' || n.type === 'Message') {
            type = 'bid'; // Use bid icon for messages
            title = `New message on "${payload.project_title || 'project'}"`;
            meta = payload.sender_name || 'New message received';
          } else if (n.type === 'AssignmentStarted') {
            type = 'milestone';
            title = `Assignment started: "${payload.project_title || 'project'}"`;
            meta = 'Your project assignment has begun';
          } else if (n.type === 'FileUploaded') {
            type = 'milestone';
            title = `File uploaded on "${payload.project_title || 'project'}"`;
            meta = 'A new file has been uploaded';
          } else if (n.type === 'Reminder') {
            type = 'milestone';
            title = 'Reminder';
            meta = payload.message || 'You have a pending task';
          } else if (n.type === 'NewProject') {
            type = 'bid';
            title = `New project: "${payload.project_title || 'project'}"`;
            meta = 'A new project matching your skills is available';
          } else {
            // Fallback: format the type name nicely
            title = n.type.replace(/([A-Z])/g, ' $1').trim();
            meta = payload.project_title || payload.message || '';
          }
          
          // Format time
          let timeStr = '';
          try {
            const date = parseISO(n.created_at);
            timeStr = formatDistanceToNow(date, { addSuffix: true });
          } catch {
            timeStr = new Date(n.created_at).toLocaleDateString();
          }
          
          return {
            id: n.notification_id,
            type,
            title,
            meta,
            time: timeStr,
            read: n.is_read
          };
        });
        
        setItems(transformed);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const grouped = useMemo(() => {
    const data = items.filter((n) => {
      if (filter === "all") return true;
      if (filter === "unread") return !n.read;
      return n.type === filter;
    });
    const groups = {
      bid: data.filter((n) => n.type === "bid"),
      milestone: data.filter((n) => n.type === "milestone"),
      review: data.filter((n) => n.type === "review"),
    };
    const countUnread = data.filter((n) => !n.read).length;
    return { data, groups, countUnread };
  }, [items, filter]);

  const markAllAsRead = async () => {
    try {
      await apiMarkAllNotificationsRead();
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const updateBidNotification = (id, newMeta) =>
    setItems((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, meta: newMeta, read: false, time: "Just now" } : n
      )
    );

  const TypeIcon = ({ type }) => {
    switch (type) {
      case "bid":
        return <Hammer className="w-4 h-4" />;
      case "milestone":
        return <Flag className="w-4 h-4" />;
      case "review":
        return <Star className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900 font-sans p-6 md:p-10">
      {/* Header */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 md:p-8 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Notifications</h1>
              <p className="text-sm text-gray-500 mt-1">
                {activeRole === 'Client' 
                  ? 'Notifications for your posted projects' 
                  : 'Notifications for your bids and assignments'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {["all", "unread", "bid", "milestone", "review"].map((val) => (
              <FilterPill
                key={val}
                label={val.charAt(0).toUpperCase() + val.slice(1)}
                value={val}
                active={filter === val}
                onClick={() => setFilter(val)}
                badge={val === "unread" ? grouped.countUnread : undefined}
              />
            ))}

            <button
              onClick={markAllAsRead}
              className="ml-auto bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2"
            >
              <CheckCheck className="w-4 h-4" /> Mark all as read
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 md:p-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-gray-500">Loading notifications...</div>
          </div>
        ) : grouped.data.length === 0 ||
        (grouped.data.every((n) => n.read) && filter === "unread") ? (
          <EmptyState />
        ) : (
          <div className="space-y-8">
            {["bid", "milestone", "review"].map((t) => (
              <GroupBlock
                key={t}
                title={titleFromType(t)}
                items={grouped.groups[t]}
                TypeIcon={TypeIcon}
              />
            ))}
          </div>
        )}
      </div>

      {/* Back Button (bottom-left corner) */}
      <button
        onClick={() => navigate("/dashboard")}
        className="fixed bottom-6 left-6 flex items-center gap-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-3 px-4 shadow-sm transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>
    </div>
  );
}

function GroupBlock({ title, items, TypeIcon, onUpdateBid }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        <span className="text-xs text-gray-500">{items.length}</span>
      </div>
      <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
        {items.map((n) => (
          <div
            key={n.id}
            className={`flex items-start gap-3 p-4 ${
              n.read ? "bg-white" : "bg-blue-50/40"
            }`}
          >
            <div
              className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center ${iconWrapClass(
                n.type
              )}`}
            >
              <TypeIcon type={n.type} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div className="truncate font-medium text-gray-900">
                  {n.title}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3.5 h-3.5" /> {n.time}
                </div>
              </div>
              <div className="text-sm text-gray-600 mt-0.5">{n.meta}</div>
            </div>
            {!n.read && (
              <span className="mt-1 inline-block w-2 h-2 rounded-full bg-blue-600" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterPill({ label, value, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-2 rounded-full border text-sm transition flex items-center gap-1.5 ${
        active
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
      }`}
    >
      <span>{label}</span>
      {typeof badge === "number" && badge > 0 && (
        <span
          className={`text-[11px] leading-none px-1.5 py-0.5 rounded-full ${
            active ? "bg-white text-blue-700" : "bg-blue-600 text-white"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16">
      <div className="w-24 h-24 rounded-3xl bg-blue-50 flex items-center justify-center mb-4">
        <Inbox className="w-10 h-10 text-blue-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        You’re all caught up
      </h3>
      <p className="text-sm text-gray-600 max-w-sm">
        No new notifications. When you receive bids, milestone updates, or
        reviews, they’ll appear here.
      </p>
    </div>
  );
}

function iconWrapClass(type) {
  if (type === "bid") return "bg-blue-50 text-blue-700";
  if (type === "milestone") return "bg-amber-50 text-amber-700";
  if (type === "review") return "bg-emerald-50 text-emerald-700";
  return "bg-gray-100 text-gray-600";
}

function titleFromType(t) {
  if (t === "bid") return "Bids";
  if (t === "milestone") return "Milestones";
  if (t === "review") return "Reviews";
  return "Other";
}
