"use server";

import { redirect } from "next/navigation";
import { isAppRole } from "@/domain/auth/auth.rules";
import { emailFingerprint, securityEvent } from "@/lib/security/events";
import { createClient } from "@/lib/supabase/server";

type LoginErrorCode = "required" | "invalid" | "profile" | "inactive";

function loginError(code: LoginErrorCode) {
  return `/login?error=${code}`;
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) redirect(loginError("required"));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    securityEvent("login.failed", {
      emailFingerprint: emailFingerprint(email),
    });
    redirect(loginError("invalid"));
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile || !isAppRole(profile.role)) {
    securityEvent("login.denied_without_profile", { userId: data.user.id });
    await supabase.auth.signOut();
    redirect(loginError("profile"));
  }

  if (!profile.active) {
    securityEvent("login.denied_inactive", { userId: data.user.id });
    await supabase.auth.signOut();
    redirect(loginError("inactive"));
  }

  redirect("/app");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
