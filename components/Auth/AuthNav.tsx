"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function AuthNav() {
  const [email, setEmail] = useState<string | null | "pending">("pending");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setEmail(null);
    window.location.href = "/";
  };

  if (email === "pending") {
    return <span className="text-blue-100">…</span>;
  }

  if (email) {
    return (
      <span className="flex flex-wrap items-center gap-3 text-blue-100">
        <Link href="/my-journeys" className="hover:underline">
          My journeys
        </Link>
        <span className="hidden sm:inline max-w-[10rem] truncate text-xs opacity-90">{email}</span>
        <button type="button" onClick={() => void signOut()} className="hover:underline">
          Log out
        </button>
      </span>
    );
  }

  return (
    <span className="flex gap-3 text-blue-100">
      <Link href="/login" className="hover:underline">
        Log in
      </Link>
      <Link href="/signup" className="hover:underline">
        Sign up
      </Link>
    </span>
  );
}
