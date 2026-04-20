import { getCurrentUser, updateUser, logout, isAuthenticated, getSavingsGoals, saveSavingsGoals } from './storage.js';
import { showToast, formatCurrency, formatDate, generateReference } from './ui.js';

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }

    currentUser = getCurrentUser();
    if (!currentUser) {
        logout();
        window.location.href = 'index.html';
        return;
    }

    initUI();
    setupNavigation();
    setupForms();
    setupPrintFunctionality();
    loadExchangeRatesWithWorker();

    // TEMA 8: Escuchamos el CustomEvent de nueva transacción
    document.addEventListener('bancoAcme:nuevaTransaccion', (e) => {
        console.log('✅ Nueva transacción detectada via CustomEvent:', e.detail);
        updateResumeView();
        updateTransactionsView();
    });
});

// ============================================================
// UI BASE
// ============================================================

function initUI() {
    const fullName = `${currentUser.names} ${currentUser.surnames}`;

    document.getElementById('userNameDisplay').textContent = currentUser.names;
    document.getElementById('userAvatar').textContent = currentUser.names.charAt(0).toUpperCase();

    document.querySelectorAll('.acc-num-label').forEach(el => el.textContent = currentUser.accountNumber);
    document.querySelectorAll('.acc-name-label').forEach(el => el.textContent = fullName);

    updateResumeView();
    updateTransactionsView();
    updateCertificateView();

    // FUNCIONALIDAD 4: Pedimos permiso de notificaciones al cargar
    requestNotificationPermission();
}

function updateResumeView() {
    document.getElementById('currentBalance').textContent = formatCurrency(currentUser.balance);
    document.getElementById('accountNumberDisplay').textContent = currentUser.accountNumber;
    document.getElementById('creationDateDisplay').textContent = new Date(currentUser.creationDate).toLocaleDateString('es-CO');
}

