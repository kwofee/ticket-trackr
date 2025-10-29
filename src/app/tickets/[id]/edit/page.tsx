"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter, useParams, useSearchParams } from "next/navigation";

export default function EditTicketPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const ticketId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState<string | null>("");
  const [assignedTo, setAssignedTo] = useState("");
  const [developers, setDevelopers] = useState<any[]>([]);

  // suggestion passed via query (from Review -> Accept)
  const suggestion = searchParams?.get("suggestion") || "";
  const suggestionId = searchParams?.get("suggestionId") || "";

  useEffect(() => {
    if (!ticketId) return;

    async function load() {
      setLoading(true);
      // fetch ticket details
      const { data: ticket, error } = await supabase
        .from("tickets")
        .select("id, title, description, deadline, assigned_to, status")
        .eq("id", ticketId)
        .single();

      if (error || !ticket) {
        alert("Could not load ticket: " + (error?.message || "unknown error"));
        setLoading(false);
        return;
      }

      setTitle(ticket.title || "");
      setDescription(ticket.description || "");
      setDeadline(ticket.deadline || "");
      setAssignedTo(ticket.assigned_to || "");

      // fetch developers for assign dropdown
      const { data: devs } = await supabase.from("profiles").select("id, name").eq("role", "developer");

      if (devs) setDevelopers(devs);
      setLoading(false);
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from("tickets")
      .update({
        title,
        description,
        deadline,
        assigned_to: assignedTo,
        // After manager accepts & saves changes, set status back to 'open'
        status: "open",
      })
      .eq("id", ticketId);

    if (error) {
      alert("Error updating ticket: " + error.message);
      setSaving(false);
      return;
    }

    // Optionally mark the suggestion as resolved in comments (if you have such a column)
    // Example (uncomment if 'resolved' column exists on comments):
    // if (suggestionId) {
    //   await supabase.from('comments').update({ resolved: true }).eq('id', suggestionId);
    // }

    alert("Ticket updated and set back to open");
    router.push("/dashboard");
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading ticket...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Edit Ticket</h1>

      {suggestion && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h3 className="font-semibold mb-1">Suggested change</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{suggestion}</p>
          <p className="text-xs text-gray-500 mt-2">Suggestion ID: {suggestionId}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="border p-2 w-full rounded-md" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="border p-2 w-full rounded-md" rows={5} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Deadline</label>
          <input type="date" value={deadline || ""} onChange={(e) => setDeadline(e.target.value)} className="border p-2 w-full rounded-md" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Assign to Developer</label>
          <select className="border p-2 w-full rounded-md" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            <option value="">-- Select Developer --</option>
            {developers.map((dev) => (
              <option key={dev.id} value={dev.id}>
                {dev.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => router.push("/dashboard")} className="px-4 py-2 rounded border border-gray-200">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded">
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}