// ============================================================
// FUNCIONALIDAD 3: METAS DE AHORRO
// Usa: localStorage, DOM, objetos, spread operator
// Tema cubierto: Objetos + DOM + colecciones
// ============================================================

// --- AGREGAR EN js/storage.js ---

export function getSavingsGoals(docNumber) {
    const key = `banco_acme_goals_${docNumber}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

export function saveSavingsGoals(docNumber, goals) {
    const key = `banco_acme_goals_${docNumber}`;
    localStorage.setItem(key, JSON.stringify(goals));
}

// --- AGREGAR EN js/dashboard.js ---

/**
 * Carga y renderiza las metas de ahorro del usuario
 */
function loadSavingsGoals() {
    const goals = getSavingsGoals(currentUser.docNumber);
    const container = document.getElementById('goalsContainer');
    if (!container) return;

    // Limpiamos usando jerarquía DOM (Tema 7)
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

        // Tarjeta de meta
        const card = document.createElement('div');
        card.style.cssText = `
            background: rgba(30,30,32,0.4);
            border: 1px solid rgba(255,255,255,0.07);
            border-radius: 16px;
            padding: 1.5rem;
            margin-bottom: 1rem;
        `;

        // Nombre y estado
        const header = document.createElement('div');
        header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:0.8rem;';

        const nombre = document.createElement('strong');
        nombre.textContent = goal.name;
        nombre.style.fontSize = '1rem';

        const badge = document.createElement('span');
        badge.className = `type-badge ${completada ? 'type-consignacion' : 'type-retiro'}`;
        badge.textContent = completada ? '✓ Lograda' : `${progreso}%`;

        header.append(nombre, badge);

        // Barra de progreso
        const barContainer = document.createElement('div');
        barContainer.style.cssText = 'background: rgba(255,255,255,0.08); border-radius: 980px; height: 6px; overflow: hidden; margin-bottom: 0.8rem;';

        const bar = document.createElement('div');
        bar.style.cssText = `
            height: 100%;
            width: ${progreso}%;
            background: ${completada ? '#34c759' : '#0071e3'};
            border-radius: 980px;
            transition: width 0.6s ease;
        `;
        barContainer.appendChild(bar);

        // Detalle de montos
        const detalle = document.createElement('div');
        detalle.style.cssText = 'display:flex; justify-content:space-between; font-size:0.85rem; color: rgba(255,255,255,0.4);';
        detalle.innerHTML = `
            <span>Balance actual: <strong style="color:white">${formatCurrency(currentUser.balance)}</strong></span>
            <span>Meta: <strong style="color:white">${formatCurrency(goal.target)}</strong></span>
        `;

        // Botón eliminar
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Eliminar';
        deleteBtn.style.cssText = 'margin-top:0.8rem; background:none; border:none; color:#ff3b30; cursor:pointer; font-size:0.85rem;';
        deleteBtn.addEventListener('click', () => {
            const goals = getSavingsGoals(currentUser.docNumber);
            goals.splice(index, 1);
            saveSavingsGoals(currentUser.docNumber, goals);
            loadSavingsGoals(); // Re-render
        });

        card.append(header, barContainer, detalle, deleteBtn);
        fragment.appendChild(card);
    });

    container.appendChild(fragment);
}

/**
 * Registra una nueva meta de ahorro
 */
function addSavingsGoal(name, target) {
    if (!name || target <= 0) {
        showToast('Completa correctamente la meta', 'error');
        return;
    }

    const goals = getSavingsGoals(currentUser.docNumber);

    // Spread para agregar sin mutar el array original directamente
    const newGoals = [...goals, { name, target: parseFloat(target), createdAt: new Date().toISOString() }];
    saveSavingsGoals(currentUser.docNumber, newGoals);

    showToast(`Meta "${name}" creada exitosamente`, 'success');
    loadSavingsGoals();
}

// ============================================================
// AGREGAR EN dashboard.html — nueva sección:
//
// Nav: <li><a href="#" data-target="savings">Metas</a></li>
//
// Sección:
// <section id="savings" class="view-section">
//   <div class="panel center-panel">
//     <h3>Metas de Ahorro</h3>
//     <form id="goalForm" class="minimal-form" style="margin-bottom:2rem;">
//       <div class="input-modern">
//         <input type="text" id="goalName" placeholder="Nombre de la meta (ej: Vacaciones)" required>
//       </div>
//       <div class="input-modern large-input">
//         <input type="number" id="goalTarget" placeholder="0.00" min="1" required>
//         <span>$</span>
//       </div>
//       <button type="submit" class="btn-premium full-w" style="margin-top:1rem;">Agregar Meta</button>
//     </form>
//     <div id="goalsContainer"></div>
//   </div>
// </section>
//
// Y en setupForms():
//    const goalForm = document.getElementById('goalForm');
//    if (goalForm) {
//        goalForm.addEventListener('submit', (e) => {
//            e.preventDefault();
//            const name = document.getElementById('goalName').value.trim();
//            const target = document.getElementById('goalTarget').value;
//            addSavingsGoal(name, target);
//            goalForm.reset();
//        });
//    }
//
// Y en setupNavigation() agrega en el objeto titles:
//    'savings': 'Metas de Ahorro'
// ============================================================
