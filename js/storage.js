// js/storage.js

const USERS_KEY = 'banco_acme_users';
const CURRENT_USER_KEY = 'banco_acme_currentUser';

/**
 * Obtiene todos los usuarios.
 */
export function getUsers() {
    const users = localStorage.getItem(USERS_KEY);
    return users ? JSON.parse(users) : [];
}

/**
 * Guarda el array de usuarios.
 */
export function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/**
 * Busca un usuario por su documento.
 */
export function getUserByDoc(docNumber) {
    const users = getUsers();
    return users.find(u => u.docNumber === docNumber) || null;
}

/**
 * Busca un usuario por su número de cuenta.
 */
export function getUserByAccount(accountNumber) {
    const users = getUsers();
    return users.find(u => u.accountNumber === accountNumber) || null;
}

/**
 * Establece el usuario actualmente autenticado (ID/docNumber)
 */
export function setCurrentUser(docNumber) {
    localStorage.setItem(CURRENT_USER_KEY, docNumber);
}

/**
 * Obtiene el usuario autenticado actualmente.
 */
export function getCurrentUser() {
    const docNumber = localStorage.getItem(CURRENT_USER_KEY);
    if (!docNumber) return null;
    return getUserByDoc(docNumber);
}

/**
 * Actualiza la información de un usuario
 */
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

/**
 * Cierra la sesión
 */
export function logout() {
    localStorage.removeItem(CURRENT_USER_KEY);
}

/**
 * Comprueba si hay una sesión activa
 */
export function isAuthenticated() {
    return localStorage.getItem(CURRENT_USER_KEY) !== null;
}
