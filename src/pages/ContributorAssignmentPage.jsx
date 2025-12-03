// src/pages/ContributorAssignmentsPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { apiGetAssignments, apiUpdateMilestone } from "../api";
import { useAuth } from "../context/AuthContext";
import { format } from "date-fns";

export default function ContributorAssignmentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openProjectId, setOpenProjectId] = useState(null);
  
  useEffect(() => {
    fetchAssignments();
  }, [user?.activeRole]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      console.log('Fetching assignments with activeRole:', user?.activeRole);
      const data = await apiGetAssignments(user?.activeRole);
      console.log('Assignments API response:', data);
      if (data.success && data.assignments) {
        // Transform backend format to UI format
        const transformed = data.assignments.map(a => {
          const milestones = (a.milestones || []).map(m => {
            let progress = m.progress || (m.status === 'Approved' ? 100 : m.status === 'Submitted' ? 75 : 0);
            progress = Number(progress);
            
            return {
              id: m.milestone_id,
              title: m.title,
              due: format(new Date(m.due_date), 'MMM d, yyyy'),
              due_date: m.due_date,
              status: m.status,
              progress: progress
            };
          });
          
          return {
            id: a.project_id,
            title: a.project_title,
            summary: a.project_summary,
            client: a.client_name || `@${a.client_email?.split('@')[0] || 'Client'}`,
            projectId: `#${a.project_id}`,
            status: a.project_status || 'In Progress',
            milestones
          };
        });
        setProjects(transformed);
      }
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleProject = (id) =>
    setOpenProjectId((prev) => (prev === id ? null : id));

  return (
    <div className="w-full min-h-screen bg-gray-50 text-gray-900 flex justify-center">
      <div className="w-full max-w-[1200px] px-20 py-16 space-y-10">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">My Assignments</h1>
          <p className="text-gray-600">
            View your assigned projects and submit milestone deliverables.
          </p>
        </div>

        {/* Project List */}
        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading assignments...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 text-gray-500">No assignments found.</div>
        ) : (
          projects.map((project) => {
          const isOpen = openProjectId === project.id;

          return (
            <div
              key={project.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 cursor-pointer transition hover:shadow-md"
              onClick={() => toggleProject(project.id)}
            >
              {/* Summary */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold">{project.title}</h2>
                  <p className="text-gray-600 mt-2">{project.summary}</p>
                </div>

                <div className="text-sm text-gray-500">
                  <p>Project ID:</p>
                  <p className="font-medium text-gray-700">{project.projectId}</p>
                </div>
              </div>

              <div className="flex justify-between items-start mt-4">
                <div className="text-sm">
                  <p className="font-medium text-gray-800">Client:</p>
                  <p className="text-blue-600">{project.client}</p>
                </div>
                <div className="text-sm text-right">
                  <p className="font-medium text-gray-800">Status:</p>
                  <p className={
                    project.status === "Completed" ? "text-green-600" :
                    project.status === "In Progress" ? "text-blue-600" :
                    project.status === "Ready for Finalization" ? "text-yellow-600" :
                    "text-gray-600"
                  }>{project.status || "In Progress"}</p>
                </div>
              </div>

              {/* Accordion */}
              <div
                className={`transition-all duration-300 overflow-hidden ${
                  isOpen ? "max-h-[1000px] mt-10" : "max-h-0"
                }`}
              >
                <h2 className="text-xl font-semibold mb-6">Milestones</h2>

                <div className="space-y-5">
                  {project.milestones && project.milestones.length > 0 ? (
                    project.milestones.map((m) => {
                      const progress = Number(m.progress) || 0;
                      // Color coordination: green at 100%, blue <10%, yellow/orange for in-between
                      let progressColor = "bg-gray-400"; // default
                      if (progress === 100) {
                        progressColor = "bg-green-500";
                      } else if (progress >= 75) {
                        progressColor = "bg-green-400";
                      } else if (progress >= 50) {
                        progressColor = "bg-yellow-400";
                      } else if (progress >= 25) {
                        progressColor = "bg-orange-400";
                      } else if (progress > 0) {
                        progressColor = "bg-blue-500";
                      } else {
                        progressColor = "bg-gray-400";
                      }
                      
                      return (
                        <div
                          key={m.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/milestone-submit/${project.id}/${m.id}`);
                          }}
                          className="border border-gray-200 rounded-lg p-5 space-y-2 bg-gray-50 cursor-pointer hover:shadow-md transition"
                        >
                          <div className="flex justify-between items-center">
                            <h3 className="font-medium">{m.title}</h3>
                            <div className="flex items-center gap-2">
                              {new Date(m.due_date) < new Date() && m.status !== 'Approved' && (
                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                                  Past Due
                                </span>
                              )}
                              <span className={`text-sm ${new Date(m.due_date) < new Date() && m.status !== 'Approved' ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                                Due: {m.due}
                              </span>
                            </div>
                          </div>

                          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${progressColor}`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>

                          <div className="flex justify-between text-sm text-gray-600">
                            <span>{progress}% Complete</span>
                            {progress === 100 ? (
                              <span className="text-green-600 font-medium">Completed</span>
                            ) : progress >= 50 ? (
                              <span className="text-yellow-600 font-medium">In Progress</span>
                            ) : progress > 0 ? (
                              <span className="text-blue-600 font-medium">In Progress</span>
                            ) : (
                              <span className="text-gray-500 font-medium">Not Started</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500 text-center py-4">No milestones yet.</p>
                  )}
                </div>

                {/* Buttons - Contributor view */}
                <div className="flex justify-end gap-4 mt-8">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Navigate to milestone page to request changes
                      if (project.milestones && project.milestones.length > 0) {
                        navigate(`/milestone-submit/${project.id}/${project.milestones[0].id}?action=request`);
                      }
                    }}
                    className="border border-gray-300 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-100 transition"
                  >
                    Request Changes
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/messages`);
                    }}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                  >
                    View Project Chat
                  </button>
                </div>
              </div>
            </div>
          );
          })
        )}
      </div>

      {/* Back Button */}
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
