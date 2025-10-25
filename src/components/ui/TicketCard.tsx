import { Ticket } from "@/lib/types";

export default function TicketCard({ ticket }: { ticket: Ticket }) {
  const isOverdue = new Date(ticket.deadline) < new Date() && ticket.status !== "completed";
  return (
    <div className="p-4 border rounded-xl bg-white shadow-sm">
      <h2 className="text-lg font-semibold">{ticket.title}</h2>
      <p className="text-sm text-gray-600">{ticket.description}</p>
      <p className="mt-2 text-sm">Deadline: {ticket.deadline}</p>
      <p className={`mt-1 text-sm font-medium ${isOverdue ? "text-red-500" : "text-gray-800"}`}>
        Status: {isOverdue ? "⚠️ Deadline Passed" : ticket.status}
      </p>
    </div>
  );
}
