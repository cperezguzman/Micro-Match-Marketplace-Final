// src/pages/CreateProject.jsx
import { CalendarIcon, UploadCloud, ArrowLeft, X, Paperclip } from "lucide-react";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiCreateProject, apiUploadFile } from "../api";
import CustomAlert from "../components/CustomAlert";
import { useAuth } from "../context/AuthContext";

function Label({ children }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children}
    </label>
  );
}

function Input({ onEnter, ...props }) {
  return (
    <input
      {...props}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onEnter && onEnter();
        }
      }}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-200"
    />
  );
}

function Textarea({ onEnter, allowEnter = false, ...props }) {
  return (
    <textarea
      {...props}
      onKeyDown={(e) => {
        // If allowEnter is true, allow Enter for new lines
        // Otherwise, prevent Enter and call onEnter callback
        if (!allowEnter && e.key === "Enter") {
          e.preventDefault();
          onEnter && onEnter();
        }
        // If allowEnter is true, Enter key works normally (creates new line)
      }}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-200"
      rows={4}
    />
  );
}

function Select({ onEnter, options = [], placeholder, ...props }) {
  return (
    <select
      {...props}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onEnter && onEnter();
        }
      }}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-200"
    >
      <option>{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function Button({ children, variant = "default", ...props }) {
  const base = "px-4 py-2 rounded-md text-sm font-medium";
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-gray-300 text-gray-700",
    ghost: "text-gray-500 hover:text-gray-700",
  };
  return (
    <button className={`${base} ${variants[variant]}`} {...props}>
      {children}
    </button>
  );
}

function Badge({ children, removable, onRemove }) {
  return (
    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md flex items-center gap-1">
      {children}
      {removable && (
        <button onClick={onRemove} className="text-blue-700 hover:text-red-600">
          <X size={12} />
        </button>
      )}
    </span>
  );
}

function Card({ children }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">{children}</div>
  );
}

function CardHeader({ children }) {
  return <div className="mb-4">{children}</div>;
}

function CardTitle({ children }) {
  return <h2 className="text-lg font-semibold">{children}</h2>;
}

function CardContent({ children }) {
  return <div>{children}</div>;
}

