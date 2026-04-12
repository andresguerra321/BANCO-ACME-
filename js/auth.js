import { getUsers, setCurrentUser, isAuthenticated } from './storage.js';
import { showToast } from './ui.js';

/**
 * SIMULACIÓN DE SERVIDOR (Asincronía - Promesas)
 * Esta función simula lo que haría un Fetch hacia una API o base de datos externa.
 * Retorna una Promesa que se resuelve (éxito) o rechaza (error) después de 2.5 segundos.
 */
function simularPeticionLogin(docType, docNumber, password) {
    return new Promise((resolve, reject) => {
        // Simulamos un retraso de red de 2.5 segundos
        setTimeout(() => {
            const users = getUsers();
            const user = users.find(u => u.docType === docType && u.docNumber === docNumber);
            
            if (user && user.password === password) {
                resolve(user); // Promesa Cumplida (Resolved)
            } else {
                reject(new Error('Credenciales inválidas')); // Promesa Rechazada (Rejected)
            }
        }, 2500);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Si ya está autenticado, redirigir al dashboard
    if (isAuthenticated()) {
        window.location.href = 'dashboard.html';
        return;
    }

    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        // Transformamos el callback de nuestro escuchador de eventos en una función "async"
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Evitamos que la página recargue
            
            const docType = document.getElementById('docType').value;
            const docNumber = document.getElementById('docNumber').value.trim();
            const password = document.getElementById('password').value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            
            if (!docType || !docNumber || !password) {
                showToast('Por favor, completa todos los campos', 'error');
                return;
            }
            
            // ESTADO DE CARGA (Loader)
            const objTextoOriginal = submitBtn.innerHTML;
            submitBtn.innerHTML = 'Verificando datos... ⏳'; // Avisamos al usuario que hay un proceso
            submitBtn.disabled = true; // Prevenimos multiples clics espadachines

            try {
                // AWAIT: Detenemos la ejecución de esta función hasta que la Promesa se resuelva
                const userLogin = await simularPeticionLogin(docType, docNumber, password);
                
                // Si llegamos acá, significa que la promesa hizo resolve()
                setCurrentUser(userLogin.docNumber);
                showToast('Inicio de sesión exitoso. Redirigiendo...', 'success');
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
                
            } catch (error) {
                // Si caemos acá, significa que la promesa hizo reject()
                showToast('No se pudo validar su identidad. Verifique sus credenciales.', 'error');
                
                // Restauramos el botón
                submitBtn.innerHTML = objTextoOriginal;
                submitBtn.disabled = false;
            }
        });
    }
});
