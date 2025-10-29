// "use client";

// import { useState, useEffect } from "react";
// import { supabaseBrowserClient } from "@/lib/supabaseClient";
// import { useRouter } from "next/navigation";

// export default function CreateTicketPage() {
//   const router = useRouter();

//   // form fields
//   const [title, setTitle] = useState("");
//   const [description, setDescription] = useState("");
//   const [deadline, setDeadline] = useState("");
//   const [assignedTo, setAssignedTo] = useState("");
//   const [developers, setDevelopers] = useState([]);
//   const [loading, setLoading] = useState(false);

//   // ✅ Fetch developers (for assigning tickets)
//   useEffect(() => {
//     async function fetchDevelopers() {
//       const { data, error } = await supabaseBrowserClient
//         .from("profiles")
//         // --- FIX 1: Removed 'email' from the select query ---
//         .select("id, name")
//         .eq("role", "developer");

//       if (!error && data) setDevelopers(data);
//     }
//     fetchDevelopers();
//   }, []);

//   // ✅ Handle form submission
//   async function handleCreate(e: React.FormEvent) {
//     e.preventDefault();
//     setLoading(true);

//     // Get the logged-in user
//     const {
//       data: { user },
//     } = await supabaseBrowserClient.auth.getUser();

//     if (!user) {
//       alert("You must be logged in to create a ticket.");
//       setLoading(false);
//       return;
//     }

//     // Insert ticket into Supabase
//     const { error } = await supabaseBrowserClient.from("tickets").insert([
//       {
//         title,
//         description,
//         deadline,
//         assigned_to: assignedTo,
//         raised_by: user.id,
//         status: "open",
//       },
//     ]);

//     if (error) {
//       console.error(error);
//       alert("Error creating ticket: " + error.message);
//     } else {
//       alert("✅ Ticket created successfully!");
//       router.push("/dashboard"); // Redirect back to dashboard
//     }

//     setLoading(false);
//   }

//   return (
//     <div className="p-6 max-w-lg mx-auto">
//       <h1 className="text-2xl font-bold mb-6">Create New Ticket</h1>

//       <form onSubmit={handleCreate} className="space-y-4">
//         {/* Title */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Title
//           </label>
//           <input
//             type="text"
//             className="border p-2 w-full rounded-md"
//             value={title}
//             onChange={(e) => setTitle(e.target.value)}
//             required
//           />
//         </div>

//         {/* Description */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Description
//           </label>
//           <textarea
//             className="border p-2 w-full rounded-md"
//             rows={3}
//             value={description}
//             onChange={(e) => setDescription(e.target.value)}
//           />
//         </div>

//         {/* Deadline */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Deadline
//           </label>
//           <input
//             type="date"
//             className="border p-2 w-full rounded-md"
//             value={deadline}
//             onChange={(e) => setDeadline(e.target.value)}
//             required
//           />
//         </div>

//         {/* Assign Developer */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Assign to Developer
//           </label>
//           <select
//             className="border p-2 w-full rounded-md"
//             value={assignedTo}
//             onChange={(e) => setAssignedTo(e.target.value)}
//             required
//           >
//             <option value="">-- Select Developer --</option>
//             {developers.map((dev) => (
//               <option key={dev.id} value={dev.id}>
//                 {/* --- FIX 2: Removed '|| dev.email' fallback --- */}
//                 {dev.name}
//               </option>
//             ))}
//           </select>
//         </div>

//         <button
//           type="submit"
//           disabled={loading}
//           className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
//         >
//           {loading ? "Creating..." : "Create Ticket"}
//         </button>
//       </form>
//     </div>
//   );
// }

"use client";

import { useState, useEffect } from "react";
import { supabaseBrowserClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

// ✅ DEFINE THE TYPE FOR YOUR DEVELOPER OBJECT
interface Developer {
  id: string; // Assuming 'id' is a string (like a UUID)
  name: string;
}

export default function CreateTicketPage() {
  const router = useRouter();

  // form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  // ✅ APPLY THE TYPE TO useState
  const [developers, setDevelopers] = useState<Developer[]>([]); // <--- THE FIX
  const [loading, setLoading] = useState(false);

  // Fetch developers (for assigning tickets)
  useEffect(() => {
    async function fetchDevelopers() {
      const { data, error } = await supabaseBrowserClient
        .from("profiles")
        .select("id, name") // Correctly selecting only id and name
        .eq("role", "developer");

      if (!error && data) {
        setDevelopers(data); // This now works!
      }
    }
    fetchDevelopers();
  }, []);

  // Handle form submission
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
        deadline: deadline || null, // Handle empty string for date
        assigned_to: assignedTo,
        raised_by: user.id,
        status: "open", // Default status
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
            // 'required' is removed to allow null/empty dates
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
                {dev.name} 
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "Creating..." : "Create Ticket"}
        </button>
      </form>
    </div>
  );
}