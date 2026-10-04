export type UserRole = "ADMIN" | "OPERATIVO";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}
