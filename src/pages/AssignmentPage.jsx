"use client";
import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiGetAssignments, apiUpdateMilestone, apiFinalizeProject, apiSubmitReview } from "../api";
import { useAuth } from "../context/AuthContext";
import { format } from "date-fns";
import CustomAlert from "../components/CustomAlert";

export default function AssignmentPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [projectToFinalize, setProjectToFinalize] = useState(null);
  const [showReviewPopup, setShowReviewPopup] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

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
          // Calculate progress for each milestone
          const milestones = (a.milestones || []).map(m => {
            let progress = m.progress || (m.status === 'Approved' ? 100 : m.status === 'Submitted' ? 75 : 0);
            // Ensure progress is a number
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
          
          // Determine project status - check if project is already completed
          const projectStatus = a.project_status || 'InProgress';
          let status;
          if (projectStatus === 'Completed') {
            status = "Completed";
          } else {
            const allComplete = milestones.length > 0 && milestones.every(m => m.progress === 100);
            status = allComplete ? "Ready for Finalization" : "In Progress";
          }
          
          return {
            id: a.project_id,
            title: a.project_title,
            summary: a.project_summary,
            contributor: a.contributor_name || `@${a.contributor_email?.split('@')[0] || 'Contributor'}`,
            projectId: `#${a.project_id}`,
            status,
            project_status: projectStatus,
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

  const oldProjects = [
    {
      id: 1,
      title: "Mobile App UI Redesign",
      summary:
        "Redesign the mobile app interface to enhance user experience and accessibility. Deliverables include wireframes, prototypes, and developer handoff assets.",
      contributor: "@SchemaSquad",
      projectId: "#1042",
      status: "In Progress",
      milestones: [
        { id: 1, title: "Wireframe Draft", due: "Oct 15, 2025", progress: 100 },
        { id: 2, title: "Prototype Review", due: "Oct 21, 2025", progress: 70 },
        { id: 3, title: "Final Delivery", due: "Oct 30, 2025", progress: 30 },
      ],
    },

    {
      id: 2,
      title: "E-Commerce Product Recommendation Engine",
      summary:
          "Build a machine-learning powered recommendation engine that analyzes user behavior and provides personalized product suggestions. Includes dashboard integration and performance analytics.",
      contributor: "@DataWizard",
      projectId: "#2078",
      status: "In Progress",
      milestones: [
          { id: 1, title: "Dataset Cleaning & Prep", due: "Nov 12, 2025", progress: 100 },
          { id: 2, title: "Model Training & Benchmarking", due: "Nov 22, 2025", progress: 60 },
          { id: 3, title: "Integration with Dashboard", due: "Dec 2, 2025", progress: 20 },
      ],
    },

    {
      id: 3,
      title: "Marketing Analytics Dashboard",
      summary:
          "Develop an interactive analytics dashboard for tracking campaign performance, ROAS, customer acquisition metrics, and multi-channel engagement. Includes exportable reports and role-based access.",
      contributor: "@InsightDev",
      projectId: "#3510",
      status: "In Progress",
      milestones: [
          { id: 1, title: "UI Wireframes", due: "Oct 28, 2025", progress: 100 },
          { id: 2, title: "Backend Aggregation Pipeline", due: "Nov 5, 2025", progress: 40 },
          { id: 3, title: "Dashboard Visualizations", due: "Nov 18, 2025", progress: 10 },
      ],
    },

    {
      id: 4,
      title: "AI-Powered Resume Screening Tool",
      summary:
          "Create an AI tool that evaluates resumes based on skill matching, experience relevance, and job-specific criteria. Includes PDF parsing, score explanations, and recruiter review workflow.",
      contributor: "@HRTechPro",
      projectId: "#4921",
      status: "In Progress",
      milestones: [
          { id: 1, title: "Resume Parsing Engine", due: "Dec 1, 2025", progress: 80 },
          { id: 2, title: "Ranking Algorithm", due: "Dec 10, 2025", progress: 45 },
          { id: 3, title: "Recruiter Review UI", due: "Dec 20, 2025", progress: 15 },
      ],
    },
    {
      id: 5,
      title: "Customer Support Chatbot Deployment",
      summary:
          "Deploy an AI-driven customer support chatbot with multilingual support, analytics dashboard, and seamless website integration.",
      contributor: "@ConversioAI",
      projectId: "#5814",
      status: "Ready for Finalization",
      milestones: [
          { id: 1, title: "Conversation Flow Design", due: "Sep 10, 2025", progress: 100 },
          { id: 2, title: "Model Training & Tuning", due: "Sep 18, 2025", progress: 100 },
          { id: 3, title: "Website Integration", due: "Sep 25, 2025", progress: 100 },
      ],
    }


    // Add more projects if you want more containers
  ];
  
  // Use fetched projects instead of old hard-coded ones
  // const projects = oldProjects;

  const [openProjectId, setOpenProjectId] = useState(null);

  const toggleProject = (id) => {
    setOpenProjectId((prev) => (prev === id ? null : id));
  };

  const handleFinalizeProject = async () => {
    if (!projectToFinalize) return;
    
    try {
      const result = await apiFinalizeProject(projectToFinalize.id, user?.activeRole);
      if (result.success) {
        setShowFinalizeConfirm(false);
        // Show review popup after successful finalization
        setShowReviewPopup(true);
        setReviewRating(0);
        setReviewComment("");
      } else {
        setAlert({ message: result.error || 'Failed to finalize project', type: 'error' });
      }
    } catch (err) {
      console.error('Failed to finalize project:', err);
      setAlert({ message: err.message || 'Failed to finalize project', type: 'error' });
    }
  };

  const handleSubmitReview = async () => {
    if (!projectToFinalize || reviewRating === 0) {
      setAlert({ message: 'Please select a rating', type: 'error' });
      return;
    }
    
    setSubmittingReview(true);
    try {
      const result = await apiSubmitReview(projectToFinalize.id, reviewRating, reviewComment);
      if (result.success) {
        setAlert({ message: 'Review submitted successfully!', type: 'success' });
        setShowReviewPopup(false);
        setProjectToFinalize(null);
        setReviewRating(0);
        setReviewComment("");
        fetchAssignments();
      } else {
        setAlert({ message: result.error || 'Failed to submit review', type: 'error' });
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
      setAlert({ message: err.message || 'Failed to submit review', type: 'error' });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSkipReview = () => {
    setShowReviewPopup(false);
    setProjectToFinalize(null);
    setReviewRating(0);
    setReviewComment("");
    fetchAssignments();
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 text-gray-900 flex justify-center">
      <div className="w-full max-w-[1200px] px-20 py-16 space-y-10">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Project Assignments</h1>
          <p className="text-gray-600">
            View project details, assigned contributor, and track milestone progress.
          </p>
        </div>

        {/* Project Containers */}
        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading assignments...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 text-gray-500">No assignments found.</div>
        ) : (
          projects.map((project) => {
          const isOpen = openProjectId === project.id;

          const allMilestonesComplete = (
            Array.isArray(project.milestones) &&
            project.milestones.length > 0 &&
            project.milestones.every(m => Number(m.progress) === 100));
          
          const hasAtLeastOneCompleted = (
            Array.isArray(project.milestones) &&
            project.milestones.length > 0 &&
            project.milestones.some(m => Number(m.progress) === 100));
          
          const isClient = user?.activeRole === 'Client';


          return (
            <div
              key={project.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 cursor-pointer transition hover:shadow-md"
              onClick={() => toggleProject(project.id)}
            >
              {/* Top Summary (ALWAYS visible) */}
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

              <div className="flex justify-between text-sm mt-4">
                <div>
                  <p className="font-medium text-gray-800">Assigned Contributor:</p>
                  <p className="text-blue-600">{project.contributor}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-800">Status:</p>
                  <p className="text-green-600">{project.status}</p>
                </div>
              </div>

              {/* Accordion Section (Milestones) */}
              <div
                className={`transition-all duration-300 overflow-hidden ${
                  isOpen ? "max-h-[1000px] mt-10" : "max-h-0"
                }`}
              >
                {/* Milestones */}
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
                          onClick={() => navigate(`/milestone/${project.id}/${m.id}`)}
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

                {/* Buttons - Client view */}
                {isClient && (
                  <div className="flex justify-end gap-4 mt-8">
                    {/* Update Milestone button - only show if not all milestones are complete */}
                    {!allMilestonesComplete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Navigate to milestone update page or open modal
                          // For now, navigate to first milestone
                          if (project.milestones && project.milestones.length > 0) {
                            navigate(`/milestone/${project.id}/${project.milestones[0].id}?action=update`);
                          }
                        }}
                        className="border border-gray-300 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-100 transition"
                      >
                        Update Milestone
                      </button>
                    )}

                    {/* Approve Project - only show if at least one milestone is completed */}
                    {hasAtLeastOneCompleted && !allMilestonesComplete && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          // Approve project action - could be a simple confirmation
                          // Approve project action - could be a simple confirmation
                          console.log('Approve project:', project.id);
                        }}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
                        Approve Project
                      </button>
                    )}

                    {/* Finalize Project - only show when all milestones are complete AND project is not already completed */}
                    {allMilestonesComplete && project.status !== "Completed" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectToFinalize(project);
                          setShowFinalizeConfirm(true);
                        }}
                        className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
                      >
                        Finalize Project
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
          })
        )}
      </div>
      <button
        onClick={() => navigate("/dashboard")}
        className="fixed bottom-6 left-6 flex items-center gap-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-3 px-4 shadow-sm transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* Review Popup - Shows after project finalization */}
      {showReviewPopup && projectToFinalize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative bg-white rounded-lg shadow-xl border-2 p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-semibold mb-2">Leave a Review</h3>
            <p className="text-gray-600 mb-6 text-sm">
              Share your experience working with <span className="font-medium">{projectToFinalize.contributor}</span> on "{projectToFinalize.title}".
            </p>
            
            {/* Star Rating */}
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Overall Rating *</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className={`text-3xl transition ${
                      star <= reviewRating
                        ? "text-yellow-400"
                        : "text-gray-300 hover:text-yellow-300"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Comment (Optional)</label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full min-h-[120px] rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 text-sm"
                placeholder="Share feedback about communication, quality, and timeliness..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleSkipReview}
                disabled={submittingReview}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                Skip
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview || reviewRating === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert */}
      {alert && (
        <CustomAlert
          message={alert.message}
          type={alert.type}
          show={true}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Finalize Confirm Dialog */}
      {showFinalizeConfirm && projectToFinalize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative bg-white rounded-lg shadow-xl border-2 p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Finalize Project</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to finalize "{projectToFinalize.title}"? This will mark the project as completed.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowFinalizeConfirm(false);
                  setProjectToFinalize(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalizeProject}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Yes, Finalize
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