function updateTransactionsView() {
    const tbody = document.getElementById('transactionsTableBody');
    tbody.innerHTML = '';

    const recentTx = [...currentUser.transactions].reverse().slice(0, 10);

    if (recentTx.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay transacciones registradas</td></tr>';
        return;
    }

    recentTx.forEach(tx => {
        const isPositive = tx.type === 'Consignación';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(tx.date)}</td>
            <td>${tx.reference}</td>
            <td><span class="type-badge ${isPositive ? 'type-consignacion' : 'type-retiro'}">${tx.type}</span></td>
            <td>${tx.concept}</td>
            <td class="${isPositive ? 'val-positive' : 'val-negative'} text-right">
                ${isPositive ? '+' : '-'} ${formatCurrency(tx.value)}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateCertificateView() {
    document.getElementById('certName').textContent = `${currentUser.names} ${currentUser.surnames}`;
    document.getElementById('certDocType').textContent = currentUser.docType;
    document.getElementById('certDocNumber').textContent = currentUser.docNumber;
    document.getElementById('certAccount').textContent = currentUser.accountNumber;
    document.getElementById('certDate').textContent = new Date(currentUser.creationDate).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('certToday').textContent = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ============================================================
// TRANSACCIONES BASE
// ============================================================

function registerTransaction(type, concept, value) {
    const transaction = {
        date: new Date().toISOString(),
        reference: generateReference(),
        type,
        concept,
        value: parseFloat(value)
    };

    if (type === 'Consignación') {
        currentUser.balance += transaction.value;
    } else {
        currentUser.balance -= transaction.value;
    }

    currentUser.transactions.push(transaction);
    updateUser(currentUser);

    // FUNCIONALIDAD 4: Notificación del sistema
    notificarTransaccion(
        type === 'Consignación' ? 'Consignación registrada' : 'Retiro registrado',
        `${concept} — ${formatCurrency(transaction.value)}`,
        type === 'Consignación' ? 'consignacion' : 'retiro'
    );

    // TEMA 8: Disparamos el CustomEvent
    document.dispatchEvent(new CustomEvent('bancoAcme:nuevaTransaccion', { detail: transaction }));

    return transaction;
}

function showPrintModalForTransaction(tx) {
    const isPositive = tx.type === 'Consignación';
    const operator = isPositive ? '+' : '-';

    document.getElementById('voucherDetails').innerHTML = `
        <p><span>Fecha:</span> <strong>${formatDate(tx.date)}</strong></p>
        <p><span>Referencia:</span> <strong>${tx.reference}</strong></p>
        <p><span>Tipo:</span> <strong>${tx.type}</strong></p>
        <p><span>Concepto:</span> <strong style="max-width:200px; text-align:right;">${tx.concept}</strong></p>
        <p><span>Valor Final:</span> <strong style="font-size:1.25rem;">${operator} ${formatCurrency(tx.value)}</strong></p>
        <p style="margin-top:1.5rem; padding-top:1rem; border-top:1px dashed #d2d2d7; flex-direction:column; align-items:center;">
            <span style="font-size:0.8rem; margin-bottom:5px;">Responsable Titular:</span>
            <strong>${currentUser.names} ${currentUser.surnames}</strong>
        </p>
    `;

    document.getElementById('printModal').classList.add('active');
}

// ============================================================
// FORMULARIOS
// ============================================================

function setupForms() {
    // Depósito
    document.getElementById('depositForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = document.getElementById('depositAmount').value;
        if (amount <= 0) { showToast('Ingrese un valor válido mayor a 0', 'error'); return; }
        const tx = registerTransaction('Consignación', 'Consignación por canal electrónico', amount);
        showToast('Consignación exitosa', 'success');
        e.target.reset();
        showPrintModalForTransaction(tx);
    });

    // Retiro
    document.getElementById('withdrawForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('withdrawAmount').value);
        if (amount <= 0) { showToast('Ingrese un valor válido mayor a 0', 'error'); return; }
        if (amount > currentUser.balance) { showToast('Saldo insuficiente', 'error'); return; }
        const tx = registerTransaction('Retiro', 'Retiro de dinero', amount);
        showToast('Retiro exitoso', 'success');
        e.target.reset();
        showPrintModalForTransaction(tx);
    });

    // Servicios
    document.getElementById('servicesForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const serviceType = document.getElementById('serviceType').value;
        const ref = document.getElementById('serviceRef').value;
        const amount = parseFloat(document.getElementById('serviceAmount').value);
        if (!serviceType || !ref || amount <= 0) { showToast('Complete el formulario correctamente', 'error'); return; }
        if (amount > currentUser.balance) { showToast('Saldo insuficiente', 'error'); return; }
        const tx = registerTransaction('Retiro', `Pago de servicio público ${serviceType} (Ref: ${ref})`, amount);
        showToast('Pago de servicio exitoso', 'success');
        e.target.reset();
        showPrintModalForTransaction(tx);
    });

    // ----------------------
    // FUNCIONALIDAD 2: Transferencias
    // ----------------------
    document.getElementById('transferForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const cuenta = document.getElementById('transferAccount').value.trim();
        const monto = parseFloat(document.getElementById('transferAmount').value);
        realizarTransferencia(cuenta, monto);
        e.target.reset();
    });

    // ----------------------
    // FUNCIONALIDAD 3: Metas de Ahorro
    // ----------------------
    document.getElementById('goalForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('goalName').value.trim();
        const target = document.getElementById('goalTarget').value;
        addSavingsGoal(name, target);
        e.target.reset();
    });

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        logout();
        window.location.href = 'index.html';
    });
}

// ============================================================
// NAVEGACIÓN
// ============================================================

function setupNavigation() {
    const links = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('.view-section');
    const pageTitle = document.getElementById('pageTitle');

    const titles = {
        'resume': 'Resumen Financiero',
        'transactions': 'Historial de Transacciones',
        'deposit': 'Consignación Electrónica',
        'withdraw': 'Retiro de Dinero',
        'transfer': 'Transferencia Bancaria',
        'services': 'Pago de Servicios',
        'savings': 'Metas de Ahorro',
        'certificate': 'Certificado Bancario'
    };

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            links.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            link.classList.add('active');
            const targetId = link.getAttribute('data-target');
            document.getElementById(targetId)?.classList.add('active');
            pageTitle.textContent = titles[targetId] || '';

            // Refresco específico por sección
            if (targetId === 'transactions') updateTransactionsView();
            if (targetId === 'certificate') updateCertificateView();
            if (targetId === 'resume') updateResumeView();
            if (targetId === 'savings') loadSavingsGoals(); // FUNCIONALIDAD 3
        });
    });
}

