"use client";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { apiGetProject, apiGetAssignments } from "../api";

export default function FinalizeProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  // star rating state
  const [rating, setRating] = useState(0);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const projectData = await apiGetProject(projectId);
      if (projectData.success && projectData.project) {
        // Get assignment to find contributor
        const assignmentsData = await apiGetAssignments();
        if (assignmentsData.success && assignmentsData.assignments) {
          const assignment = assignmentsData.assignments.find(a => a.project_id.toString() === projectId);
          setProject({
            id: projectData.project.project_id,
            title: projectData.project.title,
            contributor: assignment?.contributor_name || `@${assignment?.contributor_email?.split('@')[0] || 'Contributor'}`
          });
        } else {
          setProject({
            id: projectData.project.project_id,
            title: projectData.project.title,
            contributor: 'Contributor'
          });
        }
      }
    } catch (err) {
      console.error('Failed to load project:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center">Loading project...</div>;
  }

  if (!project) {
    return (
      <div className="p-10 text-center text-red-600 font-semibold">
        Project not found
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 text-gray-900 flex justify-center px-6 py-12">
      <div className="w-full max-w-[960px] bg-white rounded-3xl border border-gray-200 shadow-sm p-12">

        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-blue-600 hover:underline mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Header */}
        <header className="mb-10">
          <h1 className="text-[28px] leading-8 font-bold">Finalize Project</h1>
          <p className="text-[14px] leading-6 text-gray-600 mt-1">
            Leave a review for <span className="font-medium">{project.contributor}</span> and close this project.
          </p>
        </header>

        {/* Project Summary Card */}
        <div className="rounded-2xl border border-gray-200 p-6 mb-10 flex items-center justify-between">
          <div>
            <p className="text-[12px] text-gray-500 mb-1">Project</p>
            <p className="text-[16px] font-medium">{project.title}</p>
          </div>
          <CheckCircle2 className="w-6 h-6 text-green-600" />
        </div>

        {/* Rating */}
        <div className="mb-10">
          <label className="text-[14px] font-medium">Overall Rating</label>

          <div className="flex items-center gap-4 mt-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                onClick={() => setRating(star)}
                className={`w-7 h-7 cursor-pointer transition ${
                  star <= rating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Comment Section */}
        <div className="mb-12">
          <label className="text-[14px] font-medium">Comment</label>
          <textarea
            className="mt-2 w-full min-h-[200px] rounded-2xl border border-gray-200 px-5 py-4 outline-none focus:border-blue-500 text-[15px]"
            placeholder="Share feedback about communication, quality, and timeliness..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <button
            onClick={() => navigate(-1)}
            className="border border-gray-300 text-gray-800 px-7 py-3.5 rounded-xl text-[14px] font-medium hover:bg-gray-100 transition"
          >
            Cancel
          </button>

          <button
            className="bg-blue-600 text-white px-7 py-3.5 rounded-xl text-[14px] font-medium hover:bg-blue-700 transition flex items-center gap-2"
            onClick={() => {
              // ---------------------
              // BACKEND SUBMISSION TO BUILD LATER:
              // POST /api/projects/:id/review
              // body: { rating, comment }
              // ---------------------
              navigate("/dashboard");
            }}
          >
            Submit Review
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
