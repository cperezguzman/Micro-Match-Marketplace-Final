import React, { useState, useRef, useEffect } from "react";
import { Paperclip, Send, ArrowLeft, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiGetConversations, apiGetMessages, apiSendMessage, apiUploadFile } from "../api";
import { useAuth } from "../context/AuthContext";

// Component to render message body with file attachments
function MessageBody({ body }) {
  // Normalize URL from network IP to localhost if needed
  const normalizeUrl = (url) => {
    if (!url || typeof url !== 'string') return url;
    // If URL uses network IP but we're on localhost, convert it
    if (url.includes('10.0.0.157') && window.location.hostname === 'localhost') {
      return url.replace('http://10.0.0.157/backend-php', 'http://localhost/backend-php');
    }
    return url;
  };

  if (!body) return null;
  
  // Parse file links in format [File: filename](url)
  const fileRegex = /\[File: ([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = fileRegex.exec(body)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: body.substring(lastIndex, match.index)
      });
    }
    // Add the file link
    parts.push({
      type: 'file',
      filename: match[1],
      url: normalizeUrl(match[2])
    });
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < body.length) {
    parts.push({
      type: 'text',
      content: body.substring(lastIndex)
    });
  }
  
  // If no file links found, just return the text
  if (parts.length === 0) {
    return <p>{body}</p>;
  }
  
  return (
    <div>
      {parts.map((part, i) => {
        if (part.type === 'text') {
          return <p key={i}>{part.content}</p>;
        } else {
          return (
            <a
              key={i}
              href={part.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 mt-2 p-2 bg-white border border-gray-200 rounded-lg text-blue-600 hover:bg-gray-50 transition"
            >
              <Paperclip className="w-4 h-4" />
              <span className="text-sm truncate">{part.filename}</span>
            </a>
          );
        }
      })}
    </div>
  );
}

