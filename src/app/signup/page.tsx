"use client";

import { supabaseBrowserClient } from "@/lib/supabaseClient";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"manager" | "developer">("developer");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Sign up user in Supabase Auth
    const { data, error } = await supabaseBrowserClient.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    // Insert profile into Supabase "profiles" table
    if (data.user?.id) {
      const { error: profileError } = await supabaseBrowserClient
        .from("profiles")
        .insert({
          id: data.user.id,
          name,
          role,
        });

      if (profileError) {
        alert(profileError.message);
        setLoading(false);
        return;
      }

      alert("Signup successful! Please login.");
      router.push("/");
    }

    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSignup}
        className="bg-white p-6 rounded-xl shadow-md w-80 space-y-4"
      >
        <h2 className="text-xl font-bold text-center">Sign Up</h2>

        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "manager" | "developer")}
          className="w-full p-2 border rounded"
        >
          <option value="developer">Developer</option>
          <option value="manager">Manager</option>
        </select>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {loading ? "Signing up..." : "Sign Up"}
        </button>
      </form>
    </div>
  );
}
