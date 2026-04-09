import { getCurrentUser, updateUser, logout, isAuthenticated } from './storage.js';
import { showToast, formatCurrency, formatDate, generateReference } from './ui.js';

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    // Protección de ruta
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

    // Inicializar UI
    initUI();
    setupNavigation();
    setupForms();
    setupPrintFunctionality();
});

function initUI() {
    const fullName = `${currentUser.names} ${currentUser.surnames}`;
    
    // Header Info
    document.getElementById('userNameDisplay').textContent = currentUser.names;
    document.getElementById('userAvatar').textContent = currentUser.names.charAt(0).toUpperCase();

    // Labels account info in multiple tabs
    const accLabels = document.querySelectorAll('.acc-num-label');
    accLabels.forEach(el => el.textContent = currentUser.accountNumber);
    const accNames = document.querySelectorAll('.acc-name-label');
    accNames.forEach(el => el.textContent = fullName);

    // Update specific views
    updateResumeView();
    updateTransactionsView();
    updateCertificateView();
}

function updateResumeView() {
    document.getElementById('currentBalance').textContent = formatCurrency(currentUser.balance);
    document.getElementById('accountNumberDisplay').textContent = currentUser.accountNumber;
    document.getElementById('creationDateDisplay').textContent = new Date(currentUser.creationDate).toLocaleDateString('es-CO');
}

function updateTransactionsView() {
    const tbody = document.getElementById('transactionsTableBody');
    tbody.innerHTML = '';

    // Tomar las últimas 10 transacciones
    const recentTx = [...currentUser.transactions].reverse().slice(0, 10);

    if (recentTx.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay transacciones registradas</td></tr>';
        return;
    }

    recentTx.forEach(tx => {
        const isPositive = tx.type === 'Consignación';
        const valClass = isPositive ? 'val-positive' : 'val-negative';
        const typeClass = isPositive ? 'type-consignacion' : 'type-retiro';
        const operator = isPositive ? '+' : '-';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(tx.date)}</td>
            <td>${tx.reference}</td>
            <td><span class="type-badge ${typeClass}">${tx.type}</span></td>
            <td>${tx.concept}</td>
            <td class="${valClass}">${operator} ${formatCurrency(tx.value)}</td>
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
    updateResumeView();
    updateTransactionsView();
    
    return transaction;
}

function showPrintModalForTransaction(tx) {
    const isPositive = tx.type === 'Consignación';
    const operator = isPositive ? '+' : '-';
    
    const detailsDiv = document.getElementById('voucherDetails');
    detailsDiv.innerHTML = `
        <p><strong>Fecha:</strong> ${formatDate(tx.date)}</p>
        <p><strong>Referencia:</strong> ${tx.reference}</p>
        <p><strong>Tipo:</strong> ${tx.type}</p>
        <p><strong>Concepto:</strong> ${tx.concept}</p>
        <p><strong>Valor:</strong> <span style="font-size: 1.2rem; font-weight: bold;">${operator} ${formatCurrency(tx.value)}</span></p>
        <hr style="margin: 1rem 0; border: none; border-top: 1px dashed #ccc;">
        <p><strong>Titular:</strong> ${currentUser.names} ${currentUser.surnames}</p>
        <p><strong>N° Cuenta:</strong> ${currentUser.accountNumber}</p>
    `;
    
    const modal = document.getElementById('printModal');
    modal.classList.add('active');
}

function setupForms() {
    // Deposit Form
    const depositForm = document.getElementById('depositForm');
    if (depositForm) {
        depositForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const amount = document.getElementById('depositAmount').value;
            
            if (amount <= 0) {
                showToast('Ingrese un valor válido mayor a 0', 'error');
                return;
            }

            const tx = registerTransaction('Consignación', 'Consignación por canal electrónico', amount);
            showToast('Consignación exitosa', 'success');
            depositForm.reset();
            showPrintModalForTransaction(tx);
        });
    }

    // Withdraw Form
    const withdrawForm = document.getElementById('withdrawForm');
    if (withdrawForm) {
        withdrawForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const amount = parseFloat(document.getElementById('withdrawAmount').value);
            
            if (amount <= 0) {
                showToast('Ingrese un valor válido mayor a 0', 'error');
                return;
            }

            if (amount > currentUser.balance) {
                showToast('Saldo insuficiente', 'error');
                return;
            }

            const tx = registerTransaction('Retiro', 'Retiro de dinero', amount);
            showToast('Retiro exitoso', 'success');
            withdrawForm.reset();
            showPrintModalForTransaction(tx);
        });
    }

    // Services Form
    const servicesForm = document.getElementById('servicesForm');
    if (servicesForm) {
        servicesForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const serviceType = document.getElementById('serviceType').value;
            const ref = document.getElementById('serviceRef').value;
            const amount = parseFloat(document.getElementById('serviceAmount').value);
            
            if (!serviceType || !ref || amount <= 0) {
                showToast('Por favor, complete correctamente el formulario', 'error');
                return;
            }

            if (amount > currentUser.balance) {
                showToast('Saldo insuficiente para pagar este servicio', 'error');
                return;
            }

            const tx = registerTransaction('Retiro', `Pago de servicio público ${serviceType} (Ref: ${ref})`, amount);
            showToast('Pago de servicio exitoso', 'success');
            servicesForm.reset();
            showPrintModalForTransaction(tx);
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            logout();
            window.location.href = 'index.html';
        });
    }
}