// ============================================================
// IMPRESIÓN
// ============================================================

function setupPrintFunctionality() {
    // Imprimir transacciones
    document.getElementById('printTransactionsBtn')?.addEventListener('click', () => {
        const printArea = document.getElementById('transactionsPrintArea').innerHTML;
        const original = document.body.innerHTML;
        document.body.innerHTML = `
            <div style="padding:20px;">
                <h2>Banco Acme — Últimas Transacciones</h2>
                <p>Titular: ${currentUser.names} ${currentUser.surnames} — Cuenta: ${currentUser.accountNumber}</p>
                <hr>${printArea}
            </div>`;
        window.print();
        document.body.innerHTML = original;
        window.location.reload();
    });

    // Imprimir certificado
    document.getElementById('printCertBtn')?.addEventListener('click', () => {
        const printArea = document.getElementById('certificatePrintArea').innerHTML;
        const original = document.body.innerHTML;
        document.body.innerHTML = `<div style="max-width:800px; margin:40px auto;">${printArea}</div>`;
        window.print();
        document.body.innerHTML = original;
        window.location.reload();
    });

    // Cerrar modal
    document.getElementById('closePrintModal')?.addEventListener('click', () => {
        document.getElementById('printModal').classList.remove('active');
    });

    window.addEventListener('click', (e) => {
        const modal = document.getElementById('printModal');
        if (e.target === modal) modal.classList.remove('active');
    });

    document.getElementById('printVoucherBtn')?.addEventListener('click', () => window.print());

    // ----------------------
    // FUNCIONALIDAD 1: Exportar CSV
    // ----------------------
    document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
        exportTransactionsToCSV(currentUser);
    });
}

// ============================================================
// FUNCIONALIDAD 1: EXPORTAR CSV
// ============================================================

