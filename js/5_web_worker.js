// ============================================================
// FUNCIONALIDAD 5: WEB WORKER PARA TASAS DE CAMBIO
// Usa: Worker API, postMessage, onmessage
// Tema cubierto: Asincronía avanzada + APIs del navegador
// ============================================================

// ============================================================
// ARCHIVO 1: js/workers/exchangeWorker.js  (NUEVO ARCHIVO)
// Este archivo corre en un hilo separado, fuera del DOM
// ============================================================

// El Worker no tiene acceso a document ni window — solo a fetch y datos
self.onmessage = async function(e) {
    // Recibimos el mensaje desde el hilo principal
    if (e.data === 'fetchRates') {
        try {
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            
            if (!response.ok) throw new Error('Error de red');
            
            const data = await response.json();
            
            // Filtramos solo las tasas que necesitamos
            const rates = {
                COP: data.rates.COP,
                EUR: data.rates.EUR,
                GBP: data.rates.GBP
            };
            
            // Enviamos el resultado de vuelta al hilo principal
            self.postMessage({ success: true, rates });
            
        } catch (error) {
            // Si falla, enviamos el error
            self.postMessage({ success: false, error: error.message });
        }
    }
};


// ============================================================
// ARCHIVO 2: REEMPLAZAR loadExchangeRates() en js/dashboard.js
// ============================================================

/**
 * Versión con Web Worker de loadExchangeRates().
 * El fetch corre en un hilo separado para no bloquear la UI.
 */
function loadExchangeRatesWithWorker() {
    const container = document.getElementById('tasasContainer');
    const status = document.getElementById('tasasStatus');
    if (!container || !status) return;

    // Verificamos soporte de Workers
    if (!window.Worker) {
        console.warn('Web Workers no soportados. Usando fetch directo.');
        loadExchangeRates(); // Fallback a la función original
        return;
    }

    // 1. Creamos el Worker apuntando al archivo separado
    const worker = new Worker('js/workers/exchangeWorker.js', { type: 'module' });

    // 2. Le enviamos un mensaje para que empiece a trabajar
    worker.postMessage('fetchRates');

    // 3. Escuchamos cuando el Worker nos responde
    worker.onmessage = function(e) {
        const { success, rates, error } = e.data;

        if (!success) {
            console.error('Worker error:', error);
            status.textContent = 'Fallo al conectar';
            status.className = 'type-badge type-retiro';
            worker.terminate(); // Importante: cerrar el worker
            return;
        }

        // Renderizamos igual que antes (Tema 6 y 7)
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        const nombresMonedas = {
            COP: 'Pesos (COP)',
            EUR: 'Euros (EUR)',
            GBP: 'Libras (GBP)'
        };

        const fragment = document.createDocumentFragment();

        for (const [codigo, valor] of Object.entries(rates)) {
            const card = document.createElement('div');
            card.style.cssText = `
                flex: 1;
                min-width: 140px;
                padding: 1rem;
                border-radius: 12px;
                border: 1px solid rgba(255,255,255,0.08);
                background: rgba(255,255,255,0.03);
            `;

            const nameEl = document.createElement('div');
            nameEl.className = 'meta-label';
            nameEl.textContent = '1 Dólar =';

            const valueEl = document.createElement('strong');
            valueEl.style.cssText = 'font-size:1.3rem; display:block; margin-top:0.5rem;';
            valueEl.textContent = `${valor.toLocaleString('es-CO')} ${codigo}`;

            card.append(nameEl, valueEl);
            fragment.append(card);
        }

        container.style.display = 'flex';
        container.style.gap = '1rem';
        container.style.flexWrap = 'wrap';
        container.append(fragment);

        status.textContent = 'Actualizado ✅';
        status.className = 'type-badge type-consignacion';

        // 4. Terminamos el worker cuando ya no lo necesitamos
        worker.terminate();
    };

    // 5. Manejo de errores del Worker
    worker.onerror = function(err) {
        console.error('Error en Worker:', err);
        status.textContent = 'Error en Worker';
        status.className = 'type-badge type-retiro';
        worker.terminate();
    };
}

// ============================================================
// CÓMO INTEGRARLO:
//
// 1. Crear la carpeta: js/workers/
// 2. Crear el archivo: js/workers/exchangeWorker.js
//    (solo con el bloque self.onmessage de arriba)
//
// 3. En dashboard.js, reemplaza la llamada:
//    loadExchangeRates();
//    por:
//    loadExchangeRatesWithWorker();
//
// POR QUÉ USAR UN WEB WORKER:
// El fetch normal bloquea el event loop de JS si tarda mucho.
// Con un Worker, el fetch corre en otro hilo del CPU, y el 
// usuario puede seguir interactuando con el dashboard sin freeze.
// ============================================================
