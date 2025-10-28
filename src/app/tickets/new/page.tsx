"use client";

import { useState, useEffect } from "react";
import { supabaseBrowserClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function CreateTicketPage() {
  const router = useRouter();

  // form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ Fetch developers (for assigning tickets)
  useEffect(() => {
    async function fetchDevelopers() {
      const { data, error } = await supabaseBrowserClient
        .from("profiles")
        .select("id, name, email")
        .eq("role", "developer");

      if (!error && data) setDevelopers(data);
    }
    fetchDevelopers();
  }, []);

  // ✅ Handle form submission
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Get the logged-in user
    const {
      data: { user },
    } = await supabaseBrowserClient.auth.getUser();

    if (!user) {
      alert("You must be logged in to create a ticket.");
      setLoading(false);
      return;
    }

    // Insert ticket into Supabase
    const { error } = await supabaseBrowserClient.from("tickets").insert([
      {
        title,
        description,
        deadline,
        assigned_to: assignedTo,
        raised_by: user.id,
        status: "open",
      },
    ]);

    if (error) {
      console.error(error);
      alert("Error creating ticket: " + error.message);
    } else {
      alert("✅ Ticket created successfully!");
      router.push("/dashboard"); // Redirect back to dashboard
    }

    setLoading(false);
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create New Ticket</h1>

      <form onSubmit={handleCreate} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            type="text"
            className="border p-2 w-full rounded-md"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            className="border p-2 w-full rounded-md"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Deadline */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Deadline
          </label>
          <input
            type="date"
            className="border p-2 w-full rounded-md"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            required
          />
        </div>

        {/* Assign Developer */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Assign to Developer
          </label>
          <select
            className="border p-2 w-full rounded-md"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            required
          >
            <option value="">-- Select Developer --</option>
            {developers.map((dev) => (
              <option key={dev.id} value={dev.id}>
                {dev.name || dev.email}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          {loading ? "Creating..." : "Create Ticket"}
        </button>
      </form>
    </div>
  );
}
