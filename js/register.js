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

    const docNumberInput = document.getElementById('docNumber');
    const docTypeSelect = document.getElementById('docType');
    const docHint = docNumberInput?.nextElementSibling;

    if (docTypeSelect && docNumberInput) {
        docTypeSelect.addEventListener('change', () => {
            const type = docTypeSelect.value;
            let minLen = 8;
            if (type === 'CE') minLen = 6;
            if (type === 'TI') minLen = 10;
            
            docNumberInput.minLength = minLen;
            if (docHint) docHint.textContent = `Mínimo ${minLen} números. Solo dígitos.`;
        });

        docNumberInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }

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

            // Simple validación de campos vacíos
            if (!docType || !docNumber || !names || !surnames || !gender || !phone || !email || !city || !address || !password) {
                showToast('Todos los campos son obligatorios.', 'error');
                return;
            }

            // Validar longitud de documento según tipo
            let minDocLen = 8;
            if (docType === 'CE') minDocLen = 6;
            if (docType === 'TI') minDocLen = 10;

            if (docNumber.length < minDocLen) {
                showToast(`El número para ${docType} debe tener al menos ${minDocLen} dígitos.`, 'error');
                return;
            }

            // Validar contraseña
            const hasNumber = /\d/.test(password);
            const hasLetter = /[a-zA-Z]/.test(password);

            if (password.length < 7 || !hasNumber || !hasLetter) {
                showToast('La contraseña debe tener al menos 7 caracteres e incluir letras y números.', 'error');
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
