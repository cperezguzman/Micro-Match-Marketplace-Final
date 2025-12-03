// src/pages/BrowsingPage.jsx
import React, { useState, useEffect } from "react";
import { Search, SlidersHorizontal, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { apiGetProjects } from "../api";
import { useAuth } from "../context/AuthContext";
import { format } from "date-fns";

function Tag({ children }) {
  return (
    <span className="text-xs bg-gray-100 text-gray-800 rounded px-2 py-1">
      {children}
    </span>
  );
}

function StatusBadge({ status }) {
  const label = status === "long term" ? "Long Term" : "Short Term";
  const color =
    status === "long term"
      ? "bg-purple-100 text-purple-700"
      : "bg-yellow-100 text-yellow-700";
  return (
    <span className={`text-xs rounded px-2 py-1 ${color}`}>{label}</span>
  );
}

function ProjectCard({ project }) {
  return (
    <div className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm flex flex-col">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900 text-sm truncate w-2/3">
          {project.title}
        </h3>
        <div className="flex gap-1">
          <span className="text-green-700 text-xs bg-green-100 rounded px-2 py-1">
            open
          </span>
          <StatusBadge status={project.type} />
        </div>
      </div>
      <p className="text-sm text-gray-600 leading-snug line-clamp-2 mb-3">
        {project.description}
      </p>
      <div className="flex items-center text-sm text-gray-700 mb-2">
        <span className="font-medium mr-1">{project.client.initials}</span>{" "}
        {project.client.name} ★ {project.client.rating}
      </div>
      <div className="text-sm text-gray-500 mb-2">{project.budget}</div>
      <div className="text-sm text-gray-500 mb-2">Due {project.dueDate}</div>
      <div className="text-sm text-gray-500 mb-2">{project.location}</div>
      <div className="text-sm text-gray-500 mb-2">{project.bids} bids</div>
      <div className="flex flex-wrap gap-2 mb-2">
        {project.tags.map((tag, i) => (
          <Tag key={i}>{tag}</Tag>
        ))}
      </div>
      <p className="text-xs text-gray-400 mb-2">
        Posted {project.postedDate}
      </p>
      <Link to={`/place-bid/${project.id}`}>
        <button className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          Submit Bid
        </button>
      </Link>
    </div>
  );
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      // Admins see all projects (no filter)
      const isAdmin = user?.primary_role === 'Admin';
      const data = await apiGetProjects(isAdmin ? {} : { status: 'Open' });
      if (data.success && data.projects) {
        // Transform backend format to UI format
        // Filter out user's own projects if they're in contributor mode (but not if admin)
        const filtered = data.projects.filter(p => {
          // Admins can see everything
          if (isAdmin) {
            return true;
          }
          // If user is in contributor mode, hide their own projects
          if (user?.activeRole === 'Contributor' && p.client_id === user?.user_id) {
            return false;
          }
          return true;
        });
        const transformed = filtered.map(p => {
          // Get client initials
          const clientName = p.client_name || '';
          const initials = clientName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
          
          // Format budget
          const budget = p.budget_min === p.budget_max 
            ? `$${p.budget_min.toLocaleString()}`
            : `$${p.budget_min.toLocaleString()} – $${p.budget_max.toLocaleString()}`;
          
          // Format dates
          const dueDate = p.deadline ? format(new Date(p.deadline), 'MMM d, yyyy') : '';
          const postedDate = p.created_at ? format(new Date(p.created_at), 'MMM d, yyyy') : '';
          
          // Determine project type (simplified - could be based on timeline)
          const daysDiff = p.deadline ? Math.ceil((new Date(p.deadline) - new Date(p.created_at)) / (1000 * 60 * 60 * 24)) : 0;
          const type = daysDiff > 60 ? 'long term' : 'short term';
          
          // Parse description to remove [SCOPE] and [MILESTONES] markers
          const rawDescription = p.description || '';
          const cleanDescription = rawDescription.split(/\[SCOPE\]|\[MILESTONES\]/)[0].trim();
          
          return {
            id: p.project_id.toString(),
            title: p.title,
            description: cleanDescription,
            client: {
              name: clientName,
              initials,
              rating: 4.8, // Default rating - could fetch from user table
            },
            budget,
            dueDate,
            postedDate,
            location: "Remote", // Default
            bids: p.bid_count || 0,
            tags: [], // Will be populated from skills
            type,
            projectData: p // Keep original for reference
          };
        });
        
        // Fetch skills for each project
        // Note: This could be optimized by joining in the backend query
        setProjects(transformed);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-gray-50 p-6 min-h-screen">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold">Project Marketplace</h1>
        <p className="text-sm text-gray-600">
          Discover exciting projects and showcase your skills
        </p>
      </div>

      {/* Search Bar & Filters */}
      <div className="bg-white border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-sm font-semibold text-gray-700">
            <Search className="w-4 h-4 mr-2" /> Search Projects
          </div>
          <button className="flex items-center text-sm text-gray-700 border rounded px-3 py-1 hover:bg-gray-100">
            <SlidersHorizontal className="w-4 h-4 mr-1" /> Filters
          </button>
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="Search projects by title or description..."
        />
      </div>

      {/* Header / Controls */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">{filteredProjects.length} Projects Found</h2>
        <select className="border border-gray-300 rounded px-2 py-1 text-sm">
          <option>Newest</option>
          <option>Deadline</option>
          <option>Budget</option>
          <option>Most Bids</option>
        </select>
      </div>

      {/* Project Grid */}
      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading projects...</div>
      ) : (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
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