// js/storage.js

const USERS_KEY = 'banco_acme_users';
const CURRENT_USER_KEY = 'banco_acme_currentUser';

export function getUsers() {
    const users = localStorage.getItem(USERS_KEY);
    return users ? JSON.parse(users) : [];
}

export function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getUserByDoc(docNumber) {
    const users = getUsers();
    return users.find(u => u.docNumber === docNumber) || null;
}

export function setCurrentUser(docNumber) {
    localStorage.setItem(CURRENT_USER_KEY, docNumber);
}

export function getCurrentUser() {
    const docNumber = localStorage.getItem(CURRENT_USER_KEY);
    if (!docNumber) return null;
    return getUserByDoc(docNumber);
}

export function updateUser(updatedUser) {
    const users = getUsers();
    const index = users.findIndex(u => u.docNumber === updatedUser.docNumber);
    if (index !== -1) {
        users[index] = updatedUser;
        saveUsers(users);
        return true;
    }
    return false;
}

export function logout() {
    localStorage.removeItem(CURRENT_USER_KEY);
}

export function isAuthenticated() {
    return localStorage.getItem(CURRENT_USER_KEY) !== null;
}

// ============================================================
// FUNCIONALIDAD 3: Metas de Ahorro
// Guardamos las metas en una clave separada por usuario
// ============================================================

export function getSavingsGoals(docNumber) {
    const key = `banco_acme_goals_${docNumber}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

export function saveSavingsGoals(docNumber, goals) {
    const key = `banco_acme_goals_${docNumber}`;
    localStorage.setItem(key, JSON.stringify(goals));
}
