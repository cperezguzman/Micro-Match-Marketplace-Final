import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { apiGetBids } from "../api";
import { useAuth } from "../context/AuthContext";

export default function AdminAllBidsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBids();
  }, []);

  const fetchBids = async () => {
    try {
      setLoading(true);
      // Admins see ALL bids (no filters)
      const data = await apiGetBids({});
      if (data.success && data.bids) {
        setBids(data.bids);
      }
    } catch (err) {
      console.error('Failed to load bids:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Accepted':
        return 'bg-green-100 text-green-700';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'Rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">All Bids</h1>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium py-2 px-4 shadow-sm transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading bids...</div>
        ) : bids.length === 0 ? (
          <div className="text-center py-16 text-gray-500">No bids found.</div>
        ) : (
          <div className="space-y-4">
            {bids.map((bid) => (
              <div
                key={bid.bid_id}
                className="border border-gray-200 rounded-2xl p-6 bg-white hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-2">{bid.project_title || 'Unknown Project'}</h2>
                    <p className="text-sm text-gray-600 mb-2">Contributor: {bid.contributor_name || 'Unknown'}</p>
                    <p className="text-sm text-gray-600 mb-2">Amount: ${bid.amount?.toLocaleString() || 0}</p>
                    <p className="text-sm text-gray-600 mb-2">Timeline: {bid.timeline_days || 0} days</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(bid.status)}`}>
                    {bid.status || 'Unknown'}
                  </span>
                </div>
                {bid.proposal_text && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">{bid.proposal_text}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Submitted: {new Date(bid.created_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => navigate(`/project-details/${bid.project_id}`)}
                    className="text-purple-600 hover:underline font-medium"
                  >
                    View Project →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

