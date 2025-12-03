import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import useRoleTheme from "../hooks/useRoleTheme";
import { ArrowLeft } from "lucide-react"; 
import { apiGetProjects, apiGetBids } from "../api";
import { useAuth } from "../context/AuthContext";

export default function ProjectListPage() {
  const { role } = useRoleTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      let data;
      
      if (role === "Client") {
        // Get projects owned by this client
        data = await apiGetProjects({ client_id: user?.user_id });
      } else {
        // Get all open projects, then filter by user's bids
        data = await apiGetProjects({ status: 'Open' });
      }
      
      if (data.success && data.projects) {
        if (role === "Contributor") {
          // Get user's bids to filter projects (excludes rejected bids)
          const bidsData = await apiGetBids({ contributor_id: user?.user_id });
          const userBidProjectIds = new Set(
            (bidsData.bids || []).map(b => b.project_id)
          );
          
          // Only show projects where user has placed a bid (and bid is not rejected)
          // Exclude completed projects
          const filtered = data.projects.filter(p => 
            userBidProjectIds.has(p.project_id) && p.status !== 'Completed'
          );
          setProjects(filtered);
        } else {
          // For clients, exclude completed projects from "Projects Posted"
          const filtered = data.projects.filter(p => p.status !== 'Completed');
          setProjects(filtered);
        }
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, user?.user_id]);

  const filteredProjects = projects;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        {role === "Client" ? "Projects Posted" : "My Bids"}
      </h1>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading projects...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          {role === "Client" ? "You haven't posted any projects yet." : "You haven't placed any bids yet."}
        </div>
      ) : (
      <div className="space-y-4">
          {filteredProjects.map((proj) => {
            const budget = proj.budget_min === proj.budget_max 
              ? `$${proj.budget_min.toLocaleString()}`
              : `$${proj.budget_min.toLocaleString()} – $${proj.budget_max.toLocaleString()}`;
            
            return (
          <div
                key={proj.project_id}
            className="border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition"
          >
            <h2 className="text-xl font-semibold mb-2">{proj.title}</h2>
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
