// ============================================================
// FUNCIONALIDAD 2: TRANSFERENCIAS ENTRE CUENTAS
// Usa: storage.js (getUserByDoc, updateUser), CustomEvents
// Tema cubierto: Objetos, asincronía simulada, DOM, eventos
// ============================================================

// --- AGREGAR EN js/storage.js ---
// Esta función ya existe, solo confirma que getUserByDoc está exportada ✅

// --- AGREGAR EN js/dashboard.js ---

/**
 * Registra una transferencia saliente en el usuario origen
 * y una consignación entrante en el usuario destino.
 */
function realizarTransferencia(accountNumberDestino, monto) {
    // Importa getUsers y updateUser desde storage.js
    const { getUsers, updateUser } = window._storage || {};

    const users = JSON.parse(localStorage.getItem('banco_acme_users')) || [];

    // 1. Buscamos el usuario destino por número de cuenta
    const destino = users.find(u => u.accountNumber === accountNumberDestino);

    if (!destino) {
        showToast('Número de cuenta destino no encontrado', 'error');
        return;
    }

    if (destino.accountNumber === currentUser.accountNumber) {
        showToast('No puedes transferirte a tu propia cuenta', 'error');
        return;
    }

    if (monto <= 0) {
        showToast('El monto debe ser mayor a 0', 'error');
        return;
    }

    if (monto > currentUser.balance) {
        showToast('Saldo insuficiente para la transferencia', 'error');
        return;
    }

    const ref = generateReference();
    const fecha = new Date().toISOString();

    // 2. Registramos el débito en el usuario actual (origen)
    const txOrigen = {
        date: fecha,
        reference: ref,
        type: 'Retiro',
        concept: `Transferencia enviada a cuenta ${accountNumberDestino}`,
        value: monto
    };
    currentUser.balance -= monto;
    currentUser.transactions.push(txOrigen);
    updateUser(currentUser);

    // 3. Registramos el crédito en el usuario destino
    const txDestino = {
        date: fecha,
        reference: ref,
        type: 'Consignación',
        concept: `Transferencia recibida de cuenta ${currentUser.accountNumber}`,
        value: monto
    };
    destino.balance += monto;
    destino.transactions.push(txDestino);
    updateUser(destino);

    // 4. Disparamos el CustomEvent para actualizar la UI
    const evento = new CustomEvent('bancoAcme:nuevaTransaccion', { detail: txOrigen });
    document.dispatchEvent(evento);

    showToast(`Transferencia de ${formatCurrency(monto)} enviada exitosamente`, 'success');
    showPrintModalForTransaction(txOrigen);
}

// ============================================================
// AGREGAR EN dashboard.html — nueva sección en el nav:
// <li><a href="#" data-target="transfer">Transferir</a></li>
//
// Y la sección view:
// <section id="transfer" class="view-section">
//     <div class="panel center-panel">
//         <h3>Transferencia Bancaria</h3>
//         <p class="text-muted mb-4">Envía fondos a otra cuenta Acme.</p>
//         <form id="transferForm" class="minimal-form">
//             <div class="input-modern">
//                 <input type="text" id="transferAccount" placeholder="N° Cuenta destino (ACME-XXXXXXXX)" required>
//             </div>
//             <div class="input-modern large-input">
//                 <input type="number" id="transferAmount" placeholder="0.00" min="1" required>
//                 <span>$</span>
//             </div>
//             <button type="submit" class="btn-premium full-w" style="margin-top:1rem;">
//                 Enviar Transferencia →
//             </button>
//         </form>
//     </div>
// </section>
//
// Y en setupForms() de dashboard.js:
//
//    const transferForm = document.getElementById('transferForm');
//    if (transferForm) {
//        transferForm.addEventListener('submit', (e) => {
//            e.preventDefault();
//            const cuenta = document.getElementById('transferAccount').value.trim();
//            const monto = parseFloat(document.getElementById('transferAmount').value);
//            realizarTransferencia(cuenta, monto);
//            transferForm.reset();
//        });
//    }
// ============================================================
