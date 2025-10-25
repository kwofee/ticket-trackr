"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchTickets } from "@/lib/queries";
import TicketCard from "@/components/TicketCard";

export default function Dashboard() {
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: fetchTickets,
  });

  if (isLoading) return <p>Loading...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tickets?.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </div>
    </div>
  );
}