function setupNavigation() {
    const links = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('.view-section');
    const pageTitle = document.getElementById('pageTitle');

    const titles = {
        'resume': 'Resumen de Cuenta',
        'transactions': 'Historial de Transacciones',
        'deposit': 'Consignación Electrónica',
        'withdraw': 'Retiro de Dinero',
        'services': 'Pago de Servicios',
        'certificate': 'Certificado Bancario'
    };

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Remove active classes
            links.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            // Add active class
            link.classList.add('active');
            const targetId = link.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
            
            // Update Title
            pageTitle.textContent = titles[targetId];

            // Specific refresh
            if (targetId === 'transactions') updateTransactionsView();
            if (targetId === 'certificate') updateCertificateView();
            if (targetId === 'resume') updateResumeView();
        });
    });
}

function setupPrintFunctionality() {
    // Print Transactions
    const printTxBtn = document.getElementById('printTransactionsBtn');
    if (printTxBtn) {
        printTxBtn.addEventListener('click', () => {
            const originalContent = document.body.innerHTML;
            const printArea = document.getElementById('transactionsPrintArea').innerHTML;
            
            document.body.innerHTML = `
                <div style="padding: 20px;">
                    <h2>Banco Acme - Últimas Transacciones</h2>
                    <p>Titular: ${currentUser.names} ${currentUser.surnames} - Cuenta: ${currentUser.accountNumber}</p>
                    <hr>
                    ${printArea}
                </div>
            `;
            window.print();
            document.body.innerHTML = originalContent;
            window.location.reload(); 
        });
    }

    // Print Certificate
    const printCertBtn = document.getElementById('printCertBtn');
    if (printCertBtn) {
        printCertBtn.addEventListener('click', () => {
            const originalContent = document.body.innerHTML;
            const printArea = document.getElementById('certificatePrintArea').innerHTML;
            
            document.body.innerHTML = `
                <div style="max-width: 800px; margin: 40px auto;">
                    ${printArea}
                </div>
            `;
            window.print();
            document.body.innerHTML = originalContent;
            window.location.reload();
        });
    }

    // Modal close
    const closeModal = document.getElementById('closePrintModal');
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            document.getElementById('printModal').classList.remove('active');
        });
    }
    
    // Al tocar fuera del modal
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('printModal');
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    // Print Voucher Button
    const printVoucherBtn = document.getElementById('printVoucherBtn');
    if (printVoucherBtn) {
        printVoucherBtn.addEventListener('click', () => {
            window.print();
        });
    }
}
