"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTickets, fetchUserProfile } from "@/lib/queries";
import TicketCard from "@/components/ui/TicketCard";
import Link from "next/link";

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

  if (loadingProfile || loadingTickets) return <p>Loading dashboard...</p>;
  if (!profile) return <p>Could not load user profile.</p>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {profile.role === "manager"
            ? "Manager Dashboard"
            : "Developer Dashboard"}
        </h1>

        {/* Manager-only actions */}
        {profile.role === "manager" && (
          <Link
            href="/tickets/new"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + New Ticket
          </Link>
        )}
      </div>

      {/* Ticket list */}
      {tickets?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      ) : (
        <p className="text-gray-500">
          {profile.role === "manager"
            ? "No tickets created yet."
            : "No tickets assigned yet."}
        </p>
      )}

      {/* Manager-only section: Available developers */}
      {profile.role === "manager" && <AvailableDevelopers />}
    </div>
  );
}

// Manager-only component
function AvailableDevelopers() {
  const { data: devs, isLoading } = useQuery({
    queryKey: ["developers"],
    queryFn: async () => {
      const { data, error } = await fetch(
        "/api/developers" // You can later build this as an API route
      ).then((res) => res.json());
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <p>Loading developers...</p>;
  if (!devs?.length) return <p>No developers found.</p>;

  return (
    <div className="mt-10">
      <h2 className="text-xl font-semibold mb-3">Available Developers</h2>
      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devs.map((dev) => (
          <li
            key={dev.id}
            className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100"
          >
            <p className="font-medium">{dev.name}</p>
            <p className="text-sm text-gray-500">{dev.email}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
