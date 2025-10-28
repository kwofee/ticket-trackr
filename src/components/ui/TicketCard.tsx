import { Ticket } from "@/lib/types";

export default function TicketCard({ ticket }: { ticket: Ticket }) {
  // const isOverdue = new Date(ticket.deadline) < new Date() && ticket.status !== "completed";
  const formattedDeadline = ticket.deadline 
    ? new Date(ticket.deadline).toLocaleString()
    : "No deadline set";
  return (
    <div className="p-4 border rounded-xl bg-white shadow-sm">
      <h2 className="font-semibold">{ticket.title}</h2>
      <p className="text-sm text-gray-700">{ticket.description}</p>
      <p className="text-sm text-gray-500">Deadline: {formattedDeadline}</p>
    </div>
  );
}