export default function MessagePage() {
  const navigate = useNavigate();
  const { activeRole } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Track if this is the initial load
  const isInitialLoad = React.useRef(true);
  
  // Fetch conversations on mount and when role changes
  useEffect(() => {
    isInitialLoad.current = true;
    fetchConversations();
    // Reset selection when role changes
    setActiveProjectId(null);
    setMessages([]);
    
    // Poll for new conversations every 5 seconds (silent update)
    const interval = setInterval(() => {
      isInitialLoad.current = false;
      fetchConversationsSilent();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [activeRole]);
  
  // Silent fetch that only updates if data changed
  const fetchConversationsSilent = async () => {
    try {
      const data = await apiGetConversations(activeRole);
      if (data.success && data.conversations) {
        setConversations(prevConversations => {
          // Only update if conversations actually changed
          if (JSON.stringify(prevConversations) !== JSON.stringify(data.conversations)) {
            return data.conversations;
          }
          return prevConversations;
        });
      }
    } catch (err) {
      // Silent fail for polling
      console.error("Failed to poll conversations:", err);
    }
  };

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (activeProjectId) {
      fetchMessages(activeProjectId);
      
      // Poll for new messages every 3 seconds (silent update)
      const interval = setInterval(() => {
        fetchMessagesSilent(activeProjectId);
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [activeProjectId]);
  
  // Silent fetch that only updates if messages changed
  const fetchMessagesSilent = async (projectId) => {
    try {
      const data = await apiGetMessages(projectId);
      if (data.success && data.messages) {
        setMessages(prevMessages => {
          // Only update if messages actually changed
          if (JSON.stringify(prevMessages) !== JSON.stringify(data.messages)) {
            return data.messages;
          }
          return prevMessages;
        });
      }
    } catch (err) {
      // Silent fail for polling
      console.error("Failed to poll messages:", err);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      // Pass the active role to filter conversations
      const data = await apiGetConversations(activeRole);
      if (data.success && data.conversations) {
        setConversations(data.conversations);
        // Auto-select first conversation if none selected
        if (data.conversations.length > 0 && !activeProjectId) {
          setActiveProjectId(data.conversations[0].project_id);
        }
      }
    } catch (err) {
      setError("Failed to load conversations");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (projectId) => {
    try {
      setLoadingMessages(true);
      const data = await apiGetMessages(projectId);
      if (data.success && data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const activeConversation = conversations.find(c => c.project_id === activeProjectId);

  // --- Send message ---
  const handleSend = async () => {
    if (newMessage.trim() === "" && attachedFiles.length === 0) return;
    if (!activeProjectId) return;

    try {
      setSending(true);
      
      // Upload files first
      const uploadedAttachments = [];
      for (const file of attachedFiles) {
        try {
          const uploadResult = await apiUploadFile(file, activeProjectId);
          if (uploadResult.success) {
            uploadedAttachments.push({
              url: uploadResult.url,
              filename: uploadResult.filename || file.name
            });
          }
        } catch (uploadErr) {
          console.error("Failed to upload file:", file.name, uploadErr);
        }
      }
      
      // Send message with attachments
      const data = await apiSendMessage(activeProjectId, newMessage.trim(), uploadedAttachments);
      
      if (data.success) {
        // Build message body for display
        let displayBody = newMessage.trim();
        if (uploadedAttachments.length > 0) {
          const attachmentText = uploadedAttachments.map(a => `[File: ${a.filename}](${a.url})`).join('\n');
          displayBody = displayBody + (displayBody ? '\n' : '') + attachmentText;
        }
        
        // Optimistically add message to UI
        const newMsg = {
          message_id: data.message_id,
          body: displayBody,
          created_at: new Date().toISOString(),
          sender_name: "Me",
          is_mine: 1
        };
        setMessages(prev => [...prev, newMsg]);
    setNewMessage("");
    setAttachedFiles([]);
        
        // Refresh conversations to update last message
        fetchConversations();
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setError("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  // --- Handle Enter ---
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- File attach logic ---
  const handleAttachClick = () => fileInputRef.current.click();
  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setAttachedFiles((prev) => [...prev, ...newFiles]);
    e.target.value = null;
  };

  const removeFile = (index) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white text-gray-900">
      {/* Sidebar */}
      <aside className="w-80 border-r border-gray-200 bg-gray-50 p-4 flex flex-col">
        <h2 className="text-lg font-semibold mb-4">Messages</h2>
        
        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}
        
        <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              No conversations yet
            </p>
          ) : (
            conversations.map((conv, index) => (
            <button
                key={`${conv.project_id}-${conv.other_party_id || index}`}
                onClick={() => setActiveProjectId(conv.project_id)}
              className={`p-4 text-left rounded-xl transition ${
                  conv.project_id === activeProjectId
                  ? "bg-blue-50 border border-blue-200"
                    : conv.can_message === false
                    ? "bg-gray-50 border border-transparent opacity-75"
                  : "bg-white hover:bg-gray-100 border border-transparent"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{conv.other_party_name || "Unknown"}</span>
                  <div className="flex items-center gap-2">
                    {conv.bid_status && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        conv.bid_status === 'Accepted' ? 'bg-green-100 text-green-700' :
                        conv.bid_status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {conv.bid_status}
                      </span>
                    )}
                    {conv.unread_count > 0 && (
                  <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                        {conv.unread_count}
                  </span>
                )}
              </div>
                </div>
                <p className="text-sm text-gray-600 truncate">
                  {conv.last_message || "No messages yet"}
                </p>
                <p className="text-xs text-gray-400 mt-1">{conv.project_title}</p>
            </button>
            ))
          )}
        </div>

        <button
          onClick={() => navigate("/dashboard")}
          className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-3 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
      </aside>

      {/* Chat Section */}
      <main className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
        {/* Chat Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
                <h3 className="font-semibold text-lg">
                  {activeConversation.other_party_name || "Unknown"}
                </h3>
                <p className="text-sm text-gray-500">
                  Project: {activeConversation.project_title}
                </p>
          </div>
        </div>

        {/* Chat Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingMessages ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No messages yet. Start the conversation!
                </p>
              ) : (
                messages.map((msg) => (
            <div
                    key={msg.message_id}
                    className={`flex ${msg.is_mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs md:max-w-md p-4 rounded-2xl ${
                        msg.is_mine ? "bg-blue-50 text-gray-800" : "bg-gray-100 text-gray-900"
                }`}
              >
                      {!msg.is_mine && (
                        <p className="text-xs font-medium text-gray-600 mb-1">
                          {msg.sender_name}
                        </p>
                      )}
                      <MessageBody body={msg.body} />
                      <div className="text-xs text-gray-500 mt-2 text-right">
                        {formatTime(msg.created_at)}
                      </div>
                    </div>
                  </div>
                ))
                )}
              <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="border-t border-gray-200 p-4 flex flex-col gap-3">
          {/* File Preview Section */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachedFiles.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 border border-gray-200 bg-gray-50 rounded-lg px-3 py-1 text-sm"
                >
                  <Paperclip className="w-4 h-4 text-blue-500" />
                  <span className="truncate max-w-[120px]">{file.name}</span>
                  <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleAttachClick}
              className="p-2 rounded-full hover:bg-gray-100 transition"
              title="Attach files"
            >
              <Paperclip className="w-5 h-5 text-gray-600" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={handleFileChange}
            />
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={activeConversation?.can_message === false ? "This conversation is closed" : "Write a message..."}
                  disabled={sending || activeConversation?.can_message === false}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
                  disabled={sending || !newMessage.trim() || activeConversation?.can_message === false}
                  className="bg-blue-600 text-white px-5 py-2 rounded-xl font-medium hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
            >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
              <Send className="w-4 h-4" />
                  )}
              Send
            </button>
          </div>
        </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation to start messaging
          </div>
        )}
      </main>
    </div>
  );
}
