"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function SignupForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next")?.trim() || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const signUp = async () => {
    setLoading(true);
    setMsg("");
    try {
      const supabase = getSupabaseBrowserClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (error) {
        setMsg(error.message);
        return;
      }
      setMsg("Check your email to confirm, or try logging in if confirmation is disabled.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    setMsg("");
    try {
      const supabase = getSupabaseBrowserClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (error) setMsg(error.message);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "OAuth failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-lg border border-gray-200 bg-white p-6 text-gray-900">
      <h1 className="text-xl font-bold text-gray-950">Sign up</h1>
      <p className="text-sm text-gray-800">
        After sign-up you&apos;ll choose whether you&apos;re a traveler or van rental agent.
      </p>
      <p className="text-sm text-gray-800">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-blue-700 underline">
          Log in
        </Link>
      </p>
      <label className="block text-sm">
        <span className="font-semibold text-gray-950">Email</span>
        <input
          type="email"
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </label>
      <label className="block text-sm">
        <span className="font-semibold text-gray-950">Password</span>
        <input
          type="password"
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
      </label>
      <button
        type="button"
        disabled={loading}
        onClick={() => void signUp()}
        className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Please wait…" : "Create account"}
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={() => void google()}
        className="w-full rounded-lg border border-gray-300 bg-white py-3 font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
      >
        Continue with Google
      </button>
      {msg && <p className="text-sm text-gray-800">{msg}</p>}
    </div>
  );
}
