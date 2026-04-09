import { getUsers, setCurrentUser, isAuthenticated } from './storage.js';
import { showToast } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    // Si ya está autenticado, redirigir al dashboard
    if (isAuthenticated()) {
        window.location.href = 'dashboard.html';
        return;
    }

    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const docType = document.getElementById('docType').value;
            const docNumber = document.getElementById('docNumber').value.trim();
            const password = document.getElementById('password').value;
            
            if (!docType || !docNumber || !password) {
                showToast('Por favor, completa todos los campos', 'error');
                return;
            }
            
            const users = getUsers();
            const user = users.find(u => u.docType === docType && u.docNumber === docNumber);
            
            if (user && user.password === password) {
                // Login exitoso
                setCurrentUser(user.docNumber);
                showToast('Inicio de sesión exitoso', 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                // Login fallido
                showToast('No se pudo validar su identidad. Verifique sus credenciales.', 'error');
            }
        });
    }
});
