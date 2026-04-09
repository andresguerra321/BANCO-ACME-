import { getUsers, saveUsers, isAuthenticated } from './storage.js';
import { showToast } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    if (isAuthenticated()) {
        window.location.href = 'dashboard.html';
        return;
    }

    const registerForm = document.getElementById('registerForm');
    const formContainer = document.getElementById('registerFormContainer');
    const successContainer = document.getElementById('registerSuccess');

    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Recopilar datos
            const docType = document.getElementById('docType').value;
            const docNumber = document.getElementById('docNumber').value.trim();
            const names = document.getElementById('names').value.trim();
            const surnames = document.getElementById('surnames').value.trim();
            const gender = document.getElementById('gender').value;
            const phone = document.getElementById('phone').value.trim();
            const email = document.getElementById('email').value.trim();
            const city = document.getElementById('city').value.trim();
            const address = document.getElementById('address').value.trim();
            const password = document.getElementById('password').value;

            // Simple validación
            if (!docType || !docNumber || !names || !surnames || !gender || !phone || !email || !city || !address || !password) {
                showToast('Todos los campos son obligatorios.', 'error');
                return;
            }

            const users = getUsers();
            
            // Verificar si el usuario ya existe
            if (users.find(u => u.docNumber === docNumber)) {
                showToast('Ya existe un usuario con este número de identificación.', 'error');
                return;
            }

            // Generar número de cuenta aleatorio
            const accountRand = Math.floor(100000000 + Math.random() * 900000000);
            const accountNumber = `ACME-${accountRand}`;
            const creationDate = new Date().toISOString();

            // Objeto de nuevo usuario
            const newUser = {
                docType,
                docNumber,
                names,
                surnames,
                gender,
                phone,
                email,
                city,
                address,
                password,
                accountNumber,
                creationDate,
                balance: 0,
                transactions: []
            };

            // Guardar usuario
            users.push(newUser);
            saveUsers(users);

            // Mostrar resumen
            formContainer.classList.add('hidden');
            successContainer.classList.remove('hidden');
            
            document.getElementById('summaryAccount').textContent = accountNumber;
            document.getElementById('summaryDate').textContent = new Date(creationDate).toLocaleDateString('es-CO');
            
            showToast('Usuario registrado correctamente', 'success');
        });
    }
});
