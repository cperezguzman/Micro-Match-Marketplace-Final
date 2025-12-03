import { User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function FloatingProfileButton() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Normalize URL from network IP to localhost if needed
  const normalizeImageUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    // If URL uses network IP but we're on localhost, convert it
    if (url.includes('10.0.0.157') && window.location.hostname === 'localhost') {
      return url.replace('http://10.0.0.157/backend-php', 'http://localhost/backend-php');
    }
    return url;
  };

  const profilePictureUrl = normalizeImageUrl(user?.profile_picture_url);
  const [imageError, setImageError] = useState(false);

  // Reset error state when profile picture URL changes
  useEffect(() => {
    setImageError(false);
  }, [profilePictureUrl]);

  return (
    <button
      onClick={() => navigate("/profile")}
      className="
        fixed bottom-6 left-6
        w-14 h-14 z-50
        flex items-center justify-center
        rounded-full shadow-lg
        bg-white text-blue-600
        border border-gray-200
        hover:bg-blue-50 hover:shadow-xl
        transition
        overflow-hidden
        p-0
      "
    >
      {profilePictureUrl && !imageError ? (
        <img
          src={profilePictureUrl}
          alt="Profile"
          className="w-full h-full object-cover rounded-full"
          onError={() => {
            setImageError(true);
          }}
        />
      ) : (
        <User className="w-6 h-6" />
      )}
    </button>
  );
}
