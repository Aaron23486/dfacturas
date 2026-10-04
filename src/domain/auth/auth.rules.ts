import { APP_ROLES, type AppRole, type UserProfile } from "./auth.types";

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.includes(value as AppRole);
}

export function isActiveProfile(profile: UserProfile): boolean {
  return profile.active;
}

export function canAccessAdminFeatures(role: AppRole): boolean {
  return role === "ADMIN";
}