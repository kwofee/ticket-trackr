"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTickets, fetchUserProfile } from "@/lib/queries";
import TicketCard from "@/components/ui/TicketCard";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// A simple loading component (you can replace with a spinner)
function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-lg text-gray-500">Loading dashboard...</p>
    </div>
  );
}

export default function Dashboard() {
  // Step 1: Get user profile first
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchUserProfile,
  });

  // Step 2: Get tickets after profile is loaded
  const { data: tickets, isLoading: loadingTickets } = useQuery({
    queryKey: ["tickets", profile?.role],
    queryFn: async () =>
      profile ? fetchTickets(profile.role, profile.id) : [],
    enabled: !!profile,
  });

  if (loadingProfile || loadingTickets) return <DashboardLoading />;

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-red-500">Could not load user profile.</p>
      </div>
    );
  }

  return (
    // Page container with a light background
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Header section */}
        <div className="flex items-center justify-between pb-6 mb-8 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900">
            {profile.role === "manager"
              ? "Manager Dashboard"
              : "Developer Dashboard"}
          </h1>

          {/* Manager-only actions */}
          {profile.role === "manager" && (
            <Link
              href="/tickets/new"
              className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold shadow-sm hover:bg-blue-700 transition-colors"
            >
              + New Ticket
            </Link>
          )}
        </div>

        {/* Ticket list section */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-5">
            {profile.role === "manager" ? "All Tickets" : "Your Assigned Tickets"}
          </h2>
          {tickets?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* --- THIS IS THE MODIFIED LINE --- */}
              {tickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} profile={profile} />
              ))}
            </div>
          ) : (
            // Nicer empty state
            <div className="text-center py-12 px-6 bg-white rounded-lg shadow-sm border border-gray-200">
              <p className="text-gray-500 text-lg">
                {profile.role === "manager"
                  ? "No tickets created yet."
                  : "You have no tickets assigned yet."}
              </p>
            </div>
          )}
        </div>

        {/* Manager-only section: Available developers */}
        {profile.role === "manager" && <AvailableDevelopers />}
      </div>
    </div>
  );
}

// --- MODIFIED COMPONENT ---

// Manager-only component
function AvailableDevelopers() {
  const supabase = createClientComponentClient();

  const { data: devs, isLoading } = useQuery({
    queryKey: ["developers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("role", "developer");

      if (error) {
        console.error("Error fetching developers:", error.message);
        throw new Error("Could not fetch developers");
      }
      return data;
    },
  });

  return (
    // Wrapped in a card-like container
    <div className="mt-12 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-2xl font-semibold text-gray-800 mb-5">
        Available Developers
      </h2>

      {isLoading ? (
        <p className="text-gray-500">Loading developers...</p>
      ) : !devs?.length ? (
        <p className="text-gray-500">No developers found.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {devs.map((dev) => (
            // Nicer list item with avatar placeholder
            <li
              key={dev.id}
              className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg bg-gray-50 hover:bg-white hover:shadow-md transition-all duration-150"
            >
              {/* Avatar Placeholder */}
              <span className="flex-shrink-0 w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold">
                {dev.name ? dev.name.charAt(0).toUpperCase() : "?"}
              </span>
              <div>
                <p className="font-semibold text-gray-900">{dev.name}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}