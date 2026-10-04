import { redirect } from "next/navigation";
import { getAuthenticatedUser, getCurrentProfile } from "@/repositories/auth.repository";
import type { UserProfile } from "@/types/auth";

export async function requireUser() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireProfile(): Promise<UserProfile> {
  await requireUser();
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login?error=profile");
  if (!profile.active) redirect("/login?error=inactive");

  return profile;
}

export async function requireAdmin(): Promise<UserProfile> {
  const profile = await requireProfile();
  if (profile.role !== "ADMIN") redirect("/app?error=forbidden");
  return profile;
}
