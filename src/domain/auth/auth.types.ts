export const APP_ROLES = ["ADMIN", "OPERATIVO"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export type UserProfile = {
  id: string;
  full_name: string;
  role: AppRole;
  active: boolean;
};

export type AuthContext = {
  user: {
    id: string;
    email: string | null;
  };
  profile: UserProfile;
};