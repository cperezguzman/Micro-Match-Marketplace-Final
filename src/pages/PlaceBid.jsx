// src/pages/PlaceBid.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiGetProject, apiPlaceBid } from "../api";
import CustomAlert from "../components/CustomAlert";

export default function PlaceBid() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState(null);
  const [formData, setFormData] = useState({
    amount: "",
    deliveryDays: "",
    message: "",
  });

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const data = await apiGetProject(projectId);
      if (data.success && data.project) {
        setProject(data.project);
      } else {
        setError("Project not found");
      }
    } catch (err) {
      console.error("Failed to load project:", err);
      setError(err.message || "Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) =>
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectId || !formData.amount || !formData.deliveryDays || !formData.message) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const result = await apiPlaceBid(
        projectId,
        parseFloat(formData.amount),
        parseInt(formData.deliveryDays),
        formData.message
      );
      
      if (result.success) {
        setAlert({ message: "Bid submitted successfully!", type: "success" });
        // Wait a moment for user to see the alert, then navigate
        setTimeout(() => {
          navigate(`/project-details/${projectId}`);
        }, 1500);
      } else {
        setError(result.error || "Failed to submit bid");
      }
    } catch (err) {
      console.error("Failed to submit bid:", err);
      setError(err.message || "Failed to submit bid");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate("/projects")}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const budget = project.budget_min === project.budget_max
    ? `$${project.budget_min.toLocaleString()}`
    : `$${project.budget_min.toLocaleString()} – $${project.budget_max.toLocaleString()}`;

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-8">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 text-sm hover:underline flex items-center"
        >
          ← Back to Projects
        </button>
        <div className="text-right">
          <h1 className="text-3xl font-bold">Place Your Bid</h1>
          <p className="text-gray-500 text-sm">
            Submit your proposal for this project
          </p>
        </div>
      </div>

      {error && (
        <div className="w-full max-w-5xl mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow">
            <h2 className="text-xl font-semibold mb-2">{project.title}</h2>
            {(() => {
              // Parse description to extract summary, scope, and milestones
              const rawDesc = project.description || '';
              const summary = rawDesc.split(/\[SCOPE\]|\[MILESTONES\]/)[0].trim();
              const scopeMatch = rawDesc.match(/\[SCOPE\]\s*\n(.*?)(?:\n\n\[MILESTONES\]|$)/s);
              const milestonesMatch = rawDesc.match(/\[MILESTONES\]\s*\n(.*?)$/s);
              
              let milestones = [];
              if (milestonesMatch && milestonesMatch[1]) {
                try {
                  milestones = JSON.parse(milestonesMatch[1].trim());
                } catch (e) {
                  console.error('Failed to parse milestones:', e);
                }
              }
              
              return (
                <>
                  <p className="text-gray-600 text-sm mb-4">{summary}</p>
                  
                  {scopeMatch && scopeMatch[1] && (
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-800 mb-1">Scope:</h3>
                      <ul className="text-xs text-gray-600 list-disc list-inside space-y-0.5">
                        {scopeMatch[1].trim().split(/\n/).filter(s => s.trim()).map((point, idx) => (
                          <li key={idx}>{point.trim()}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {milestones.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-800 mb-1">Milestones:</h3>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {milestones.map((m, idx) => (
                          <li key={idx} className="flex justify-between">
                            <span>{m.title}</span>
                            <span className="text-gray-500">
                              {m.due ? new Date(m.due).toLocaleDateString() : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              );
            })()}
            <div className="text-sm text-gray-700 space-y-1 mt-4">
              <p>💵 Budget: {budget}</p>
              <p>📅 Deadline: {new Date(project.deadline).toLocaleDateString()}</p>
              <p>📈 Current Bids: {project.bids?.length || 0}</p>
            </div>
          </div>

          {project.skills && project.skills.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow">
            <h3 className="font-semibold mb-2 text-sm text-gray-700">
              Required Skills
            </h3>
            <div className="flex flex-wrap gap-2 text-xs">
                {project.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-1 bg-gray-200 rounded-md text-gray-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
          )}

          <div className="bg-white rounded-2xl p-6 shadow">
            <h3 className="font-semibold mb-2 text-sm text-gray-700">💡 Tips</h3>
            <ul className="text-sm text-gray-600 list-disc ml-4 space-y-1">
              <li>Be specific about your approach</li>
              <li>Highlight relevant experience</li>
              <li>Provide realistic timelines</li>
              <li>Show enthusiasm</li>
            </ul>
          </div>
        </div>

        {/* Right Column */}
        <div className="md:col-span-2 bg-white rounded-2xl shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Your Bid Proposal</h2>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium mb-1">
                Bid Amount (USD) *
              </label>
              <input
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="7000"
                type="number"
                step="0.01"
                min={project.budget_min}
                max={project.budget_max}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Budget range: {budget}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Delivery Timeline (Days) *
              </label>
              <input
                name="deliveryDays"
                value={formData.deliveryDays}
                onChange={handleChange}
                placeholder="30"
                type="number"
                min="1"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Message to Client *
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Why are you the best fit? Describe your approach and experience..."
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                rows={5}
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 bg-gray-200 rounded-md text-sm"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Bid"}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {alert && (
        <CustomAlert
          message={alert.message}
          type={alert.type}
          show={true}
          onClose={() => setAlert(null)}
        />
      )}
    </div>
  );
}
