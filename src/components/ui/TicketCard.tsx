"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useQueryClient } from "@tanstack/react-query";

// Define the types (you can move these to a central types file)
type Ticket = {
  id: string; // Changed to string to match your 'uuid'
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

export default function TicketCard({ ticket, profile }: { ticket: Ticket, profile: Profile }) {
  const supabase = createClientComponentClient();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  
  // State for the "Suggest Changes" modal
  const [showModal, setShowModal] = useState(false);
  const [suggestion, setSuggestion] = useState("");

  // Check if the current user is the developer assigned to this ticket
  const isAssignedDeveloper = profile.id === ticket.assigned_to;
  const isTicketOpen = ticket.status === 'open';

  /**
   * Handles accepting the ticket.
   * Updates status to 'in_progress'
   */
  const handleAccept = async () => {
    setIsLoading(true);
    const { error } = await supabase
      .from("tickets")
      .update({ status: "in_progress" })
      .eq("id", ticket.id);

    if (error) {
      alert("Error accepting ticket: " + error.message);
    } else {
      // Refresh all ticket data
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    }
    setIsLoading(false);
  };

  /**
   * Handles submitting the change suggestion.
   * Adds a comment and updates status to 'needs_review'
   */
  const handleSubmitSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestion.trim().length === 0) {
      alert("Please enter your suggestion.");
      return;
    }

    setIsLoading(true);

    // 1. Insert the comment
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

    // 2. Update the ticket status
    const { error: ticketError } = await supabase
      .from("tickets")
      .update({ status: "needs_review" })
      .eq("id", ticket.id);
    
    if (ticketError) {
      alert("Error updating ticket status: " + ticketError.message);
    } else {
      // Refresh all ticket data and close modal
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setShowModal(false);
      setSuggestion("");
    }
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
        <div>
          {/* Status Badge */}
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            ticket.status === 'open' ? 'bg-blue-100 text-blue-800' :
            ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
            ticket.status === 'needs_review' ? 'bg-orange-100 text-orange-800' :
            'bg-green-100 text-green-800'
          }`}>
            {ticket.status}
          </span>
        </div>

        {/* Developer-only action buttons */}
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

      {/* "Suggest Changes" Modal */}
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
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  {isLoading ? "Submitting..." : "Submit Suggestion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}