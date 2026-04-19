import { getCurrentUser, updateUser, logout, isAuthenticated, getUserByAccount } from './storage.js';
import { showToast, formatCurrency, formatDate, generateReference } from './ui.js';

let currentUser = null;
let currentTxPage = 1;
const txPerPage = 5;
let inactivityTimeout;

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
    setupPagination();
    setupInactivityTimer();
    
    // Ejecutar petición a API pública
    loadExchangeRates();

    // ==========================================
    // TEMA 8: EVENTOS PERSONALIZADOS (CustomEvents)
    // ==========================================
    document.addEventListener('bancoAcme:nuevaTransaccion', (e) => {
        const transaccion = e.detail;
        console.log('✅ Se detectó una nueva transacción mediante CustomEvent:', transaccion);
        
        updateResumeView();
        updateFlowChartView();
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
    updateFlowChartView();
    updateTransactionsView();
    updateCertificateView();
    renderContacts();
    renderActiveLoans();
}

function updateResumeView() {
    document.getElementById('currentBalance').textContent = formatCurrency(currentUser.balance);
    document.getElementById('accountNumberDisplay').textContent = currentUser.accountNumber;
    document.getElementById('creationDateDisplay').textContent = new Date(currentUser.creationDate).toLocaleDateString('es-CO');
}

function updateTransactionsView() {
    const tbody = document.getElementById('transactionsTableBody');
    tbody.innerHTML = '';

    const allTx = [...currentUser.transactions].reverse();
    const totalPages = Math.ceil(allTx.length / txPerPage) || 1;
    
    if (currentTxPage > totalPages) currentTxPage = totalPages;
    if (currentTxPage < 1) currentTxPage = 1;

    const start = (currentTxPage - 1) * txPerPage;
    const end = start + txPerPage;
    const paginatedTx = allTx.slice(start, end);

    if (paginatedTx.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay transacciones registradas</td></tr>';
    } else {
        paginatedTx.forEach(tx => {
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

    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const pageInfo = document.getElementById('pageInfoText');

    if (prevBtn) prevBtn.disabled = currentTxPage === 1;
    if (nextBtn) nextBtn.disabled = currentTxPage === totalPages;
    if (pageInfo) pageInfo.textContent = `Página ${currentTxPage} de ${totalPages}`;
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

    // Transfer Form
    const transferForm = document.getElementById('transferForm');
    if (transferForm) {
        transferForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const targetAccount = document.getElementById('targetAccount').value.trim();
            const amount = parseFloat(document.getElementById('transferAmount').value);
            
            if (!targetAccount || amount <= 0) {
                showToast('Por favor, complete correctamente el formulario', 'error');
                return;
            }

            if (targetAccount === currentUser.accountNumber) {
                showToast('No puedes transferir dinero a tu propia cuenta', 'error');
                return;
            }

            if (amount > currentUser.balance) {
                showToast('Saldo insuficiente para esta transferencia', 'error');
                return;
            }

            const targetUser = getUserByAccount(targetAccount);
            if (!targetUser) {
                showToast('La cuenta destino no existe en Banco Acme', 'error');
                return;
            }

            // 1. Registrar retiro del usuario actual usando el sistema del dashboard (actualiza DOM y localStorage)
            const txCurrent = registerTransaction('Retiro', `Trf. enviada a Cta: ${targetAccount}`, amount);
            
            // 2. Sumar al usuario destino y guardar su registro en localStorage
            const txTarget = {
                date: new Date().toISOString(),
                reference: txCurrent.reference, // Comparten la misma referencia de la operación
                type: 'Consignación',
                concept: `Trf. recibida de Cta: ${currentUser.accountNumber}`,
                value: amount
            };
            targetUser.balance += amount;
            targetUser.transactions.push(txTarget);
            updateUser(targetUser); // Actualizamos el usuario destino silenciosamente

            // Lógica de Contactos Frecuentes
            const saveContactCheckbox = document.getElementById('saveContact');
            if (saveContactCheckbox && saveContactCheckbox.checked) {
                currentUser.contacts = currentUser.contacts || [];
                const exists = currentUser.contacts.find(c => c.account === targetAccount);
                if (!exists) {
                    currentUser.contacts.push({ 
                        account: targetAccount, 
                        name: `${targetUser.names} ${targetUser.surnames}` 
                    });
                    updateUser(currentUser);
                    renderContacts();
                }
            }

            showToast('Transferencia exitosa', 'success');
            transferForm.reset();
            showPrintModalForTransaction(txCurrent);
        });
    }

    // Loan Form (Asincronía)
    const loanForm = document.getElementById('loanForm');
    if (loanForm) {
        loanForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const amount = parseFloat(document.getElementById('loanAmount').value);
            const installments = document.getElementById('loanInstallments').value;
            const submitBtn = document.getElementById('loanSubmitBtn');
            
            if (!amount || !installments || amount < 50000) {
                showToast('El monto mínimo es de $50,000', 'error');
                return;
            }

            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = 'Analizando perfil crediticio... ⏳';
            submitBtn.disabled = true;

            try {
                // AWAIT: Detenemos la ejecución esperando a "Datacrédito"
                await simularAnalisisCredito(amount);
                
                // Si llegamos aquí, la Promesa hizo resolve()
                currentUser.loans = currentUser.loans || [];
                currentUser.loans.push({
                    id: `CR-${Math.floor(Math.random() * 90000) + 10000}`,
                    amount: amount,
                    installments: parseInt(installments),
                    remaining: amount,
                    date: new Date().toISOString(),
                    status: 'Activo'
                });
                
                // Reutilizamos nuestra arquitectura existente para registrar el ingreso del dinero
                const tx = registerTransaction('Consignación', `Desembolso Crédito Aprobado a ${installments} meses`, amount);
                
                renderActiveLoans();
                showToast('¡Crédito Aprobado y Desembolsado!', 'success');
                loanForm.reset();
                showPrintModalForTransaction(tx);
                
            } catch (error) {
                // Si llegamos aquí, la Promesa hizo reject()
                showToast('Lo sentimos, solicitud rechazada por riesgo', 'error');
            } finally {
                // Pase lo que pase, restauramos el botón
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
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
        'transfer': 'Transferencia Directa',
        'deposit': 'Consignación Electrónica',
        'withdraw': 'Retiro de Dinero',
        'services': 'Pago de Servicios',
        'loans': 'Centro de Créditos',
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

// ==========================================
// NUEVAS FUNCIONALIDADES AVANZADAS
// ==========================================

function setupInactivityTimer() {
    const resetTimer = () => {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = setTimeout(() => {
            logout();
            window.location.href = 'index.html';
        }, 2 * 60 * 1000); // 2 minutos
    };

    document.addEventListener('mousemove', resetTimer);
    document.addEventListener('keydown', resetTimer);
    document.addEventListener('click', resetTimer);
    
    resetTimer(); // Iniciar
}

function updateFlowChartView() {
    if (!currentUser) return;
    
    let totalIncome = 0;
    let totalExpense = 0;

    currentUser.transactions.forEach(tx => {
        if (tx.type === 'Consignación') totalIncome += tx.value;
        else totalExpense += tx.value;
    });

    const max = Math.max(totalIncome, totalExpense);
    
    const incomeBar = document.getElementById('incomeBar');
    const expenseBar = document.getElementById('expenseBar');
    const incomeText = document.getElementById('incomeText');
    const expenseText = document.getElementById('expenseText');

    if (max === 0) {
        if (incomeBar) incomeBar.style.height = '0%';
        if (expenseBar) expenseBar.style.height = '0%';
    } else {
        const incomePercent = (totalIncome / max) * 100;
        const expensePercent = (totalExpense / max) * 100;
        
        if (incomeBar) incomeBar.style.height = `${incomePercent}%`;
        if (expenseBar) expenseBar.style.height = `${expensePercent}%`;
    }

    if (incomeText) incomeText.textContent = formatCurrency(totalIncome);
    if (expenseText) expenseText.textContent = formatCurrency(totalExpense);
}

function setupPagination() {
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentTxPage > 1) {
                currentTxPage--;
                updateTransactionsView();
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentTxPage++;
            updateTransactionsView();
        });
    }
}

function renderContacts() {
    const container = document.getElementById('contactsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!currentUser.contacts || currentUser.contacts.length === 0) {
        return;
    }

    const fragment = document.createDocumentFragment();
    currentUser.contacts.forEach(contact => {
        const badge = document.createElement('div');
        badge.className = 'type-badge type-consignacion';
        badge.style.cursor = 'pointer';
        badge.style.padding = '0.5rem 1rem';
        badge.style.borderRadius = '980px';
        badge.textContent = `${contact.name}`;
        badge.title = contact.account;
        
        badge.addEventListener('click', () => {
            const targetInput = document.getElementById('targetAccount');
            if (targetInput) targetInput.value = contact.account;
        });
        
        fragment.appendChild(badge);
    });
    
    container.appendChild(fragment);
}

function simularAnalisisCredito(monto) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // 70% de probabilidad de aprobación
            if (Math.random() > 0.3) {
                resolve({ aprobado: true, monto });
            } else {
                reject(new Error('Perfil de riesgo alto'));
            }
        }, 3000); // Tarda 3 segundos
    });
}

