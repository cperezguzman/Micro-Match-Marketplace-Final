// src/App.js
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { useAuth } from './context/AuthContext';
// import RoleSwitcher from './components/RoleSwitcher';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import LandingPage from './pages/LandingPage';
import BrowsingPage from './pages/BrowsingPage';
// import ProjectsPage from './pages/ProjectsPage';
import CreateProject from "./pages/CreateProject"; 
import PlaceBid from './pages/PlaceBid';
import DashboardPage from './pages/DashboardPage'; // <- new styled dashboard
import ProjectDetailPage from './pages/ProjectDetailPage';
import ProjectListPage from './pages/ProjectListPage';
import NotificationPage from './pages/NotificationPage';
import OnboardingPage from './pages/Onboarding';
import MessagePage from './pages/MessagePage';
import AssignmentPage from './pages/AssignmentPage';
import MilestoneDetailPage from './pages/MilestoneDetailPage';
import FinalizeProjectPage from './pages/FinalizeProjectPage';
import ErrorPage from './pages/ErrorPage';
import ProfilePage from './pages/ProfilePage';
import ContributorAssignmentsPage from "./pages/ContributorAssignmentPage";
import MilestoneSubmitPage from "./pages/MilestoneSubmissionPage";
import CompletedProjectsPage from "./pages/CompletedProjectsPage";
import AdminAllProjectsPage from "./pages/AdminAllProjectsPage";
import AdminAllBidsPage from "./pages/AdminAllBidsPage";
import AdminAllAssignmentsPage from "./pages/AdminAllAssignmentsPage";



function ProtectedRoute({ children }) {
  const { user, initializing } = useAuth();

  // While checking session, show loading state
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking session...</p>
        </div>
      </div>
    );
  }

  // If not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" />;
  }

  // User is authenticated, render children
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Navigate to="/landing" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/error" element={<ErrorPage />} />

        {/* Protected routes */}
        <Route path="/projects" element={<ProtectedRoute><BrowsingPage /></ProtectedRoute>} />
        <Route path="/create-project" element={<ProtectedRoute><CreateProject /></ProtectedRoute>} />
        <Route path="/place-bid/:projectId" element={<ProtectedRoute><PlaceBid /></ProtectedRoute>} />
        <Route path="/bids" element={<ProtectedRoute><ProjectListPage /></ProtectedRoute>} />
        <Route path="/project-details/:projectId" element={<ProtectedRoute><ProjectDetailPage /></ProtectedRoute>} />
        <Route path="/my-bids" element={<ProtectedRoute><ProjectListPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationPage /></ProtectedRoute>} />
        <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><MessagePage /></ProtectedRoute>} />
        <Route path="/assignment" element={<ProtectedRoute><AssignmentPage /></ProtectedRoute>} />
        <Route path="/milestone/:projectId/:milestoneId" element={<ProtectedRoute><MilestoneDetailPage /></ProtectedRoute>} />
        <Route path="/finalize/:projectId" element={<ProtectedRoute><FinalizeProjectPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/contributor-assignments" element={<ProtectedRoute><ContributorAssignmentsPage /></ProtectedRoute>} />
        <Route path="/milestone-submit/:projectId/:milestoneId" element={<ProtectedRoute><MilestoneSubmitPage /></ProtectedRoute>} />
        <Route path="/completed-projects" element={<ProtectedRoute><CompletedProjectsPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        
        {/* Admin routes */}
        <Route path="/admin/all-projects" element={<ProtectedRoute><AdminAllProjectsPage /></ProtectedRoute>} />
        <Route path="/admin/all-bids" element={<ProtectedRoute><AdminAllBidsPage /></ProtectedRoute>} />
        <Route path="/admin/all-assignments" element={<ProtectedRoute><AdminAllAssignmentsPage /></ProtectedRoute>} />

        {/* catch-all for unknown routes */}
        <Route path="*" element={<ErrorPage />} />  
      </Routes>
    </Router>
  );
}

export default App;
