"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function AuthNav() {
  const [email, setEmail] = useState<string | null | "pending">("pending");
  const [isOperator, setIsOperator] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user;
      setEmail(u?.email ?? null);
      if (u) {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const body = (await res.json()) as { isOperator?: boolean };
          setIsOperator(!!body.isOperator);
        }
      } else {
        setIsOperator(false);
      }
    };
    void load();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void load();
    });
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setEmail(null);
    setIsOperator(false);
    window.location.href = "/";
  };

  if (email === "pending") {
    return <span className="text-blue-100">…</span>;
  }

  if (email) {
    return (
      <span className="flex flex-wrap items-center gap-3 text-blue-100">
        <Link href="/messages" className="hover:underline">
          Messages
        </Link>
        {isOperator && (
          <Link href="/operator/dashboard" className="hover:underline">
            Dashboard
          </Link>
        )}
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
