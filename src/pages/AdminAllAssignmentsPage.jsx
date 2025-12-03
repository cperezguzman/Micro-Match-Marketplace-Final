import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { apiGetAssignments } from "../api";
import { useAuth } from "../context/AuthContext";

export default function AdminAllAssignmentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      // Admins see ALL assignments (no filters)
      const data = await apiGetAssignments(null, true);
      if (data.success && data.assignments) {
        setAssignments(data.assignments);
      }
    } catch (err) {
      console.error('Failed to load assignments:', err);
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
          <h1 className="text-3xl font-bold text-gray-800">All Assignments</h1>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium py-2 px-4 shadow-sm transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading assignments...</div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-16 text-gray-500">No assignments found.</div>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <div
                key={assignment.assignment_id}
                className="border border-gray-200 rounded-2xl p-6 bg-white hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-2">{assignment.project_title || 'Unknown Project'}</h2>
                    {assignment.contributor_name && (
                      <p className="text-sm text-gray-600 mb-2">Contributor: {assignment.contributor_name}</p>
                    )}
                    {assignment.client_name && (
                      <p className="text-sm text-gray-600 mb-2">Client: {assignment.client_name}</p>
                    )}
                    <p className="text-sm text-gray-600 mb-2">
                      Milestones: {assignment.completed_milestones || 0} / {assignment.total_milestones || 0} completed
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(assignment.project_status)}`}>
                    {assignment.project_status || 'Unknown'}
                  </span>
                </div>
                {assignment.project_summary && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{assignment.project_summary}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Created: {new Date(assignment.created_at || Date.now()).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => navigate(`/project-details/${assignment.project_id}`)}
                    className="text-purple-600 hover:underline font-medium"
                  >
                    View Project →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

