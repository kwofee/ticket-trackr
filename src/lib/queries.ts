import { supabaseBrowserClient } from "./supabaseClient";
import { Ticket } from "./types";

export async function fetchTickets(): Promise<Ticket[]> {
  const { data, error } = await supabaseBrowserClient
    .from("tickets")
    .select("*, profiles!tickets_raised_by_fkey(name), profiles!tickets_assigned_to_fkey(name)");
  if (error) throw error;
  return data;
}

export async function createTicket(ticket: Partial<Ticket>) {
  const { error } = await supabaseBrowserClient.from("tickets").insert(ticket);
  if (error) throw error;
}
