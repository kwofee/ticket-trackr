"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

// Define the types (you can move these to a central types file)
type Ticket = {
  id: string;
  title: string;
  description: string;
  status: string;
  assigned_to: string | null;
  raised_by: string | null;
  deadline?: string | null;
  created_at?: string;
  // ... any other ticket properties
};

type Profile = {
  id: string;
  role?: string;
  name?: string;
  // ... any other profile properties
};

export default function TicketCard({ ticket, profile }: { ticket: Ticket; profile: Profile }) {
  const supabase = createClientComponentClient();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);

  // Developer modals / state
  const [showModal, setShowModal] = useState(false);
  const [suggestion, setSuggestion] = useState("");

  // Manager review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // New: Details modal state (for manager and developer)
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [ticketDetails, setTicketDetails] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Check role/assignment/status
  const isAssignedDeveloper = profile.id === ticket.assigned_to;
  const isTicketOpen = ticket.status === "open";
  const isTicketInProgress = ticket.status === "in_progress";

  /**
   * Developer: Accept the ticket -> in_progress
   */
  const handleAccept = async () => {
    setIsLoading(true);
    const { error } = await supabase.from("tickets").update({ status: "in_progress" }).eq("id", ticket.id);

    if (error) {
      alert("Error accepting ticket: " + error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    }
    setIsLoading(false);
  };

  /**
   * Developer: Finish the ticket -> use allowed DB value (e.g., 'returned')
   */
  const handleFinish = async () => {
    if (!confirm("Mark this ticket as completed?")) return;
    setIsLoading(true);
    // Use an allowed status from your DB. Change 'returned' if needed.
    const { error } = await supabase.from("tickets").update({ status: "returned" }).eq("id", ticket.id);

    if (error) {
      alert("Error finishing ticket: " + error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    }
    setIsLoading(false);
  };

  /**
   * Developer action: Submit a suggestion (creates comment + sets needs_review)
   */
  const handleSubmitSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestion.trim().length === 0) {
      alert("Please enter your suggestion.");
      return;
    }

    setIsLoading(true);

    const { error: commentError } = await supabase.from("comments").insert({
      ticket_id: ticket.id,
      user_id: profile.id,
      content: suggestion,
    });

    if (commentError) {
      alert("Error submitting suggestion: " + commentError.message);
      setIsLoading(false);
      return;
    }

    const { error: ticketError } = await supabase.from("tickets").update({ status: "needs_review" }).eq("id", ticket.id);

    if (ticketError) {
      alert("Error updating ticket status: " + ticketError.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setShowModal(false);
      setSuggestion("");
    }
    setIsLoading(false);
  };

  // Fetch suggestions/comments for review modal (manager)
  const fetchSuggestions = async () => {
    setSuggestionsLoading(true);
    const { data, error } = await supabase
      .from("comments")
      .select("id, content, user_id, created_at")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading suggestions:", error.message);
      setSuggestions([]);
    } else {
      const rows = data || [];
      const userIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean)));
      if (userIds.length > 0) {
        const { data: userProfiles } = await supabase.from("profiles").select("id, name").in("id", userIds);
        const profileMap = (userProfiles || []).reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});
        setSuggestions(rows.map((r: any) => ({ ...r, author: profileMap[r.user_id] || null })));
      } else {
        setSuggestions(rows);
      }
    }
    setSuggestionsLoading(false);
  };

  useEffect(() => {
    if (showReviewModal) fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showReviewModal]);

  // Manager action: Accept a suggestion and go to edit page (delete comment and remove locally)
  const handleAcceptSuggestion = async (suggestionItem: any) => {
    if (!confirm("Accept this suggestion and open the edit screen?")) return;
    setIsLoading(true);

    await supabase.from("comments").delete().eq("id", suggestionItem.id);
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionItem.id));

    const encoded = encodeURIComponent(suggestionItem.content || "");
    router.push(`/tickets/${ticket.id}/edit?suggestion=${encoded}&suggestionId=${suggestionItem.id}`);

    setIsLoading(false);
  };

  // Manager action: Deny a suggestion (reopen the ticket) and delete comment + remove locally
  const handleDenySuggestion = async (suggestionItem: any) => {
    if (!confirm("Deny this suggestion and reopen the ticket?")) return;
    setIsLoading(true);

    const { error: reopenError } = await supabase.from("tickets").update({ status: "open" }).eq("id", ticket.id);
    if (reopenError) {
      alert("Error reopening ticket: " + reopenError.message);
      setIsLoading(false);
      return;
    }

    const { error: deleteError } = await supabase.from("comments").delete().eq("id", suggestionItem.id);
    if (deleteError) {
      alert("Error deleting suggestion from DB: " + deleteError.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    }

    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionItem.id));
    setIsLoading(false);
  };

  // Fetch ticket details & comments for details modal (avoid ambiguous relationship joins)
  const fetchTicketDetails = async () => {
    setDetailsLoading(true);
    try {
      // 1) Fetch the ticket row without relationship joins
      const { data: t, error: ticketError } = await supabase
        .from("tickets")
        .select("id, title, description, status, deadline, created_at, assigned_to, raised_by")
        .eq("id", ticket.id)
        .single();

      if (ticketError || !t) {
        console.error("Failed to load ticket details:", ticketError?.message || "no ticket");
        setTicketDetails(null);
        setDetailsLoading(false);
        return;
      }

      // Prepare an object to hold details + fetched profile names
      const details: any = { ...t };

      // 2) If assigned_to present, fetch that profile
      if (t.assigned_to) {
        const { data: assignedProfile, error: assignedError } = await supabase
          .from("profiles")
          .select("id, name")
          .eq("id", t.assigned_to)
          .single();
        if (!assignedError && assignedProfile) details.assigned_profile = assignedProfile;
      }

      // 3) If raised_by present, fetch that profile
      if (t.raised_by) {
        const { data: raisedProfile, error: raisedError } = await supabase
          .from("profiles")
          .select("id, name")
          .eq("id", t.raised_by)
          .single();
        if (!raisedError && raisedProfile) details.raised_profile = raisedProfile;
      }

      setTicketDetails(details);

      // 4) Fetch comments for the ticket and their authors
      setCommentsLoading(true);
      const { data: cdata, error: commentsError } = await supabase
        .from("comments")
        .select("id, content, user_id, created_at")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true });

      if (commentsError) {
        console.error("Failed to load comments:", commentsError.message);
        setComments([]);
      } else {
        const rows = cdata || [];
        const userIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean)));
        let profileMap: Record<string, any> = {};
        if (userIds.length > 0) {
          const { data: userProfiles } = await supabase.from("profiles").select("id, name").in("id", userIds);
          profileMap = (userProfiles || []).reduce((acc: any, p: any) => {
            acc[p.id] = p;
            return acc;
          }, {});
        }
        setComments(rows.map((r: any) => ({ ...r, author: profileMap[r.user_id] || null })));
      }
      setCommentsLoading(false);
    } catch (err: any) {
      console.error("Failed to load ticket details (unexpected):", err?.message || err);
      setTicketDetails(null);
      setComments([]);
      setCommentsLoading(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    if (showDetailsModal) fetchTicketDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDetailsModal]);

  return (
    <>
      {/* The main ticket card */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-lg mb-2">{ticket.title}</h3>
          <p className="text-gray-600 text-sm mb-4">{ticket.description}</p>
        </div>

        <div className="flex items-center justify-between">
          {/* Status Badge */}
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              ticket.status === "open"
                ? "bg-blue-100 text-blue-800"
                : ticket.status === "in_progress"
                ? "bg-yellow-100 text-yellow-800"
                : ticket.status === "needs_review"
                ? "bg-orange-100 text-orange-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {ticket.status}
          </span>

          <div className="flex items-center">
            {/* Manager-only: review button shown to managers when needs_review */}
            {profile.role === "manager" && ticket.status === "needs_review" && (
              <button
                onClick={() => setShowReviewModal(true)}
                className="ml-3 bg-indigo-600 text-white px-3 py-1 rounded-md text-sm hover:bg-indigo-700"
              >
                Review Suggestions
              </button>
            )}

            {/* View Details: available to managers AND the assigned developer */}
            {(profile.role === "manager" || isAssignedDeveloper) && (
              <button
                onClick={() => setShowDetailsModal(true)}
                className="ml-3 bg-gray-800 text-white px-3 py-1 rounded-md text-sm hover:bg-gray-900"
              >
                View Details
              </button>
            )}
          </div>
        </div>

        {/* Developer action buttons */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
          {isAssignedDeveloper && isTicketOpen && (
            <>
              <button
                onClick={handleAccept}
                disabled={isLoading}
                className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50"
              >
                {isLoading ? "Accepting..." : "Accept Ticket"}
              </button>
              <button
                onClick={() => setShowModal(true)}
                disabled={isLoading}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 disabled:opacity-50"
              >
                Suggest Changes
              </button>
            </>
          )}

          {isAssignedDeveloper && isTicketInProgress && (
            <>
              <button
                onClick={handleFinish}
                disabled={isLoading}
                className="flex-1 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50"
              >
                {isLoading ? "Finishing..." : "Finish Ticket"}
              </button>
              <button
                onClick={() => setShowModal(true)}
                disabled={isLoading}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 disabled:opacity-50"
              >
                Suggest Changes
              </button>
            </>
          )}
        </div>
      </div>

      {/* Suggest Changes Modal (developer) */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Suggest Changes</h2>
            <form onSubmit={handleSubmitSuggestion}>
              <textarea
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                rows={4}
                placeholder="Type your suggestion or request for clarification here..."
                required
              />
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-300">
                  Cancel
                </button>
                <button type="submit" disabled={isLoading} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50">
                  {isLoading ? "Submitting..." : "Submit Suggestion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Suggestions Modal (manager) */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-bold">Review Suggestions</h2>
              <div>
                <button onClick={() => setShowReviewModal(false)} className="text-sm text-gray-600 hover:text-gray-800">
                  Close
                </button>
              </div>
            </div>

            {suggestionsLoading ? (
              <p className="text-gray-500">Loading suggestions...</p>
            ) : suggestions.length === 0 ? (
              <p className="text-gray-500">No suggestions found for this ticket.</p>
            ) : (
              <ul className="space-y-4">
                {suggestions.map((s: any) => (
                  <li key={s.id} className="p-4 border border-gray-200 rounded-md bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{s.content}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          By: {s.author?.name || s.user_id} • {new Date(s.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <button onClick={() => handleAcceptSuggestion(s)} className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">
                          Accept
                        </button>
                        <button onClick={() => handleDenySuggestion(s)} className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-200">
                          Deny & Reopen
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Ticket Details Modal (manager + assigned developer) */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-auto">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Ticket Details</h2>
              <button onClick={() => setShowDetailsModal(false)} className="text-sm text-gray-600 hover:text-gray-800">
                Close
              </button>
            </div>

            {detailsLoading ? (
              <p className="text-gray-500">Loading details...</p>
            ) : !ticketDetails ? (
              <p className="text-red-500">Could not load ticket details.</p>
            ) : (
              <>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">{ticketDetails.title || ticket.title}</h3>
                  <p className="text-sm text-gray-600">{ticketDetails.description || ticket.description}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-gray-50 rounded border border-gray-100">
                    <p className="text-xs text-gray-500">Status</p>
                    <p className="font-medium">{ticketDetails.status}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded border border-gray-100">
                    <p className="text-xs text-gray-500">Assigned to</p>
                    <p className="font-medium">{ticketDetails.assigned_profile?.name || ticketDetails.assigned_to || "Unassigned"}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded border border-gray-100">
                    <p className="text-xs text-gray-500">Raised by</p>
                    <p className="font-medium">{ticketDetails.raised_profile?.name || ticketDetails.raised_by || "Unknown"}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded border border-gray-100">
                    <p className="text-xs text-gray-500">Deadline</p>
                    <p className="font-medium">{ticketDetails.deadline ? new Date(ticketDetails.deadline).toLocaleDateString() : "None"}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold mb-2">Comments / Suggestions</h4>
                  {commentsLoading ? (
                    <p className="text-gray-500">Loading comments...</p>
                  ) : comments.length === 0 ? (
                    <p className="text-gray-500">No comments yet.</p>
                  ) : (
                    <ul className="space-y-3">
                      {comments.map((c) => (
                        <li key={c.id} className="p-3 bg-gray-50 rounded border border-gray-100">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            By: {c.author?.name || c.user_id} • {new Date(c.created_at).toLocaleString()}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowDetailsModal(false)} className="px-4 py-2 rounded border border-gray-200">
                    Close
                  </button>

                  {/* Only managers can edit from details modal (keep edit restricted) */}
                  {profile.role === "manager" && (
                    <button
                      onClick={() => {
                        router.push(`/tickets/${ticket.id}/edit`);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded"
                    >
                      Edit Ticket
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}