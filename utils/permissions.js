import { ROLE_LEVELS } from "./roles.js";


export function canManageUser(actorRole, targetRole) {
  return ROLE_LEVELS[actorRole] > ROLE_LEVELS[targetRole];
}

export function canAssignRole(actorRole, newRole) {
  return ROLE_LEVELS[actorRole] > ROLE_LEVELS[newRole];
}

export function isAdminOrHigher(role) {
  return ROLE_LEVELS[role] >= ROLE_LEVELS.Admin;
}