import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors/app-error";
import type { UserProfile, UserRole } from "@/types/auth";

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,role,active,created_at,updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new AppError("No se pudo cargar el perfil del usuario.", "PROFILE_LOAD_FAILED", error);
  if (!data) return null;

  return {
    id: data.id,
    email: user.email ?? "",
    full_name: data.full_name,
    role: data.role as UserRole,
    active: data.active,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}