function renderActiveLoans() {
    const container = document.getElementById('activeLoansContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!currentUser.loans || currentUser.loans.length === 0) {
        return;
    }

    const fragment = document.createDocumentFragment();
    currentUser.loans.forEach(loan => {
        const card = document.createElement('div');
        card.classList.add('panel');
        card.style.flex = '1';
        card.style.minWidth = '250px';
        card.style.borderTop = '4px solid #ff3b30'; // Línea roja de deuda
        card.style.padding = '1.5rem';
        
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <span class="type-badge type-retiro" style="font-size: 0.75rem;">${loan.status}</span>
                <span style="font-size: 0.8rem; color: #6e6e73;">${loan.id}</span>
            </div>
            <h4 style="margin: 0.5rem 0; font-size: 1.1rem; color: #1d1d1f;">Deuda Actual</h4>
            <strong style="font-size: 1.5rem; color: #ff3b30; display: block;">${formatCurrency(loan.remaining)}</strong>
            <p style="font-size: 0.85rem; color: #6e6e73; margin-top: 0.8rem;">Préstamo original: <br><strong>${formatCurrency(loan.amount)}</strong> a ${loan.installments} cuotas</p>
        `;
        
        fragment.appendChild(card);
    });
    
    container.appendChild(fragment);
}

