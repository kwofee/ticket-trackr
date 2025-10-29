"use client";
import { supabaseBrowserClient } from "@/lib/supabaseClient";
import { useState } from "react";
import { useRouter } from "next/navigation";

// 1. Renamed to 'Page' to match the file name 'page.tsx'
export default function Page() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // Type is correct
  const router = useRouter();

  // 2. Added the TypeScript type 'React.FormEvent' to the event handler
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabaseBrowserClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      router.push("/dashboard");
    }
    setLoading(false);
  }

  return (
    // Outer container with the animated gradient background
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Animated gradient background */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-500 to-pink-500 opacity-80 animate-gradient-xy"
        style={{ backgroundSize: "400% 400%" }} // Needed for the animation to work properly
      ></div>

      {/* Content wrapper */}
      <div className="relative z-10 max-w-md w-full">
        <form
          onSubmit={handleLogin}
          // Frosted glass effect
          className="p-8 bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg border border-white border-opacity-20 rounded-xl shadow-2xl space-y-6"
        >
          {/* Header */}
          <div className="text-center">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-2">
              TaskTrackr
            </h2>
            <p className="mt-2 text-lg text-gray-700">
              Welcome back! Please log in.
            </p>
          </div>

          {/* Input Fields Wrapper */}
          <div className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-white text-opacity-90 mb-1"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                placeholder="you@example.com"
                // --- FIX: Dark text for the light input field ---
                className="w-full bg-white bg-opacity-5 border border-white border-opacity-20 px-4 py-2 rounded-lg shadow-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors duration-200"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-white text-opacity-90 mb-1"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                // --- FIX: Dark text for the light input field ---
                className="w-full bg-white bg-opacity-5 border border-white border-opacity-20 px-4 py-2 rounded-lg shadow-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors duration-200"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-sm text-red-300 text-center font-medium">
              {error}
            </p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            // Button styled to stand out with a gradient and shadow
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold shadow-md hover:from-blue-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* Sign Up Link */}
        <p className="text-sm mt-8 text-center text-white text-opacity-80">
          Don't have an account?
          <a
            href="/signup"
            className="font-semibold text-blue-200 hover:text-blue-100 ml-1 transition-colors duration-200"
          >
            Sign Up
          </a>
        </p>
      </div>
    </div>
  );
}