import { supabaseBrowserClient } from "./supabaseClient";
import { Ticket } from "./types";

export async function fetchUserProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabaseBrowserClient.auth.getUser();
  if (userError || !user) throw new Error("No user found");

  const { data: profile, error } = await supabaseBrowserClient
    .from("profiles")
    .select("id, name, role")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return profile;
}

export async function fetchTickets(role: string, userId: string) {
  let query = supabaseBrowserClient.from("tickets").select(`
    id,
    title,
    description,
    status,
    deadline,
    raised_by,
    assigned_to,
    created_at
  `);

  if (role === "manager") {
    query = query.eq("raised_by", userId);
  } else if (role === "developer") {
    query = query.eq("assigned_to", userId);
  }

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}



export async function createTicket(ticket: Partial<Ticket>) {
  const { error } = await supabaseBrowserClient.from("tickets").insert(ticket);
  if (error) throw error;
}
