// src/pages/CompletedProjectsPage.jsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { apiGetProjects, apiGetBids } from "../api";
import { useAuth } from "../context/AuthContext";
import useRoleTheme from "../hooks/useRoleTheme";

export default function CompletedProjectsPage() {
  const { role } = useRoleTheme();
  const navigate = useNavigate();
  const { user, activeRole } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompletedProjects();
  }, [role, activeRole, user?.user_id]);

  const fetchCompletedProjects = async () => {
    try {
      setLoading(true);
      let data;
      
      if (role === "Client") {
        // Get completed projects owned by this client
        data = await apiGetProjects({ client_id: user?.user_id, status: 'Completed' });
        if (data.success && data.projects) {
          setProjects(data.projects);
        }
      } else {
        // For contributors, get completed projects where they have an accepted bid
        // First get all completed projects
        data = await apiGetProjects({ status: 'Completed' });
        if (data.success && data.projects) {
          // Get user's accepted bids to filter projects
          const bidsData = await apiGetBids({ contributor_id: user?.user_id });
          const acceptedBidProjectIds = new Set(
            (bidsData.bids || []).filter(b => b.status === 'Accepted').map(b => b.project_id)
          );
          
          // Only show completed projects where:
          // 1. User has an accepted bid
          // 2. User is NOT the client (exclude their own projects)
          // 3. Status is Completed
          const filtered = data.projects.filter(p => {
            // Convert to numbers for reliable comparison
            const projectClientId = Number(p.client_id);
            const userId = Number(user?.user_id);
            const projectId = Number(p.project_id);
            
            const hasAcceptedBid = acceptedBidProjectIds.has(projectId);
            const isNotClient = projectClientId !== userId;
            const isCompleted = p.status === 'Completed';
            
            return hasAcceptedBid && isNotClient && isCompleted;
          });
          setProjects(filtered);
        }
      }
    } catch (err) {
      console.error('Failed to load completed projects:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        {role === "Client" ? "Completed Projects" : "Completed Assignments"}
      </h1>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          {role === "Client" ? "You haven't completed any projects yet." : "You haven't completed any assignments yet."}
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((proj) => {
            const budget = proj.budget_min === proj.budget_max 
              ? `$${proj.budget_min.toLocaleString()}`
              : `$${proj.budget_min.toLocaleString()} – $${proj.budget_max.toLocaleString()}`;
            
            return (
              <div
                key={proj.project_id}
                className="border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-semibold">{proj.title}</h2>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    Completed
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  Budget: {budget}
                </div>
                <Link
                  to={`/project-details/${proj.project_id}`}
                  className="inline-block text-blue-600 hover:underline font-medium"
                >
                  View Details →
                </Link>
              </div>
            );
          })}
        </div>
      )}
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

