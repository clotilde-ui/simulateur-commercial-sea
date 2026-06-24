// Utilisateurs — comptes persistés localement (localStorage). Servent notamment
// à ajouter un membre existant à un espace client.
export const USERS_KEY = "sim-users";

export function loadUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; } catch { return []; }
}

export function saveUsers(list) {
  try { localStorage.setItem(USERS_KEY, JSON.stringify(list)); } catch (_) {}
}

export function genUserId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Invitations envoyées par email (en attente / expirées / activées).
export const INVITES_KEY = "sim-invites";

export function loadInvites() {
  try { return JSON.parse(localStorage.getItem(INVITES_KEY)) || []; } catch { return []; }
}

export function saveInvites(list) {
  try { localStorage.setItem(INVITES_KEY, JSON.stringify(list)); } catch (_) {}
}
