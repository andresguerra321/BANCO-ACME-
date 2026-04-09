import { getUserByDoc, updateUser, isAuthenticated } from './storage.js';
import { showToast } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    if (isAuthenticated()) {
        window.location.href = 'dashboard.html';
        return;
    }

    const recoverForm = document.getElementById('recoverForm');
    const newPasswordForm = document.getElementById('newPasswordForm');
    
    let verifiedUserDoc = null;

    if (recoverForm) {
        recoverForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const docType = document.getElementById('docType').value;
            const docNumber = document.getElementById('docNumber').value.trim();
            const email = document.getElementById('email').value.trim();
            
            const user = getUserByDoc(docNumber);
            
            if (user && user.docType === docType && user.email === email) {
                // Identidad verificada
                verifiedUserDoc = docNumber;
                recoverForm.classList.add('hidden');
                newPasswordForm.classList.remove('hidden');
                showToast('Identidad validada correctamente. Ingrese nueva contraseña.', 'success');
            } else {
                showToast('Datos incorrectos. No se pudo validar su identidad.', 'error');
            }
        });
    }

    if (newPasswordForm) {
        newPasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (newPassword !== confirmPassword) {
                showToast('Las contraseñas no coinciden.', 'error');
                return;
            }
            
            if (newPassword.length < 6) {
                showToast('La contraseña debe tener al menos 6 caracteres.', 'error');
                return;
            }

            if (verifiedUserDoc) {
                const user = getUserByDoc(verifiedUserDoc);
                if (user) {
                    user.password = newPassword;
                    updateUser(user);
                    showToast('Contraseña actualizada exitosamente.', 'success');
                    
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 2000);
                } else {
                    showToast('Error interno. Intente nuevamente.', 'error');
                }
            }
        });
    }
});