function exportTransactionsToCSV(user) {
    if (!user.transactions || user.transactions.length === 0) {
        showToast('No hay transacciones para exportar', 'error');
        return;
    }

    // Encabezados de columnas
    const headers = ['Fecha', 'Referencia', 'Tipo', 'Concepto', 'Valor (COP)'];

    // Convertimos cada transacción a fila CSV
    const rows = user.transactions.map(tx => {
        const fecha = new Date(tx.date).toLocaleDateString('es-CO');
        const valor = tx.type === 'Consignación' ? tx.value : -tx.value;
        const concepto = `"${tx.concept}"`;
        return [fecha, tx.reference, tx.type, concepto, valor].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    // Creamos el Blob (archivo en memoria)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // URL temporal que apunta al Blob
    const url = URL.createObjectURL(blob);

    // <a> invisible para forzar la descarga
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `historial_${user.accountNumber}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Liberamos memoria
    URL.revokeObjectURL(url);

    showToast('Historial exportado exitosamente', 'success');
}

// ============================================================
// FUNCIONALIDAD 2: TRANSFERENCIAS ENTRE CUENTAS
// ============================================================

function realizarTransferencia(accountNumberDestino, monto) {
    // Leemos todos los usuarios directamente de localStorage
    const users = JSON.parse(localStorage.getItem('banco_acme_users')) || [];
    const destino = users.find(u => u.accountNumber === accountNumberDestino);

    if (!destino) {
        showToast('Número de cuenta destino no encontrado', 'error');
        return;
    }

    if (destino.accountNumber === currentUser.accountNumber) {
        showToast('No puedes transferirte a tu propia cuenta', 'error');
        return;
    }

    if (!monto || monto <= 0) {
        showToast('El monto debe ser mayor a 0', 'error');
        return;
    }

    if (monto > currentUser.balance) {
        showToast('Saldo insuficiente para la transferencia', 'error');
        return;
    }

    const ref = generateReference();
    const fecha = new Date().toISOString();

    // Transacción de DÉBITO en el usuario origen (nosotros)
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

    // Transacción de CRÉDITO en el usuario destino
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

    // Notificación del sistema
    notificarTransaccion(
        'Transferencia enviada',
        `${formatCurrency(monto)} enviados a ${accountNumberDestino}`,
        'transferencia'
    );

    // CustomEvent para actualizar la UI
    document.dispatchEvent(new CustomEvent('bancoAcme:nuevaTransaccion', { detail: txOrigen }));

    showToast(`Transferencia de ${formatCurrency(monto)} enviada exitosamente`, 'success');
    showPrintModalForTransaction(txOrigen);
}

// ============================================================
// FUNCIONALIDAD 3: METAS DE AHORRO
// ============================================================

function loadSavingsGoals() {
    const goals = getSavingsGoals(currentUser.docNumber);
    const container = document.getElementById('goalsContainer');
    if (!container) return;

    // Limpiamos con jerarquía DOM (Tema 7)
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    if (goals.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'text-muted';
        empty.textContent = 'No tienes metas definidas aún.';
        container.appendChild(empty);
        return;
    }

    const fragment = document.createDocumentFragment();

    goals.forEach((goal, index) => {
        const progreso = Math.min((currentUser.balance / goal.target) * 100, 100).toFixed(1);
        const completada = currentUser.balance >= goal.target;

        const card = document.createElement('div');
        card.style.cssText = `
            background: rgba(30,30,32,0.4);
            border: 1px solid rgba(255,255,255,0.07);
            border-radius: 16px;
            padding: 1.5rem;
            margin-bottom: 1rem;
        `;

        // Header con nombre y badge
        const header = document.createElement('div');
        header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:0.8rem;';

        const nombre = document.createElement('strong');
        nombre.textContent = goal.name;

        const badge = document.createElement('span');
        badge.className = `type-badge ${completada ? 'type-consignacion' : 'type-retiro'}`;
        badge.textContent = completada ? '✓ Lograda' : `${progreso}%`;

        header.append(nombre, badge);

        // Barra de progreso
        const barContainer = document.createElement('div');
        barContainer.style.cssText = 'background:rgba(255,255,255,0.08); border-radius:980px; height:6px; overflow:hidden; margin-bottom:0.8rem;';

        const bar = document.createElement('div');
        bar.style.cssText = `height:100%; width:${progreso}%; background:${completada ? '#34c759' : '#0071e3'}; border-radius:980px; transition:width 0.6s ease;`;
        barContainer.appendChild(bar);

        // Detalle
        const detalle = document.createElement('div');
        detalle.style.cssText = 'display:flex; justify-content:space-between; font-size:0.85rem; color:rgba(255,255,255,0.4);';
        detalle.innerHTML = `
            <span>Balance actual: <strong style="color:white">${formatCurrency(currentUser.balance)}</strong></span>
            <span>Meta: <strong style="color:white">${formatCurrency(goal.target)}</strong></span>
        `;

        // Botón eliminar
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Eliminar meta';
        deleteBtn.style.cssText = 'margin-top:0.8rem; background:none; border:none; color:#ff3b30; cursor:pointer; font-size:0.85rem;';
        deleteBtn.addEventListener('click', () => {
            const currentGoals = getSavingsGoals(currentUser.docNumber);
            currentGoals.splice(index, 1);
            saveSavingsGoals(currentUser.docNumber, currentGoals);
            loadSavingsGoals();
        });

        card.append(header, barContainer, detalle, deleteBtn);
        fragment.appendChild(card);
    });

    container.appendChild(fragment);
}

function addSavingsGoal(name, target) {
    if (!name || target <= 0) {
        showToast('Completa la meta correctamente', 'error');
        return;
    }

    const goals = getSavingsGoals(currentUser.docNumber);

    // Spread operator para no mutar el array original
    const newGoals = [...goals, {
        name,
        target: parseFloat(target),
        createdAt: new Date().toISOString()
    }];

    saveSavingsGoals(currentUser.docNumber, newGoals);
    showToast(`Meta "${name}" creada exitosamente`, 'success');
    loadSavingsGoals();
}

// ============================================================
// FUNCIONALIDAD 4: NOTIFICACIONES DEL NAVEGADOR
// ============================================================

async function requestNotificationPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
        const permiso = await Notification.requestPermission();
        return permiso === 'granted';
    }
    return false;
}

async function notificarTransaccion(titulo, cuerpo, tipo = 'info') {
    const tienePermiso = await requestNotificationPermission();
    if (!tienePermiso) return;

    const iconos = {
        consignacion: '💰',
        retiro: '💸',
        transferencia: '🔁',
        info: '🏦'
    };

    const notificacion = new Notification(`${iconos[tipo]} Banco Acme`, {
        body: `${titulo}\n${cuerpo}`,
        icon: 'img/ChatGPT Image 10 abr 2026, 08_13_43 a.m..png',
        tag: `banco-acme-${Date.now()}`,
        silent: false
    });

    setTimeout(() => notificacion.close(), 5000);

    notificacion.onclick = () => {
        window.focus();
        notificacion.close();
    };
}

// ============================================================
// FUNCIONALIDAD 5: WEB WORKER PARA TASAS DE CAMBIO
// ============================================================

function loadExchangeRatesWithWorker() {
    const container = document.getElementById('tasasContainer');
    const status = document.getElementById('tasasStatus');
    if (!container || !status) return;

    // Si el navegador no soporta Workers, usamos fetch directo como fallback
    if (!window.Worker) {
        loadExchangeRatesFallback();
        return;
    }

    // Creamos el Worker en su propio hilo
    const worker = new Worker('js/workers/exchangeWorker.js');

    // Le enviamos la orden de trabajo
    worker.postMessage('fetchRates');

    // Escuchamos la respuesta
    worker.onmessage = function(e) {
        const { success, rates, error } = e.data;

        if (!success) {
            status.textContent = 'Fallo al conectar';
            status.className = 'type-badge type-retiro';
            worker.terminate();
            return;
        }

        // Renderizamos con DOM puro (Tema 6 y 7)
        while (container.firstChild) container.removeChild(container.firstChild);

        const nombresMonedas = { COP: 'Pesos (COP)', EUR: 'Euros (EUR)', GBP: 'Libras (GBP)' };
        const fragment = document.createDocumentFragment();

        for (const [codigo, valor] of Object.entries(rates)) {
            const card = document.createElement('div');
            card.style.cssText = 'flex:1; min-width:140px; padding:1rem; border-radius:12px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03);';

            const nameEl = document.createElement('div');
            nameEl.className = 'meta-label';
            nameEl.textContent = '1 Dólar =';

            const valueEl = document.createElement('strong');
            valueEl.style.cssText = 'font-size:1.3rem; display:block; margin-top:0.5rem;';
            valueEl.textContent = `${valor.toLocaleString('es-CO')} ${codigo}`;

            card.append(nameEl, valueEl);
            fragment.append(card);
        }

        container.style.cssText = 'display:flex; gap:1rem; flex-wrap:wrap; margin-top:1rem;';
        container.append(fragment);

        status.textContent = 'Actualizado ✅';
        status.className = 'type-badge type-consignacion';

        // Terminamos el Worker, ya hizo su trabajo
        worker.terminate();
    };

    worker.onerror = function(err) {
        console.error('Error en Worker:', err);
        status.textContent = 'Error en Worker';
        status.className = 'type-badge type-retiro';
        worker.terminate();
    };
}

// Fallback por si el navegador no soporta Workers
async function loadExchangeRatesFallback() {
    const container = document.getElementById('tasasContainer');
    const status = document.getElementById('tasasStatus');
    try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        if (!response.ok) throw new Error('Error de red');
        const data = await response.json();
        const rates = { COP: data.rates.COP, EUR: data.rates.EUR, GBP: data.rates.GBP };

        while (container.firstChild) container.removeChild(container.firstChild);
        const fragment = document.createDocumentFragment();

        for (const [codigo, valor] of Object.entries(rates)) {
            const card = document.createElement('div');
            card.style.cssText = 'flex:1; min-width:140px; padding:1rem; border-radius:12px; border:1px solid rgba(255,255,255,0.08);';
            const nameEl = document.createElement('div');
            nameEl.className = 'meta-label';
            nameEl.textContent = '1 Dólar =';
            const valueEl = document.createElement('strong');
            valueEl.style.cssText = 'font-size:1.3rem; display:block; margin-top:0.5rem;';
            valueEl.textContent = `${valor.toLocaleString('es-CO')} ${codigo}`;
            card.append(nameEl, valueEl);
            fragment.append(card);
        }

        container.style.cssText = 'display:flex; gap:1rem; flex-wrap:wrap; margin-top:1rem;';
        container.append(fragment);
        status.textContent = 'Actualizado ✅';
        status.className = 'type-badge type-consignacion';
    } catch (error) {
        status.textContent = 'Fallo al conectar';
        status.className = 'type-badge type-retiro';
    }
}
