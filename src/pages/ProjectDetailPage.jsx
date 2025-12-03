import { format, isToday, isThisWeek, parseISO } from "date-fns";
import {
  Check,
  Users,
  ScrollText,
  BadgeCheck,
  ChevronRight,
  Send,
  Pencil,
  ArrowLeft,
  Paperclip,
  Trash2
} from "lucide-react";
import { useState, useEffect } from "react";
import { apiGetProject, apiGetBids, apiUpdateBidStatus, apiDeleteProject, apiUpdateBid } from "../api";
import CustomAlert from "../components/CustomAlert";
import { useParams, useNavigate, Link } from 'react-router-dom';
import useRoleTheme from "../hooks/useRoleTheme";
import { useAuth } from "../context/AuthContext";

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const { role, isClient } = useRoleTheme();
  const navigate = useNavigate();
  const { user } = useAuth();



  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(isClient ? "Overview" : "Edit Bid");
  // Don't use local state for acceptedBidId - derive it from project data
  // This ensures it persists after refresh
  const [alert, setAlert] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const data = await apiGetProject(projectId);
      
      if (!data) {
        console.error('No data returned from API');
        setProject(null);
        return;
      }
      
      if (data.error) {
        console.error('API error:', data.error);
        console.error('Full API response:', data);
        setProject(null);
        return;
      }
      
      if (!data.success) {
        console.error('API returned unsuccessful:', data);
        setProject(null);
        return;
      }
      
      if (data.success && data.project) {
        // Transform backend format to UI format
        const transformed = {
          id: data.project.project_id,
          title: data.project.title,
          status: data.project.status,
          client_id: data.project.client_id,
          budget: data.project.budget_max || data.project.budget_min,
          budget_min: data.project.budget_min,
          budget_max: data.project.budget_max,
          contributor_id: data.project.contributor_id || null,
          skills: data.project.skills || [],
          summary: (() => {
            // Extract description without scope or milestones markers
            const desc = data.project.description || 'No description provided';
            // Remove [SCOPE] and [MILESTONES] sections
            return desc.split(/\[SCOPE\]|\[MILESTONES\]/)[0].trim() || desc;
          })(),
          scope: (() => {
            // Check if description contains [SCOPE] marker (from project creation)
            const desc = data.project.description || '';
            // Match scope between [SCOPE] and [MILESTONES] (or end of string)
            const scopeMatch = desc.match(/\[SCOPE\]\s*\n(.*?)(?:\n\n\[MILESTONES\]|$)/s);
            
            if (scopeMatch && scopeMatch[1]) {
              // Parse scope from the marker
              const scopeText = scopeMatch[1].trim();
              // Split by newlines and filter empty
              const points = scopeText.split(/\n/).map(s => s.trim()).filter(s => s.length > 0);
              return points.length > 0 ? points : ['See project description for details'];
            }
            
            // Fallback: generate scope from description by splitting into sentences or key points
            // Try to split by periods, newlines, or create meaningful bullet points
            const descriptionOnly = desc.split(/\[SCOPE\]/)[0].trim();
            const sentences = descriptionOnly.split(/[.!?]\s+/).filter(s => s.trim().length > 10);
            if (sentences.length > 1) {
              return sentences.slice(1, 4).map(s => s.trim());
            }
            // If single sentence, try splitting by commas or creating logical points
            const parts = descriptionOnly.split(',').filter(p => p.trim().length > 15);
            if (parts.length > 1) {
              return parts.slice(0, 3).map(p => p.trim());
            }
            // Final fallback: generic scope points
            return [
              "Review project requirements and specifications",
              "Develop and implement solution",
              "Testing and quality assurance",
              "Final delivery and documentation"
            ];
          })(),
          bids: (data.project.bids || []).map(b => ({
            id: b.bid_id,
            contributor: b.contributor_name,
            contributor_id: b.contributor_id,
            amount: b.amount,
            eta: `${b.timeline_days} days`,
            note: b.proposal_text,
            status: b.status,
            created_at: b.created_at,
            updated_at: b.updated_at || b.created_at
          })),
          messages: [], // Will be fetched separately if needed
          attachments: data.project.attachments || [], // Include attachments from backend
          activity: (() => {
            const activities = [
              { id: 1, text: "Project posted", time: format(new Date(data.project.created_at), 'MMM d, yyyy') }
            ];
            // Add bid submissions, updates, and acceptances to activity
            if (data.project.bids && data.project.bids.length > 0) {
              data.project.bids.forEach((bid, idx) => {
                activities.push({
                  id: activities.length + 1,
                  text: `Bid submitted by ${bid.contributor_name} ($${bid.amount.toLocaleString()})`,
                  time: format(new Date(bid.created_at || data.project.created_at), 'MMM d, yyyy')
                });
                // If bid was updated (has updated_at different from created_at), add update activity
                if (bid.updated_at && bid.updated_at !== bid.created_at) {
                  activities.push({
                    id: activities.length + 1,
                    text: `Bid updated by ${bid.contributor_name} ($${bid.amount.toLocaleString()})`,
                    time: format(new Date(bid.updated_at), 'MMM d, yyyy')
                  });
                }
                // If bid was accepted, add acceptance activity
                // Note: Since bid table doesn't have updated_at, we use current date
                // In production, you'd want to track when the bid was accepted
                if (bid.status === 'Accepted') {
                  activities.push({
                    id: activities.length + 1,
                    text: `Bid accepted from ${bid.contributor_name} ($${bid.amount.toLocaleString()})`,
                    time: format(new Date(), 'MMM d, yyyy') // Use current date as acceptance time
                  });
                }
              });
            }
            // Add project completed activity if status is Completed
            if (data.project.status === 'Completed') {
              activities.push({
                id: activities.length + 1,
                text: "Project completed",
                time: format(new Date(data.project.updated_at || data.project.created_at), 'MMM d, yyyy')
              });
            }
            // Sort activities by time (most recent first)
            activities.sort((a, b) => {
              const timeA = new Date(a.time);
              const timeB = new Date(b.time);
              return timeB - timeA;
            });
            return activities;
          })()
        };
        setProject(transformed);
      } else {
        // API returned success but no project data
        console.error('API response:', data);
        setProject(null);
      }
    } catch (err) {
      console.error('Failed to load project:', err);
      setProject(null);
    } finally {
      setLoading(false);
    }
  };
  

  if (loading) {
    return <div className="p-6">Loading project...</div>;
  }

  if (!project) {
    return (
      <div className="p-6">
        <div className="text-red-600 font-semibold mb-2">Project not found</div>
        <div className="text-sm text-gray-600 mb-4">
          Project ID: {projectId}
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const handleAcceptBid = async (bidId) => {
    try {
      await apiUpdateBidStatus(bidId, 'accept', user?.activeRole);
      setAlert({ message: 'Bid accepted successfully', type: 'success' });
      // Refresh project to get updated status and remove deleted bids
      setTimeout(() => {
        fetchProject();
      }, 500); // Small delay to ensure backend has processed
    } catch (err) {
      console.error('Failed to accept bid:', err);
      setAlert({ message: err.message || 'Failed to accept bid. Please try again.', type: 'error' });
    }
  };
  
  // Derive accepted bid ID from project data
  const acceptedBidId = project?.bids?.find(b => b.status === 'Accepted')?.id || null;

  const handleDeclineBid = async (bidId) => {
    try {
      await apiUpdateBidStatus(bidId, 'reject', user?.activeRole);
      setAlert({ message: 'Bid declined', type: 'success' });
      // Refresh project to remove deleted bid from database
      setTimeout(() => {
        fetchProject();
      }, 500); // Small delay to ensure backend has processed
    } catch (err) {
      console.error('Failed to reject bid:', err);
      setAlert({ message: err.message || 'Failed to reject bid. Please try again.', type: 'error' });
    }
  };

  const handleDeleteProject = async () => {
    try {
      const result = await apiDeleteProject(projectId, user?.activeRole);
      if (result.success) {
        setAlert({ message: 'Project deleted successfully', type: 'success' });
        setTimeout(() => {
          navigate(isClient ? '/dashboard' : '/my-bids');
        }, 1500);
      } else {
        setAlert({ message: result.error || 'Failed to delete project', type: 'error' });
      }
    } catch (err) {
      console.error('Failed to delete project:', err);
      setAlert({ message: err.message || 'Failed to delete project', type: 'error' });
    }
  };



  return (
    <div className="w-full h-full bg-gradient-to-b from-white to-gray-50 text-gray-900 font-sans p-6 md:p-10">
      {/* Header */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 md:p-8 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold leading-tight">{project.title}</h1>
              <StatusBadge status={project.status} />
              {/* Show Delete button for clients (own projects only, not completed) or admins (any project, including completed) */}
              {((isClient && user?.user_id === project.client_id && project.status !== 'Completed') || user?.primary_role === 'Admin') && (
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition flex items-center gap-2 text-sm"
                    title={user?.primary_role === 'Admin' ? "Delete Project (Admin)" : "Delete Project"}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <span className="font-medium text-gray-800">
                  ${project.budget_min?.toLocaleString()}
                  {project.budget_max !== project.budget_min ? ` – $${project.budget_max?.toLocaleString()}` : ''}
                </span> budget
              </div>
              <div className="flex items-center gap-1"><Users className="w-4 h-4" /> Skills:</div>
              <div className="flex flex-wrap gap-2">
                {project.skills.map((s) => (
                  <span key={s} className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs border border-blue-100">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm">
        <Tabs active={active} setActive={setActive} isClient={isClient} />
        <div className="p-6 md:p-8">
          {active === "Overview" && <OverviewTab project={project} />}
          {active === "Edit Bid" && !isClient && (
            <EditBidTabContributor 
              project={project} 
              onUpdate={fetchProject}
              onAlert={setAlert}
            />
          )}
          {active === "Bids" && isClient && (
            <BidsTabClient 
              project={project} 
              handleAcceptBid={handleAcceptBid} 
              handleDeclineBid={handleDeclineBid}
              acceptedBidId={acceptedBidId} 
              />
          )}
          {active === "Activity" && <ActivityTab project={project} />}
        </div>
      </div>
      <button
        onClick={() => navigate(isClient ? "/bids" : "/my-bids")}
        className="fixed bottom-6 left-6 flex items-center gap-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-3 px-4 shadow-sm transition"
      >
        <ArrowLeft className="w-4 h-4" />
        {isClient ? "Back to Posted Projects" : "Back to My Bids"}
      </button>
      
      {alert && (
        <CustomAlert
          message={alert.message}
          type={alert.type}
          show={true}
          onClose={() => setAlert(null)}
        />
      )}
      
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative bg-white rounded-lg shadow-xl border-2 p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
            <p className="text-gray-700 mb-6">Are you sure you want to delete this project? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  handleDeleteProject();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    Open: "bg-emerald-50 text-emerald-700 border-emerald-200",
    "In Progress": "bg-amber-50 text-amber-700 border-amber-200",
    Completed: "bg-blue-50 text-blue-700 border-blue-200",
    "On Hold": "bg-gray-100 text-gray-600 border-gray-200",
  };
  return <span className={`text-xs px-2.5 py-1 rounded-full border ${map[status] || map.Open}`}>{status}</span>;
}

function Tabs({ active, setActive, isClient }) {
  const items = [
    { name: "Overview", icon: ScrollText },
    ...(isClient 
      ? [{ name: "Bids", icon: BadgeCheck }] 
      : [{ name: "Edit Bid", icon: Pencil }]),
    { name: "Activity", icon: ChevronRight },
  ];
  return (
    <div className="flex flex-wrap gap-2 p-2 md:p-3 border-b border-gray-100">
      {items.map(({ name, icon: Icon }) => (
        <button
          key={name}
          onClick={() => setActive(name)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm md:text-[0.95rem] transition border ${
            active === name
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
          }`}
        >
          <Icon className="w-4 h-4" /> {name}
        </button>
      ))}
    </div>
  );
}

// function Section({ title, children, icon: Icon }) {
//   return (
//     <div className="mb-6">
//       <div className="flex items-center gap-2 mb-3">
//         {Icon && <Icon className="w-4 h-4 text-gray-500" />}
//         <h3 className="text-base font-semibold text-gray-900">{title}</h3>
//       </div>
//       <div className="text-sm text-gray-700 leading-relaxed">{children}</div>
//     </div>
//   );
// }

function OverviewTab({ project }) {
  // Normalize URL from network IP to localhost if needed
  const normalizeUrl = (url) => {
    if (!url || typeof url !== 'string') return url;
    // If URL uses network IP but we're on localhost, convert it
    if (url.includes('10.0.0.157') && window.location.hostname === 'localhost') {
      return url.replace('http://10.0.0.157/backend-php', 'http://localhost/backend-php');
    }
    return url;
  };

  const isImageFile = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(ext)) return '📄';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['zip', 'rar'].includes(ext)) return '📦';
    return '📎';
  };

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-3">Summary</h3>
      <p className="text-sm text-gray-700 leading-relaxed mb-4">{project.summary}</p>
      {project.scope && project.scope.length > 0 && (
        <>
          <h3 className="text-base font-semibold text-gray-900 mb-2 mt-4">Scope</h3>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1 mb-6">
            {project.scope.map((s, idx) => <li key={idx}>{s}</li>)}
          </ul>
        </>
      )}
      
      {/* Project Attachments */}
      {project.attachments && project.attachments.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-3">Project Attachments</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {project.attachments.map((att) => {
              const isImage = isImageFile(att.filename);
              return (
                <a
                  key={att.attachment_id}
                  href={normalizeUrl(att.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition group overflow-hidden"
                >
                  {isImage ? (
                    <div className="relative">
                      <img
                        src={normalizeUrl(att.url)}
                        alt={att.filename}
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          // Fallback to icon if image fails to load
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="hidden items-center justify-center h-48 bg-gray-100">
                        <span className="text-4xl">🖼️</span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white p-2">
                        <div className="text-xs font-medium truncate">{att.filename}</div>
                        <div className="text-xs opacity-90">
                          {att.uploaded_by_name || 'Unknown'} • {new Date(att.uploaded_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3">
                      <span className="text-2xl">{getFileIcon(att.filename)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{att.filename}</div>
                        <div className="text-xs text-gray-500">
                          {att.uploaded_by_name || 'Unknown'} • {new Date(att.uploaded_at).toLocaleDateString()}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition" />
                    </div>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function BidsTabClient({ project, acceptedBidId, handleAcceptBid, handleDeclineBid }) {
  // Filter out rejected bids - only show Pending and Accepted bids
  const visibleBids = project.bids?.filter(b => b.status === 'Pending' || b.status === 'Accepted') || [];
  
  if (visibleBids.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No bids yet. Check back later!</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {visibleBids.map((b) => {
        // Check if this bid is accepted (from status or acceptedBidId)
        const isAccepted = b.status === 'Accepted' || acceptedBidId === b.id;
        
        return (
          <div key={b.id} className="border border-gray-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="font-semibold text-gray-900">{b.contributor}</div>
              <div className="text-sm text-gray-600">
                Bid: <span className="font-medium text-gray-800">${b.amount}</span> • ETA: {b.eta}
              </div>
              <div className="text-sm text-gray-700 mt-1">{b.note}</div>
            </div>
            <div className="flex gap-3">
              {isAccepted ? (
                <span className="bg-green-100 text-green-800 px-4 py-2.5 rounded-xl text-sm font-medium border border-green-200">
                  Accepted
                </span>
              ) : (
                <>
                  <button 
                      onClick={() => handleAcceptBid(b.id)} 
                      className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2">
                    <Check className="w-4 h-4" /> Accept
                  </button>
                  <button 
                    onClick={() => handleDeclineBid(b.id)} 
                    className="border border-gray-300 text-gray-800 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-100 transition">
                    Decline
                  </button>
                </> 
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EditBidTabContributor({ project, onUpdate, onAlert }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    amount: "",
    timelineDays: "",
    timelineUnit: "days",
    proposal: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Find the user's bid for this project
    const userBid = project.bids?.find(b => b.contributor_id === user?.user_id);
    if (userBid) {
      // Parse timeline (e.g., "7 days" -> 7, "days")
      const timelineMatch = userBid.eta?.match(/(\d+)\s*(days?|months?)/i);
      const days = timelineMatch ? parseInt(timelineMatch[1]) : userBid.eta?.replace(/\D/g, '') || "";
      const unit = timelineMatch && timelineMatch[2]?.toLowerCase().includes('month') ? 'months' : 'days';
      
      setFormData({
        amount: userBid.amount?.toString() || "",
        timelineDays: days.toString(),
        timelineUnit: unit,
        proposal: userBid.note || ""
      });
    }
    setLoading(false);
  }, [project, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const userBid = project.bids?.find(b => b.contributor_id === user?.user_id);
    if (!userBid) {
      onAlert?.({ message: "No bid found to update", type: "error" });
      return;
    }

    try {
      setSaving(true);
      const timelineDays = formData.timelineUnit === 'months' 
        ? parseInt(formData.timelineDays) * 30 
        : parseInt(formData.timelineDays);

      const result = await apiUpdateBid(
        userBid.id,
        parseFloat(formData.amount),
        timelineDays,
        formData.proposal
      );

      if (result.success) {
        onAlert?.({ message: "Bid updated successfully. Client will be notified.", type: "success" });
        onUpdate?.(); // Refresh project data
      } else {
        onAlert?.({ message: result.error || "Failed to update bid", type: "error" });
      }
    } catch (err) {
      console.error("Failed to update bid:", err);
      onAlert?.({ message: err.message || "Failed to update bid", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading bid...</div>;
  }

  const userBid = project.bids?.find(b => b.contributor_id === user?.user_id);
  if (!userBid) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">You haven't placed a bid on this project yet.</p>
        <Link to={`/place-bid/${project.id}`}>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Place a Bid
          </button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-sm font-medium text-gray-700">Your Bid</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Bid Amount (USD) *</label>
          <input
            name="amount"
            type="number"
            step="0.01"
            min={project.budget_min}
            max={project.budget_max}
            value={formData.amount}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-600 mb-1">Delivery Timeline *</label>
          <div className="flex gap-2">
            <input
              name="timelineDays"
              type="number"
              min="1"
              value={formData.timelineDays}
              onChange={handleChange}
              className="flex-1 border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="7"
              required
            />
            <select
              name="timelineUnit"
              value={formData.timelineUnit}
              onChange={handleChange}
              className="border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="days">Days</option>
              <option value="months">Months</option>
            </select>
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">Notes / Approach *</label>
        <textarea
          name="proposal"
          value={formData.proposal}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
          placeholder="Describe your approach and why you're the best fit..."
          required
        />
      </div>
      <div className="flex gap-4 mt-4">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Updating..." : "Update Bid"}
        </button>
      </div>
    </form>
  );
}


function ActivityTab({ project }) {
  return (
    <div className="space-y-4">
      {project.activity.map((a) => (
        <div key={a.id} className="flex items-start gap-3">
          <div className="mt-1 w-2 h-2 rounded-full bg-blue-600" />
          <div>
            <div className="text-sm text-gray-900">{a.text}</div>
            <div className="text-xs text-gray-500">{a.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}