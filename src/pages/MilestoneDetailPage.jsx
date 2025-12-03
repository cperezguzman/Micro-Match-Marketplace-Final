"use client";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { apiGetMilestones, apiGetProject, apiGetAssignments } from "../api";
import { format } from "date-fns";
import CustomAlert from "../components/CustomAlert";

export default function MilestoneDetailPage() {
  const navigate = useNavigate();
  const { projectId, milestoneId } = useParams();
  const [project, setProject] = useState(null);
  const [milestone, setMilestone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [comments, setComments] = useState("");
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    fetchMilestoneData();
  }, [projectId, milestoneId]);

  const fetchMilestoneData = async () => {
    try {
      setLoading(true);
      // Fetch milestones for this project first to get contributor info
      const milestonesData = await apiGetMilestones({ project_id: projectId });
      if (milestonesData.success && milestonesData.milestones) {
        const foundMilestone = milestonesData.milestones.find(m => m.milestone_id.toString() === milestoneId);
        
        // Get contributor info from milestone data
        const contributorName = foundMilestone?.contributor_name || null;
        const contributorEmail = foundMilestone?.contributor_email || null;
        
        // Fetch project details
        const projectData = await apiGetProject(projectId);
        if (projectData.success && projectData.project) {
          setProject({
            id: projectData.project.project_id,
            title: projectData.project.title,
            contributor: contributorName || projectData.project.contributor_name || `@${contributorEmail?.split('@')[0] || projectData.project.contributor_email?.split('@')[0] || 'Contributor'}`
          });
        }
        if (foundMilestone) {
          // Parse deliverables from submission_notes if available
          let deliverables = [];
          if (foundMilestone.submission_notes) {
            try {
              const parsed = JSON.parse(foundMilestone.submission_notes);
              if (parsed.deliverables && Array.isArray(parsed.deliverables)) {
                deliverables = parsed.deliverables.map((d, idx) => ({
                  id: idx + 1,
                  name: d.name,
                  required: d.required || false,
                  status: foundMilestone.status === 'Approved' ? 'Approved' : 
                         foundMilestone.status === 'Submitted' ? 'Pending Review' : 
                         'Not Started',
                  files: Array.isArray(d.files) ? d.files : []
                }));
              }
            } catch (e) {
              // If not JSON, treat as plain text
              deliverables = [{
                id: 1,
                name: foundMilestone.submission_notes,
                status: foundMilestone.status === 'Approved' ? 'Approved' : 
                       foundMilestone.status === 'Submitted' ? 'Pending Review' : 
                       'Not Started',
                files: []
              }];
            }
          }
          
          // If no deliverables from submission, try to get from project definition
          if (deliverables.length === 0 && projectData.success && projectData.project) {
            const desc = projectData.project.description || '';
            const milestonesMatch = desc.match(/\[MILESTONES\]\s*\n(.*?)$/s);
            if (milestonesMatch && milestonesMatch[1]) {
              try {
                const milestoneDefs = JSON.parse(milestonesMatch[1].trim());
                const milestoneDef = milestoneDefs.find(m => m.title === foundMilestone.title);
                if (milestoneDef && milestoneDef.deliverables) {
                  deliverables = milestoneDef.deliverables.map((d, idx) => ({
                    id: idx + 1,
                    name: d.name,
                    required: d.required || false,
                    status: 'Not Started',
                    files: []
                  }));
                }
              } catch (e) {
                console.error('Failed to parse milestone definitions:', e);
              }
            }
          }
          
          setMilestone({
            id: foundMilestone.milestone_id,
            title: foundMilestone.title,
            due: format(new Date(foundMilestone.due_date), 'MMM d, yyyy'),
            status: foundMilestone.status === 'Approved' ? 'Completed' : 
                   foundMilestone.status === 'Submitted' ? 'Pending Review' : 
                   'In Progress',
            submission_notes: foundMilestone.submission_notes,
            submission_url: foundMilestone.submission_url,
            deliverables: deliverables.length > 0 ? deliverables : [{
              id: 1,
              name: "No deliverables submitted yet.",
              status: "Not Started",
              files: []
            }]
          });
        }
      }
    } catch (err) {
      console.error('Failed to load milestone:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const deliverables = milestone?.deliverables || [{
    id: 1,
    name: "No deliverables submitted yet.",
    status: "Not Started",
    files: []
  }];

  const handleApproveMilestone = async () => {
    if (!milestone) return;
    
    try {
      setApproving(true);
      const { apiApproveMilestone } = await import('../api');
      const result = await apiApproveMilestone(milestone.id);
      
      if (result.success) {
        // Refresh milestone data
        await fetchMilestoneData();
        setAlert({ message: 'Milestone approved successfully!', type: 'success' });
      } else {
        setAlert({ message: 'Failed to approve milestone: ' + (result.error || 'Unknown error'), type: 'error' });
      }
    } catch (err) {
      console.error('Failed to approve milestone:', err);
      setAlert({ message: 'Failed to approve milestone: ' + err.message, type: 'error' });
    } finally {
      setApproving(false);
    }
  };

  const handleReturnForChanges = async () => {
    if (!milestone) return;
    
    try {
      // Set status back to Open
      const { apiUpdateMilestone } = await import('../api');
      const result = await apiUpdateMilestone(milestone.id, {
        status: 'Open'
      }, 'update');
      
      if (result.success) {
        await fetchMilestoneData();
        setAlert({ message: 'Milestone returned for changes.', type: 'success' });
      } else {
        setAlert({ message: 'Failed to return milestone: ' + (result.error || 'Unknown error'), type: 'error' });
      }
    } catch (err) {
      console.error('Failed to return milestone:', err);
      setAlert({ message: 'Failed to return milestone: ' + err.message, type: 'error' });
    }
  };

// -------------------------------------------------------------
// BACKEND IMPLEMENTATION NOTE — CUSTOM DELIVERABLES
// -------------------------------------------------------------
//
// This file currently uses a local map (deliverablesByMilestoneId)
// for demonstration. When the backend is live, REMOVE ALL LOCAL DATA.
//
// Replace with a real fetch:
//
//   GET /api/projects/:projectId/milestones/:milestoneId
//
// Expected response shape:
//
// {
//   id,
//   title,
//   due,
//   status,
//   deliverables: [
//     { id, name, status },
//     ...
//   ]
// }
//
// Then set:
//   const deliverables = data.deliverables;
//
// These deliverables come directly from CreateProject → backend,
// meaning deliverables are fully customizable per milestone.
// -------------------------------------------------------------


  if (loading) {
    return <div className="p-10 text-center">Loading milestone...</div>;
  }

  if (!project || !milestone) {
    return <div className="p-10 text-center text-red-600">Milestone not found</div>;
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 text-gray-900 flex justify-center">
      <div className="w-full max-w-[1200px] px-20 py-16 space-y-10">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">{milestone.title}</h1>
          <p className="text-gray-600">
            Review deliverables, provide feedback, and approve or return this milestone.
          </p>
        </div>

        {/* Summary */}
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold">{project.title}</h2>
              <p className="text-gray-600 mt-2">
                Milestone: {milestone.title}
              </p>
            </div>
            <div className="text-sm text-gray-500">Due: {milestone.due}</div>
          </div>

          <div className="flex justify-between text-sm">
            <div>
              <p className="font-medium text-gray-800">Contributor:</p>
              <p className="text-blue-600">{project.contributor}</p>
            </div>
            <div className="text-right">
              <p className="font-medium text-gray-800">Status:</p>
              <p className={
                milestone.status === "Completed" ? "text-green-600" :
                milestone.status === "Pending Review" ? "text-yellow-600" :
                "text-blue-600"
              }>
                {milestone.status}
              </p>
            </div>
          </div>
        </div>

        {/* Deliverables */}
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold mb-6">Deliverables</h2>

          <div className="space-y-4">
            {deliverables.map((d) => (
              <div
                key={d.id}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">{d.name}</span>
                  <span
                    className={`text-sm px-3 py-1 rounded-full ${
                      d.status === "Approved"
                        ? "bg-green-100 text-green-700"
                        : d.status === "Pending Review"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {d.status}
                  </span>
                </div>
                {/* Display files if available */}
                {d.files && d.files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium text-gray-700">Submitted Files:</p>
                    <div className="flex flex-wrap gap-2">
                      {d.files.map((fileUrl, idx) => {
                        const fileName = fileUrl.split('/').pop() || `File ${idx + 1}`;
                        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
                        const normalizedUrl = fileUrl.includes('10.0.0.157') 
                          ? fileUrl.replace('10.0.0.157', 'localhost')
                          : fileUrl;
                        
                        return (
                          <a
                            key={idx}
                            href={normalizedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 text-sm"
                          >
                            {isImage ? '🖼️' : '📄'} {fileName}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Comments */}
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <h2 className="text-xl font-semibold">Reviewer Comments</h2>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Leave feedback or notes for the contributor..."
            className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800"
          ></textarea>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-4 -mt-2">
          {milestone.status !== 'Approved' && milestone.status !== 'Completed' && (
            <button 
              className="border border-gray-300 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-100 transition"
              onClick={handleReturnForChanges}
            >
              Return for Changes
            </button>
          )}
          {milestone.status !== 'Approved' && (
            <button 
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
              onClick={handleApproveMilestone}
              disabled={approving}
            >
              {approving ? "Approving..." : "Approve Milestone"}
            </button>
          )}
        </div>

        <button
          onClick={() => navigate(-1)}
          className="mt-4 underline text-blue-600 text-sm"
        >
          Back to Assignment
        </button>

      </div>
      <button
        onClick={() => navigate("/assignment")}
        className="fixed bottom-6 left-6 flex items-center gap-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-3 px-4 shadow-sm transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Project Assignments
      </button>
      
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