export default function CreateProject() {
  const navigate = useNavigate();
  const { activeRole, user } = useAuth();
  const fileInputRef = useRef(null);

  // --------------------------
  // Form State
  // --------------------------
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [deadline, setDeadline] = useState("");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);

  // --------------------------
  // Skills
  // --------------------------
  const recommendedSkills = [
    "React", "JavaScript", "Python", "Node.js", "TypeScript",
    "Vue.js", "Angular", "PHP", "Django", "Flask",
    "MongoDB", "MySQL", "AWS", "Figma", "TensorFlow", "UI/UX Design",
  ];

  const [selectedSkills, setSelectedSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");

  const addSkill = () => {
    if (skillInput.trim() === "") return;
    if (!selectedSkills.includes(skillInput.trim())) {
      setSelectedSkills([...selectedSkills, skillInput.trim()]);
    }
    setSkillInput("");
  };

  const selectRecommendedSkill = (skill) => {
    if (!selectedSkills.includes(skill)) {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const removeSkill = (skill) => {
    setSelectedSkills(selectedSkills.filter((s) => s !== skill));
  };

// -------------------------------------------------------------
// BACKEND ARCHITECTURE NOTE — CUSTOM MILESTONES + DELIVERABLES
// -------------------------------------------------------------
//
// When the backend is ready, each milestone created here should
// be saved with BOTH:
//   (1) milestone metadata (title, due date, order)
//   (2) milestone deliverables (a list that the user defines)
//
// Example structure to POST during project creation:
//
// POST /api/projects
// {
//   title,
//   description,
//   budget,
//   requiredSkills,
//   milestones: [
//     {
//       id: "uuid",
//       title: "Initial Wireframes",
//       due: "2025-10-21",
//       deliverables: [
//         { id: "uuid", name: "Wireframe Screens", status: "Not Started" },
//         { id: "uuid", name: "User Flow Diagram", status: "Not Started" }
//       ]
//     },
//     ...
//   ]
// }
//
// Later, AssignmentPage.jsx will FETCH this project data
// and display milestone titles + progress.
// MilestoneDetailPage.jsx will fetch an individual milestone
// and display its deliverables.
//
// TL;DR: Deliverables created here → saved to backend → used
// everywhere else automatically.
// -------------------------------------------------------------

  const [milestones, setMilestones] = useState([
    { id: 1, title: "", due: "", deliverables: [] }
  ]);

  const addMilestone = () => {
    setMilestones([...milestones, { id: Date.now(), title: "", due: "", deliverables: [] }]);
  };

  const updateMilestone = (id, field, value) => {
    setMilestones(
      milestones.map((m) =>
        m.id === id ? { ...m, [field]: value } : m
      )
    );
  };
  
  const addDeliverableToMilestone = (milestoneId) => {
    setMilestones(
      milestones.map((m) =>
        m.id === milestoneId 
          ? { ...m, deliverables: [...(m.deliverables || []), { id: Date.now(), name: "", required: false }] }
          : m
      )
    );
  };
  
  const updateDeliverable = (milestoneId, deliverableId, field, value) => {
    setMilestones(
      milestones.map((m) =>
        m.id === milestoneId
          ? {
              ...m,
              deliverables: (m.deliverables || []).map((d) =>
                d.id === deliverableId ? { ...d, [field]: value } : d
              )
            }
          : m
      )
    );
  };
  
  const removeDeliverable = (milestoneId, deliverableId) => {
    setMilestones(
      milestones.map((m) =>
        m.id === milestoneId
          ? { ...m, deliverables: (m.deliverables || []).filter((d) => d.id !== deliverableId) }
          : m
      )
    );
  };

  const removeMilestone = (id) => {
    setMilestones(milestones.filter((m) => m.id !== id));
  };

  // --------------------------
  // File Handling
  // --------------------------
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles([...attachedFiles, ...files]);
  };

  const removeFile = (index) => {
    setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    setAttachedFiles([...attachedFiles, ...files]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // --------------------------
  // Submit Handler
  // --------------------------
  const handleSubmit = async () => {
    // Validate required fields
    if (!title || !description || !budgetMin || !budgetMax || !deadline) {
      setAlert({ message: "Please fill in all required fields", type: "error" });
      return;
    }

    if (selectedSkills.length === 0) {
      setAlert({ message: "Please add at least one required skill", type: "error" });
      return;
    }

    try {
      setIsSubmitting(true);

      // Create project first
      const projectData = {
        title,
        description,
        scope: scope.trim() || null,
        budget_min: parseFloat(budgetMin),
        budget_max: parseFloat(budgetMax),
        deadline,
        skills: selectedSkills,
        milestones: milestones.filter(m => m.title && m.due)
      };

      // For admins, don't pass activeRole (backend will check admin status from session)
      // For regular users, pass activeRole or default to 'Client'
      const roleToPass = (user?.primary_role === 'Admin') ? null : (activeRole || 'Client');
      const result = await apiCreateProject(projectData, roleToPass);
      
      if (!result || !result.success) {
        const errorMsg = result?.error || 'Failed to create project';
        console.error('Project creation failed:', result);
        throw new Error(errorMsg);
      }

      const projectId = result.project_id;
      
      if (!projectId) {
        console.error('No project_id returned:', result);
        throw new Error('Project was created but no ID was returned');
      }
      
      console.log('Project created successfully with ID:', projectId);

      // Upload files if any
      if (attachedFiles.length > 0) {
        for (const file of attachedFiles) {
          try {
            await apiUploadFile(file, projectId);
          } catch (uploadErr) {
            console.error('Failed to upload file:', file.name, uploadErr);
            // Continue with other files even if one fails
          }
        }
      }

      // Create milestones if any
      if (milestones.length > 0 && milestones.some(m => m.title && m.due)) {
        // Milestones will be created via add_milestone.php
        // For now, we'll skip this as it requires assignment_id
        // This can be done after a bid is accepted
      }

      // Small delay to ensure project is fully committed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Navigate to project detail page
      navigate(`/project-details/${projectId}`);
    } catch (err) {
      console.error('Failed to create project:', err);
      setAlert({ message: 'Failed to create project: ' + (err.message || 'Unknown error'), type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full p-6 md:p-12 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-2">Create New Project</h1>
      <p className="text-gray-500 mb-6">
        Describe your project and find the perfect contributor
      </p>

      {/* Project Details */}
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Label>Project Title *</Label>
          <Input 
            placeholder="e.g., React Native Mobile App" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onEnter={() => {}} 
          />

          <div className="mt-4">
            <Label>Project Description *</Label>
            <Textarea 
              placeholder="Describe your project..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onEnter={() => {}} 
            />
          </div>

          <div className="mt-4">
            <Label>Project Scope</Label>
            <Textarea 
              placeholder="List the specific deliverables, features, or tasks (one per line or bullet points)..." 
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              allowEnter={true}
              onEnter={() => {}} 
            />
            <p className="text-xs text-gray-500 mt-1">Optional: Specify what needs to be delivered</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="flex-1">
              <Label>Project Type</Label>
              <Select
                placeholder="Select Type"
                onEnter={() => {}}
                options={[
                  "Short Term (1-4 weeks)",
                  "Medium Term (1-3 months)",
                  "Long Term (3+ months)"
                ]}
              />
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Budget & Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Budget & Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Minimum Budget *</Label>
              <Input 
                type="number" 
                placeholder="$1000" 
                value={budgetMin}
                onChange={(e) => {
                  // Only allow numbers and decimal point
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  setBudgetMin(value);
                }}
                onKeyDown={(e) => {
                  // Prevent non-numeric characters
                  if (!/[0-9.]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                onEnter={() => {}} 
              />
            </div>
            <div>
              <Label>Maximum Budget *</Label>
              <Input 
                type="number" 
                placeholder="$5000" 
                value={budgetMax}
                onChange={(e) => {
                  // Only allow numbers and decimal point
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  setBudgetMax(value);
                }}
                onKeyDown={(e) => {
                  // Prevent non-numeric characters
                  if (!/[0-9.]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                onEnter={() => {}} 
              />
            </div>
            <div>
              <Label>Deadline *</Label>
              <Input 
                type="date" 
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                onEnter={() => {}} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Required Skills */}
      <Card>
        <CardHeader>
          <CardTitle>Required Skills *</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Selected Skills ABOVE */}
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedSkills.map((skill) => (
              <Badge
                key={skill}
                removable
                onRemove={() => removeSkill(skill)}
              >
                {skill}
              </Badge>
            ))}
          </div>

          {/* Skill Input */}
          <Input
            placeholder="Add a skill..."
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onEnter={addSkill}
            className="mb-4"
          />

          {/* Recommended Skills BELOW */}
          <div className="flex flex-wrap gap-2">
            {recommendedSkills.map((skill) => (
              <span
                key={skill}
                onClick={() => selectRecommendedSkill(skill)}
                className="px-2 py-1 bg-gray-200 text-xs rounded-md hover:bg-blue-200 cursor-pointer"
              >
                {skill}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* PROJECT MILESTONES */}
      <Card>
        <CardHeader>
          <CardTitle>Project Milestones</CardTitle>
          <p className="text-sm text-gray-500">
            Add the milestones you have in mind for tracking progress
          </p>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {milestones.map((m) => (
              <div
                key={m.id}
                className="border border-gray-200 p-4 rounded-lg bg-gray-50 relative"
              >
                <button
                  onClick={() => removeMilestone(m.id)}
                  className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
                >
                  <X size={16} />
                </button>

                <Label>Milestone Title *</Label>
                <Input
                  value={m.title}
                  onChange={(e) => updateMilestone(m.id, "title", e.target.value)}
                  onEnter={() => {}}
                  placeholder="e.g., Initial Wireframes"
                />

                <div className="mt-3">
                  <Label>Due Date *</Label>
                  <Input
                    type="date"
                    value={m.due}
                    onChange={(e) => updateMilestone(m.id, "due", e.target.value)}
                    onEnter={() => {}}
                  />
                </div>
                
                {/* Deliverables Section */}
                <div className="mt-4">
                  <Label>Deliverables</Label>
                  <p className="text-xs text-gray-500 mb-2">Add required deliverables for this milestone</p>
                  <div className="space-y-2">
                    {(m.deliverables || []).map((deliverable) => (
                      <div key={deliverable.id} className="flex items-center gap-2">
                        <Input
                          value={deliverable.name}
                          onChange={(e) => updateDeliverable(m.id, deliverable.id, "name", e.target.value)}
                          onEnter={() => {}}
                          placeholder="Deliverable name"
                          className="flex-1"
                        />
                        <label className="flex items-center gap-1 text-xs text-gray-600">
                          <input
                            type="checkbox"
                            checked={deliverable.required || false}
                            onChange={(e) => updateDeliverable(m.id, deliverable.id, "required", e.target.checked)}
                          />
                          Required
                        </label>
                        <button
                          type="button"
                          onClick={() => removeDeliverable(m.id, deliverable.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addDeliverableToMilestone(m.id)}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      + Add Deliverable
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={addMilestone}
            className="mt-4 w-full"
          >
            + Add Milestone
          </Button>
        </CardContent>
      </Card>

      {/* Project Attachments */}
      <Card>
        <CardHeader>
          <CardTitle>Project Attachments</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="border-2 border-dashed border-gray-300 p-6 rounded-lg text-center bg-white cursor-pointer hover:border-blue-500 transition"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept=".png,.jpg,.jpeg,.pdf,.doc,.docx,.txt,.zip"
            />
            <UploadCloud className="mx-auto mb-2 text-blue-500" size={28} />
            <p className="text-sm text-gray-500 mb-2">
              Click to upload files or drag and drop
            </p>
            <p className="text-xs text-gray-400">
              PNG, JPG, PDF, DOC, TXT, ZIP up to 10MB each
            </p>
          </div>
          
          {/* File Preview */}
          {attachedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              {attachedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg"
                >
                  <Paperclip className="w-4 h-4 text-blue-500" />
                  <span className="flex-1 text-sm text-gray-700 truncate">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-gray-400 hover:text-red-500 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex gap-2">
          <Button variant="outline">Save as Draft</Button>
          <Button variant="ghost">Preview Project</Button>
        </div>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Project"}
        </Button>
      </div>

      <button
        onClick={() => navigate("/dashboard")}
        className="fixed bottom-6 left-6 flex items-center gap-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-3 px-4 shadow-sm transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
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
