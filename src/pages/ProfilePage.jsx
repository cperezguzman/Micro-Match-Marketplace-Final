"use client";
import { useState, useEffect } from "react";
import { ArrowLeft, Edit2, Save, X, Upload, Image as ImageIcon, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiGetProfile, apiUpdateProfile, apiUploadFile } from "../api";
import CustomAlert from "../components/CustomAlert";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user: authUser, setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState(null);
  
  // Edit state
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editSkills, setEditSkills] = useState([]);
  const [newSkill, setNewSkill] = useState("");
  const [editExperience, setEditExperience] = useState(null);
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      setProfilePicturePreview(null); // Reset preview when fetching
      const data = await apiGetProfile();
      console.log("Profile API response:", data); // Debug log
      if (data.success && data.user) {
        setProfile(data.user);
        setEditName(data.user.name || "");
        setEditBio(data.user.bio || "");
        setEditSkills(data.user.skills || []);
        setEditExperience(data.user.experience_level || null);
        // Set profile picture preview from database
        if (data.user.profile_picture_url) {
          setProfilePicturePreview(data.user.profile_picture_url);
        } else {
          setProfilePicturePreview(null);
        }
      } else if (data.error) {
        console.error("Profile API error:", data.error, data);
        setError(data.error);
        setProfile(null);
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
      setError(err.message || "Failed to load profile");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
    setEditName(profile?.name || "");
    setEditBio(profile?.bio || "");
    setEditSkills(profile?.skills || []);
    setEditExperience(profile?.experience_level || null);
    if (profile?.profile_picture_url) {
      setProfilePicturePreview(profile.profile_picture_url);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setProfilePicture(null);
    setProfilePicturePreview(profile?.profile_picture_url || null);
  };

  const addSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !editSkills.includes(trimmed)) {
      setEditSkills([...editSkills, trimmed]);
      setNewSkill("");
    }
  };

  const removeSkill = (skill) => {
    setEditSkills(editSkills.filter(s => s !== skill));
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Upload profile picture if changed
      let profilePictureUrl = profile?.profile_picture_url || null;
      if (profilePicture) {
        try {
          const uploadResult = await apiUploadFile(profilePicture, null, true);
          console.log("Upload result:", uploadResult); // Debug
          if (uploadResult.success && uploadResult.url) {
            profilePictureUrl = uploadResult.url;
            console.log("Profile picture URL set to:", profilePictureUrl); // Debug
          } else {
            console.error("Upload failed or no URL returned:", uploadResult);
          }
        } catch (err) {
          console.error("Failed to upload profile picture:", err);
          setAlert({ message: "Failed to upload profile picture. Please try again.", type: "error" });
          setSaving(false);
          return;
        }
      }

      // Update profile - only include profile_picture_url if it's not null
      const profileData = {
        name: editName,
        bio: editBio,
        skills: editSkills
      };
      
      // Only include profile_picture_url if we have a value (either new or existing)
      if (profilePictureUrl) {
        profileData.profile_picture_url = profilePictureUrl;
      }
      
      // Include experience level if set
      if (editExperience) {
        profileData.experience_level = editExperience;
      }

      console.log("Sending profile data:", profileData); // Debug
      const result = await apiUpdateProfile(profileData);
      console.log("Update profile result:", result); // Debug
      
      if (result.success) {
        // Refresh profile
        await fetchProfile();
        setEditing(false);
        setProfilePicture(null); // Clear the file input
        
        // Update auth context
        setUser((prev) => ({
          ...prev,
          name: editName,
          bio: editBio,
          skills: editSkills,
          experienceLevel: editExperience,
          profile_picture_url: profilePictureUrl || prev.profile_picture_url
        }));
      } else {
        console.error("Profile update failed:", result);
        setAlert({ message: result.error || "Failed to save profile", type: "error" });
      }
    } catch (err) {
      console.error("Failed to save profile:", err);
      setAlert({ message: `Failed to save profile: ${err.message || "Please try again."}`, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile && !loading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Profile not found</p>
          {error && (
            <p className="text-sm text-red-600">Error: {error}</p>
          )}
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const isOwnProfile = authUser?.user_id === profile.user_id;
  const displayName = editing ? editName : profile.name;
  const displayBio = editing ? editBio : (profile.bio || "No bio yet.");
  const displaySkills = editing ? editSkills : (profile.skills || []);
  
  // Convert URL from network IP to localhost if needed (for local development)
  const normalizeImageUrl = (url) => {
    if (!url) return null;
    // If URL uses network IP but we're on localhost, convert it
    if (url.includes('10.0.0.157') && window.location.hostname === 'localhost') {
      return url.replace('http://10.0.0.157/backend-php', 'http://localhost/backend-php');
    }
    return url;
  };
  
  // Use profile_picture_url from database if available, otherwise use preview (for editing), otherwise default
  const dbPictureUrl = normalizeImageUrl(profile.profile_picture_url);
  const displayPicture = dbPictureUrl || profilePicturePreview || "https://i.pravatar.cc/120?img=3";
  
  // Debug log
  if (profile.profile_picture_url) {
    console.log("Profile picture URL from DB:", profile.profile_picture_url);
    console.log("Normalized URL:", dbPictureUrl);
    console.log("Display picture:", displayPicture);
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 text-gray-900 flex justify-center">
      <div className="w-full max-w-[1200px] px-6 md:px-20 py-8 md:py-16 space-y-6 md:space-y-10">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Header */}
        <div className="flex items-center gap-6">
          <div className="relative">
          <img
              src={displayPicture}
            alt="Avatar"
              className="w-28 h-28 rounded-full border-4 border-white shadow-sm object-cover"
          />
            {editing && (
              <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition">
                <Upload className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
          <div className="flex-1">
            {editing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-3xl font-bold border-b-2 border-blue-500 outline-none bg-transparent w-full"
                placeholder="Your name"
              />
            ) : (
              <h1 className="text-3xl font-bold">{displayName}</h1>
            )}
            <p className="text-gray-600 text-base">
              {profile.primary_role} · {profile.email}
            </p>
            {editing ? (
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
                <select
                  value={editExperience || ""}
                  onChange={(e) => setEditExperience(e.target.value || null)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1 outline-none focus:border-blue-500"
                >
                  <option value="">Select experience level</option>
                  <option value="Student / Junior">Student / Junior</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Senior / Experienced">Senior / Experienced</option>
                </select>
              </div>
            ) : (
              profile.experience_level && (
                <p className="text-sm text-gray-500 mt-1">{profile.experience_level}</p>
              )
            )}
          </div>
          {isOwnProfile && !editing && (
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </button>
          )}
          {editing && (
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>

        {/* Bio & Skills */}
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-xl font-semibold">About</h2>
          {editing ? (
            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500 resize-none"
              rows={4}
              placeholder="Tell us about yourself..."
            />
          ) : (
            <p className="text-gray-600 leading-relaxed">{displayBio}</p>
          )}
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Skills</h3>
              {editing && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1 outline-none focus:border-blue-500"
                    placeholder="Add skill"
                  />
                  <button
                    onClick={addSkill}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              {displaySkills.length > 0 ? (
                displaySkills.map((skill) => (
              <span
                key={skill}
                    className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full flex items-center gap-2"
              >
                {skill}
                    {editing && (
                      <button
                        onClick={() => removeSkill(skill)}
                        className="hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
              </span>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">No skills added yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Reviews & Portfolio - Show all content (no tabs) */}
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-8">
          {/* Reviews Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Reviews</h2>
            {profile.reviews && profile.reviews.length > 0 ? (
              <div className="space-y-4">
                {profile.reviews.map((r) => (
                  <div
                    key={r.review_id}
                    className="border border-gray-200 p-5 rounded-lg bg-gray-50 space-y-2"
                  >
                    <p className="text-gray-700">"{r.comment}"</p>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>— {r.reviewer_name}</span>
                      <span>{"⭐".repeat(r.rating)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No reviews yet</p>
            )}
            </div>

          {/* Portfolio Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Portfolio</h2>
            {profile.portfolio && profile.portfolio.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profile.portfolio.map((p) => (
                  <div
                    key={p.project_id}
                    className="border border-gray-200 rounded-lg p-5 bg-gray-50 hover:bg-gray-100 transition cursor-pointer"
                    onClick={() => navigate(`/project-details/${p.project_id}`)}
                  >
                    <div className="text-4xl mb-3">📁</div>
                    <h3 className="font-medium text-gray-900">{p.title}</h3>
                    <p className="text-gray-600 text-sm mt-1 line-clamp-2">{p.description}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      Completed {new Date(p.completed_at || p.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No completed projects yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
