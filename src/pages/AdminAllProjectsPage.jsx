import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { apiGetProjects } from "../api";
import { useAuth } from "../context/AuthContext";

export default function AdminAllProjectsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      // Admins see ALL projects (no filters)
      const data = await apiGetProjects({});
      if (data.success && data.projects) {
        setProjects(data.projects);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-700';
      case 'InProgress':
        return 'bg-blue-100 text-blue-700';
      case 'Open':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">All Posted Projects</h1>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium py-2 px-4 shadow-sm transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 text-gray-500">No projects found.</div>
        ) : (
          <div className="space-y-4">
            {projects.map((proj) => {
              const budget = proj.budget_min === proj.budget_max 
                ? `$${proj.budget_min?.toLocaleString() || 0}`
                : `$${proj.budget_min?.toLocaleString() || 0} – $${proj.budget_max?.toLocaleString() || 0}`;
              
              return (
                <div
                  key={proj.project_id}
                  className="border border-gray-200 rounded-2xl p-6 bg-white hover:shadow-lg transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold mb-2">{proj.title}</h2>
                      <p className="text-sm text-gray-600 mb-2">Client: {proj.client_name || 'Unknown'}</p>
                      <p className="text-sm text-gray-600 mb-2">Budget: {budget}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(proj.status)}`}>
                      {proj.status || 'Unknown'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{proj.description?.split(/\[SCOPE\]|\[MILESTONES\]/)[0] || proj.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      Bids: {proj.bid_count || 0}
                    </span>
                    <Link
                      to={`/project-details/${proj.project_id}`}
                      className="inline-block text-purple-600 hover:underline font-medium"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

