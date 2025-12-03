// src/pages/OnboardingWizard.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, BadgeCheck, User, Wrench, Plus, X, Upload, Image as ImageIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiUpdateProfile, apiUploadFile } from "../api";
import CustomAlert from "../components/CustomAlert";

// Skill-chip UI
function SkillChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 text-sm bg-white">
      <Wrench className="w-3.5 h-3.5 text-blue-600" />
      {label}
      {onRemove && (
        <button onClick={onRemove} className="rounded-full p-0.5 hover:bg-gray-100">
          <X className="w-3.5 h-3.5 text-gray-500" />
        </button>
      )}
    </span>
  );
}

export default function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState(null);
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState("");
  const [experience, setExperience] = useState(null);
  const [bio, setBio] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);

  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const next = () => setStep((s) => Math.min(s + 1, 5));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const addSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
      setNewSkill("");
    }
  };

  const removeSkill = (label) => {
    setSkills((prev) => prev.filter((s) => s !== label));
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

  const canProceedFromStep = () => {
    if (step === 1) return role !== null;
    if (step === 2) return true; // Skills are now optional
    if (step === 3) return experience !== null;
    if (step === 4) return true; // Bio and profile picture are optional
    return true;
  };

  const handleFinish = async () => {
    if (!role) {
      setAlert({ message: "Please select a role.", type: "error" });
      return;
    }
    if (!experience) {
      setAlert({ message: "Please select experience level.", type: "error" });
      return;
    }

    try {
      setSubmitting(true);

      // Upload profile picture if provided
      let profilePictureUrl = null;
      if (profilePicture) {
        try {
          const uploadResult = await apiUploadFile(profilePicture, null, true);
          if (uploadResult.success && uploadResult.url) {
            profilePictureUrl = uploadResult.url;
          }
        } catch (err) {
          console.error("Failed to upload profile picture:", err);
          // Continue without profile picture
        }
      }

      // Update profile in backend
      const profileData = {
        primary_role: role,
        experience_level: experience,
        skills: skills,
        bio: bio || null
      };
      
      // Only include profile_picture_url if we have one
      if (profilePictureUrl) {
        profileData.profile_picture_url = profilePictureUrl;
      }

      console.log("Onboarding profile data:", profileData); // Debug
      const result = await apiUpdateProfile(profileData);
      
      if (result.success) {
    // Update user info in AuthContext
    setUser((prev) => ({
      ...prev,
          activeRole: role,
      skills: skills,
      experienceLevel: experience,
          bio: bio,
          profile_picture_url: profilePictureUrl,
      needsOnboarding: false,
    }));

    navigate("/dashboard");
      } else {
        setAlert({ message: result.error || "Failed to save profile. Please try again.", type: "error" });
      }
    } catch (err) {
      console.error("Failed to complete onboarding:", err);
      setAlert({ message: "Failed to complete onboarding. Please try again.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-white text-gray-900 min-h-screen py-8">
      <div className="w-full max-w-4xl p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
        {/* Progress Steps */}
        <ol className="flex justify-between items-center mb-10 space-x-3">
          {[
            { label: "Choose Role" },
            { label: "Add Skills" },
            { label: "Experience" },
            { label: "Profile" },
            { label: "Confirm" },
          ].map((s, i) => {
            const idx = i + 1;
            const isActive = step === idx;
            const isDone = step > idx;
            return (
              <li
                key={idx}
                className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 border text-center ${
                  isActive || isDone
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-700"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : isDone
                      ? "bg-blue-400 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {idx}
                </span>
                <span className="text-sm font-medium">{s.label}</span>
              </li>
            );
          })}
        </ol>

        {/* Step 1: Choose Role */}
        {step === 1 && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <button
              onClick={() => setRole("Client")}
              className={`text-left p-6 rounded-2xl border transition cursor-pointer ${
                role === "Client"
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-200 hover:border-blue-400"
              }`}
            >
              <div className="flex items-center gap-3 mb-1">
                <BadgeCheck className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Client</h3>
              </div>
              <p className="text-sm text-gray-600">
                Post projects, review bids, manage payments and milestones.
              </p>
            </button>

            <button
              onClick={() => setRole("Contributor")}
              className={`text-left p-6 rounded-2xl border transition cursor-pointer ${
                role === "Contributor"
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-200 hover:border-blue-400"
              }`}
            >
              <div className="flex items-center gap-3 mb-1">
                <User className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Contributor</h3>
              </div>
              <p className="text-sm text-gray-600">
                Find work, place bids, deliver milestones, and earn.
              </p>
            </button>
          </section>
        )}

        {/* Step 2: Add Skills (Optional) */}
        {step === 2 && (
          <section className="rounded-2xl border border-gray-200 p-6 mb-8">
            <h4 className="font-semibold mb-2">Add Skills (Optional)</h4>
            <p className="text-sm text-gray-500 mb-4">You can add skills now or skip this step.</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {skills.map((s) => (
                <SkillChip key={s} label={s} onRemove={() => removeSkill(s)} />
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500"
                placeholder="Type a skill and press Add or Enter"
              />
              <button
                onClick={addSkill}
                className="rounded-xl border border-gray-200 px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
          </section>
        )}

        {/* Step 3: Experience (Required) */}
        {step === 3 && (
          <section className="rounded-2xl border border-gray-200 p-6 mb-8">
            <h4 className="font-semibold mb-4">Select Experience Level *</h4>
            <div className="flex flex-col gap-3">
              {["Student / Junior", "Intermediate", "Senior / Experienced"].map((exp) => (
                <label key={exp} className="flex items-center gap-2 p-4 border rounded-xl hover:border-blue-400 cursor-pointer">
                  <input
                    type="radio"
                    name="experience"
                    value={exp}
                    checked={experience === exp}
                    onChange={() => setExperience(exp)}
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span className="text-sm">{exp}</span>
                </label>
              ))}
            </div>
          </section>
        )}

        {/* Step 4: Profile Picture & Bio (Optional) */}
        {step === 4 && (
          <section className="rounded-2xl border border-gray-200 p-6 mb-8 space-y-6">
            <div>
              <h4 className="font-semibold mb-2">Profile Picture (Optional)</h4>
              <div className="flex items-center gap-6">
                <div className="relative">
                  {profilePicturePreview ? (
                    <img
                      src={profilePicturePreview}
                      alt="Profile preview"
                      className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Upload Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="hidden"
                  />
                </label>
                {profilePicture && (
                  <button
                    onClick={() => {
                      setProfilePicture(null);
                      setProfilePicturePreview(null);
                    }}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Bio / About (Optional)</h4>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500 resize-none"
                rows={4}
                placeholder="Tell us about yourself..."
              />
            </div>
          </section>
        )}

        {/* Step 5: Confirm */}
        {step === 5 && (
          <section className="rounded-2xl border border-gray-200 p-6 mb-8">
            <h4 className="font-semibold mb-4">Confirm Selection</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500 mb-1">Role</p>
                <p className="font-medium">{role || "—"}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500 mb-1">Experience Level</p>
                <p className="font-medium">{experience || "—"}</p>
              </div>
              {skills.length > 0 && (
                <div className="rounded-2xl border border-gray-200 p-4 md:col-span-2">
                  <p className="text-xs text-gray-500 mb-1">Skills</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {skills.map((s) => (
                    <SkillChip key={s} label={s} />
                  ))}
                </div>
              </div>
              )}
              {bio && (
                <div className="rounded-2xl border border-gray-200 p-4 md:col-span-2">
                  <p className="text-xs text-gray-500 mb-1">Bio</p>
                  <p className="text-sm">{bio}</p>
              </div>
              )}
            </div>
          </section>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-end gap-3">
          {step > 1 && (
            <button
              onClick={back}
              disabled={submitting}
              className="border border-gray-300 text-gray-800 px-6 py-3 rounded-xl text-md font-medium hover:bg-gray-100 transition"
            >
              Back
            </button>
          )}
          {step < 5 && (
            <button
              onClick={next}
              disabled={!canProceedFromStep() || submitting}
              className={`px-6 py-3 rounded-xl text-md font-medium flex items-center gap-2 transition ${
                canProceedFromStep() && !submitting
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          {step === 5 && (
            <button
              onClick={handleFinish}
              disabled={submitting}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl text-md font-medium hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Finish"}
            </button>
          )}
        </div>
      </div>
      <button
        onClick={() => navigate("/register")}
        className="fixed bottom-6 left-6 flex items-center gap-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-3 px-4 shadow-sm transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Registration
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
