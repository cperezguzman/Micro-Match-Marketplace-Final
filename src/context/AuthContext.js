// src/context/AuthContext.js
import { createContext, useContext, useState, useEffect } from 'react';
import { apiLogin, apiLogout, apiMe, apiRegister } from '../api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [activeRole, setActiveRole] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // On mount, check if user is already logged in via session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const data = await apiMe();
        if (data.logged_in) {
          const userData = {
            user_id: data.user_id,
            name: data.name,
            primary_role: data.primary_role,
            email: data.email || '',
            profile_picture_url: data.profile_picture_url || null,
          };
          setUser(userData);
          
          // Restore activeRole from localStorage if available, otherwise use primary_role
          const savedRole = localStorage.getItem('activeRole');
          if (savedRole && (savedRole === 'Client' || savedRole === 'Contributor')) {
            setActiveRole(savedRole);
          } else {
            setActiveRole(data.primary_role);
          }
        }
      } catch (err) {
        // Session check failed or not logged in - that's okay
        console.log("No active session");
      } finally {
        setInitializing(false);
      }
    };

    checkSession();
  }, []);

  /**
   * Login with email and password
   * Calls backend API and sets user + activeRole on success
   * Returns true on success, throws on error
   */
  const login = async (email, password) => {
    const data = await apiLogin(email, password);
    if (data.success && data.user) {
      const userData = {
        user_id: data.user.user_id,
        name: data.user.name,
        primary_role: data.user.primary_role,
        email: data.user.email,
        profile_picture_url: data.user.profile_picture_url || null,
        activeRole: data.user.primary_role, // Also store activeRole in user object for convenience
      };
      setUser(userData);
      
      // Restore activeRole from localStorage if available, otherwise use primary_role
      const savedRole = localStorage.getItem('activeRole');
      if (savedRole && (savedRole === 'Client' || savedRole === 'Contributor')) {
        setActiveRole(savedRole);
      } else {
        setActiveRole(data.user.primary_role);
      }
      return true;
    }
    throw new Error("Login failed");
  };

  /**
   * Register new user - calls backend API and auto-logs in
   */
  const register = async (name, email, password, primaryRole = "Client") => {
    const data = await apiRegister(name, email, password, primaryRole);
    if (data.success && data.user) {
      const userData = {
        user_id: data.user.user_id,
        name: data.user.name,
        primary_role: data.user.primary_role,
        email: data.user.email,
        needsOnboarding: true,
      };
      setUser(userData);
      setActiveRole(data.user.primary_role);
      return true;
    }
    throw new Error("Registration failed");
  };

  /**
   * Logout - clears session on backend and resets local state
   */
  const logout = async () => {
    try {
      await apiLogout();
    } catch (err) {
      console.log("Logout API error:", err);
    }
    setUser(null);
    setActiveRole(null);
    // Clear saved role from localStorage
    localStorage.removeItem('activeRole');
  };

  /**
   * Complete onboarding flag
   */
  const completeOnboarding = () => {
    setUser((prev) => ({ ...prev, needsOnboarding: false }));
  };

  /**
   * Switch role (UI-only, no backend call)
   * Updates the activeRole for theming/display purposes
   */
  const switchRole = (newRole) => {
    setActiveRole(newRole);
    // Persist to localStorage
    localStorage.setItem('activeRole', newRole);
    // Also update user.activeRole for components that read from user object
    setUser((prev) => prev ? { ...prev, activeRole: newRole } : prev);
  };

  // Build the user object with activeRole included for convenience
  const userWithActiveRole = user ? { ...user, activeRole: activeRole || user.primary_role } : null;

  return (
    <AuthContext.Provider 
      value={{ 
        user: userWithActiveRole, 
        activeRole: activeRole || user?.primary_role || null,
        initializing,
        login, 
        setUser, 
        register, 
        logout, 
        switchRole, 
        completeOnboarding 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
