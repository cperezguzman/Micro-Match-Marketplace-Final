import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import RoleSwitcher from '../components/RoleSwitcher';
import { MessageCircle, Loader2, Database, FileText, Users, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FloatingProfileButton from "../components/FloatingProfileButton";
import { apiGetDashboard, apiGetUnreadMessageCount } from '../api';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_projects: 0,
    completed_projects: 0,
    in_progress_projects: 0,
    open_projects: 0,
    total_bids: 0,
    accepted_bids: 0,
    pending_bids: 0,
    total_assignments: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardData, messageData] = await Promise.all([
        apiGetDashboard(),
        apiGetUnreadMessageCount()
      ]);
      
      if (dashboardData.success && dashboardData.stats) {
        setStats(dashboardData.stats);
      }
    } catch (err) {
      console.error("Failed to load admin dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-100 to-white">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-white relative">
      {/* Top Left - Micro-Match Logo */}
      <div className="absolute top-6 left-6 z-10">
        <h1 className="text-2xl font-bold text-purple-600">Micro-Match</h1>
      </div>

      {/* Top Right - Role Switcher */}
      <div className="absolute top-6 right-6 z-10">
        <RoleSwitcher />
      </div>

      {/* Main Content */}
      <main className="p-10 pt-20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-800 mb-8">
            Admin Dashboard
          </h2>
          <p className="text-gray-600 mb-8">Welcome, {user?.name || 'Admin'}. Full administrative access to all marketplace data.</p>

          {/* Admin Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Projects Stats */}
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-4">
                <Database className="w-8 h-8 text-blue-500" />
                <h3 className="text-lg font-semibold text-gray-800">Projects</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-bold text-gray-800">{stats.total_projects}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Open:</span>
                  <span className="font-semibold text-yellow-600">{stats.open_projects}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">In Progress:</span>
                  <span className="font-semibold text-blue-600">{stats.in_progress_projects}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed:</span>
                  <span className="font-semibold text-green-600">{stats.completed_projects}</span>
                </div>
              </div>
              <button
                onClick={() => navigate('/admin/all-projects')}
                className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
              >
                View All Projects
              </button>
            </div>

            {/* Bids Stats */}
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-amber-500">
              <div className="flex items-center justify-between mb-4">
                <FileText className="w-8 h-8 text-amber-500" />
                <h3 className="text-lg font-semibold text-gray-800">Bids</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-bold text-gray-800">{stats.total_bids}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pending:</span>
                  <span className="font-semibold text-yellow-600">{stats.pending_bids}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Accepted:</span>
                  <span className="font-semibold text-green-600">{stats.accepted_bids}</span>
                </div>
              </div>
              <button
                onClick={() => navigate('/admin/all-bids')}
                className="mt-4 w-full bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 transition"
              >
                View All Bids
              </button>
            </div>

            {/* Assignments Stats */}
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-4">
                <Briefcase className="w-8 h-8 text-green-500" />
                <h3 className="text-lg font-semibold text-gray-800">Assignments</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-bold text-gray-800">{stats.total_assignments}</span>
                </div>
              </div>
              <button
                onClick={() => navigate('/admin/all-assignments')}
                className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
              >
                View All Assignments
              </button>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-4">
                <Users className="w-8 h-8 text-purple-500" />
                <h3 className="text-lg font-semibold text-gray-800">Quick Actions</h3>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/create-project')}
                  className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition text-sm"
                >
                  Create Project
                </button>
                <button
                  onClick={() => navigate('/projects')}
                  className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition text-sm"
                >
                  Browse Projects
                </button>
              </div>
            </div>
          </div>

          {/* Admin Information Card */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Administrative Privileges</h3>
            <p className="text-gray-600 mb-4">
              As an administrator, you have full CRUD (Create, Read, Update, Delete) access to all tables in the database:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>View all projects, bids, and assignments</li>
              <li>Delete any project (Admin-only operation)</li>
              <li>Access complete marketplace data</li>
              <li>Full administrative oversight capabilities</li>
            </ul>
          </div>
        </div>
      </main>

      {/* Message Button */}
      <div className="group fixed bottom-6 right-6 z-50">
        <button
          onClick={() => navigate("/messages")}
          className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition flex items-center justify-center"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
        <span className="absolute bottom-14 right-0 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition">
          View Messages
        </span>
      </div>
      
      {/* Profile Button - Bottom Left */}
      <FloatingProfileButton />
    </div>
  );
}

