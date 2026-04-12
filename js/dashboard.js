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
    
    // Ejecutar petición a API pública
    loadExchangeRates();

    // ==========================================
    // TEMA 8: EVENTOS PERSONALIZADOS (CustomEvents)
    // ==========================================
    // El Dashboard ahora "escucha" pacíficamente a que ocurra nuestro propio evento inventado,
    // separando por completo la interfaz visual de la matemática de las transacciones.
    document.addEventListener('bancoAcme:nuevaTransaccion', (e) => {
        const transaccion = e.detail;
        console.log('✅ Se detectó una nueva transacción mediante CustomEvent:', transaccion);
        
        // Solo cuando escuchamos el evento actualizamos la pantalla automáticamente
        updateResumeView();
        updateTransactionsView();
    });
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
            <td class="${valClass} text-right">${operator} ${formatCurrency(tx.value)}</td>
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
    
    // ==========================================
    // TEMA 8: Despachando nuestro CustomEvent
    // ==========================================
    // Ya NO llamamos a updateResumeView() ni updateTransactionsView() directamente, 
    // previniendo código enredado o redundancia.
    
    // Empaquetamos la variable 'transaction' en el objeto 'detail'
    const eventoDinamico = new CustomEvent('bancoAcme:nuevaTransaccion', { 
        detail: transaction 
    });
    
    // Disparamos nuestro propio evento a todo el documento
    document.dispatchEvent(eventoDinamico);
    
    return transaction;
}

function showPrintModalForTransaction(tx) {
    const isPositive = tx.type === 'Consignación';
    const operator = isPositive ? '+' : '-';
    
    const detailsDiv = document.getElementById('voucherDetails');
    detailsDiv.innerHTML = `
        <p><span>Fecha:</span> <strong>${formatDate(tx.date)}</strong></p>
        <p><span>Referencia:</span> <strong>${tx.reference}</strong></p>
        <p><span>Tipo:</span> <strong>${tx.type}</strong></p>
        <p><span>Concepto:</span> <strong style="max-width:200px; text-align:right;">${tx.concept}</strong></p>
        <p><span>Valor Final:</span> <strong style="font-size: 1.25rem;">${operator} ${formatCurrency(tx.value)}</strong></p>
        <p style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px dashed #d2d2d7; flex-direction:column; align-items:center; ">
            <span style="font-size:0.8rem; margin-bottom:5px;">Responsable Titular:</span>
            <strong>${currentUser.names} ${currentUser.surnames}</strong>
        </p>
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

/**
 * ==============================================================
 * TEMAS 6, 7 y 10: Solicitudes (Fetch) y Manipulación Avanzada
 * ==============================================================
 */
async function loadExchangeRates() {
    const container = document.getElementById('tasasContainer');
    const status = document.getElementById('tasasStatus');
    if (!container || !status) return;

    try {
        // TEMA 10: Solicitudes (fetch API real)
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        if (!response.ok) throw new Error('Error en la red');
        
        const data = await response.json();
        const rates = {
            'Pesos (COP)': data.rates.COP,
            'Euros (EUR)': data.rates.EUR,
            'Libras (GBP)': data.rates.GBP
        };

        // TEMA 6 y 7: Manipulación Avanzada del DOM y Jerarquía de Nodos
        
        // 1. Limpiamos el contenedor usando recorrido y jerarquía (Más veloz que innerHTML = '')
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        // 2. DocumentFragment: Un "DOM invisible" que ayuda al rendimiento
        // Al armar los nodos en este fragmento virtual, el navegador no redibuja la pantalla muchas veces
        const fragment = document.createDocumentFragment();

        for (const [currencyName, rateValue] of Object.entries(rates)) {
            // TEMA 6: Creación de Nodos directos y clases
            const card = document.createElement('div');
            card.classList.add('balance-meta');
            card.style.flex = '1';
            card.style.minWidth = '140px';
            card.style.padding = '1rem';
            card.style.borderRadius = '12px';
            card.style.border = '1px solid #d2d2d7';

            const nameEl = document.createElement('div');
            nameEl.classList.add('meta-label');
            nameEl.textContent = `1 Dólar =`;

            const valueEl = document.createElement('strong');
            valueEl.style.fontSize = '1.3rem';
            valueEl.style.display = 'block';
            valueEl.style.marginTop = '0.5rem';
            valueEl.textContent = `${rateValue.toLocaleString('es-CO')} ${currencyName.substring(0, 3)}`;

            // TEMA 7: Ensamblaje de jerarquías avanzadas (usando .append en lugar de innerHTML)
            card.append(nameEl, valueEl); 
            
            // Insertamos la tarjeta en nuestro DOM Virtual
            fragment.append(card);
        }

        // 3. Un solo impacto a la vista del usuario
        // Metemos el paquete completo al DOM real
        container.append(fragment);
        
        status.textContent = 'Actualizado ✅';
        status.className = 'type-badge type-consignacion';

    } catch (error) {
        console.error('Error fetching rates:', error);
        status.textContent = 'Fallo al conectar';
        status.className = 'type-badge type-retiro';
    }
}
