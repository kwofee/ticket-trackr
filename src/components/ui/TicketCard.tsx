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
  assigned_to: string;
  // ... any other ticket properties
};

type Profile = {
  id: string;
  role: string;
  // ... any other profile properties
};

export default function TicketCard({ ticket, profile }: { ticket: Ticket; profile: Profile }) {
  const supabase = createClientComponentClient();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);

  // State for the "Suggest Changes" modal
  const [showModal, setShowModal] = useState(false);
  const [suggestion, setSuggestion] = useState("");

  // State for review modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Check if the current user is the developer assigned to this ticket
  const isAssignedDeveloper = profile.id === ticket.assigned_to;
  const isTicketOpen = ticket.status === "open";

  /**
   * Developer action: Accept the ticket (sets in_progress)
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

  // Fetch suggestions/comments for this ticket (used in the review modal)
  const fetchSuggestions = async () => {
    setSuggestionsLoading(true);
    const { data, error } = await supabase
      .from("comments")
      // If your Supabase relationship is configured you can fetch author name via profiles(name)
      .select("id, content, user_id, created_at, profiles(name)")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading suggestions:", error.message);
      setSuggestions([]);
    } else {
      setSuggestions(data || []);
    }
    setSuggestionsLoading(false);
  };

  // when review modal is opened, fetch suggestions
  useEffect(() => {
    if (showReviewModal) {
      fetchSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showReviewModal]);

  // Manager action: Accept a single suggestion and go to edit page
  // Also remove that suggestion from the page and delete it from the DB
  const handleAcceptSuggestion = async (suggestionItem: any) => {
    if (!confirm("Accept this suggestion and open the edit screen?")) return;
    setIsLoading(true);

    // Attempt to delete the comment from the database
    const { error: deleteError } = await supabase.from("comments").delete().eq("id", suggestionItem.id);
    if (deleteError) {
      // If deletion fails, notify but proceed to remove from UI and navigate (optional)
      alert("Warning: failed to delete suggestion from DB: " + deleteError.message);
    }

    // Remove locally so it's no longer visible immediately
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionItem.id));

    // Navigate to edit page with suggestion in query so the manager can apply it
    const encoded = encodeURIComponent(suggestionItem.content || "");
    // navigate (this will unmount the component)
    router.push(`/tickets/${ticket.id}/edit?suggestion=${encoded}&suggestionId=${suggestionItem.id}`);

    setIsLoading(false);
  };

  // Manager action: Deny a suggestion (reopen the ticket) and remove it from the page + DB
  const handleDenySuggestion = async (suggestionItem: any) => {
    if (!confirm("Deny this suggestion and reopen the ticket?")) return;
    setIsLoading(true);

    // Re-open the ticket (set status back to 'open')
    const { error: reopenError } = await supabase.from("tickets").update({ status: "open" }).eq("id", ticket.id);
    if (reopenError) {
      alert("Error reopening ticket: " + reopenError.message);
      setIsLoading(false);
      return;
    }

    // Delete the suggestion/comment from the DB
    const { error: deleteError } = await supabase.from("comments").delete().eq("id", suggestionItem.id);
    if (deleteError) {
      alert("Error deleting suggestion from DB: " + deleteError.message);
      // still attempt to remove from UI so manager doesn't keep seeing it
    } else {
      // only invalidate tickets if the reopen succeeded (we did above)
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    }

    // Remove the denied suggestion from the visible list
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionItem.id));

    setIsLoading(false);
  };

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

          {/* Manager-only: If ticket is in needs_review, show "Review Suggestions" */}
          {profile.role === "manager" && ticket.status === "needs_review" && (
            <button
              onClick={() => setShowReviewModal(true)}
              className="ml-4 bg-indigo-600 text-white px-3 py-1 rounded-md text-sm hover:bg-indigo-700"
            >
              Review Suggestions
            </button>
          )}
        </div>

        {/* Developer-only action buttons (accept / suggest) */}
        {isAssignedDeveloper && isTicketOpen && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
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
          </div>
        )}
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
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-300"
                >
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
                          By: {s.profiles?.name || s.user_id} • {new Date(s.created_at).toLocaleString()}
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
    </>
  );
}