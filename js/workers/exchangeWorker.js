// js/workers/exchangeWorker.js
// ============================================================
// Este archivo corre en un HILO SEPARADO del navegador.
// No tiene acceso a document, window ni al DOM.
// Solo puede hacer fetch y comunicarse con postMessage.
// ============================================================

self.onmessage = async function(e) {
    if (e.data === 'fetchRates') {
        try {
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');

            if (!response.ok) throw new Error('Error de red');

            const data = await response.json();

            // Solo enviamos las tasas que necesitamos
            const rates = {
                COP: data.rates.COP,
                EUR: data.rates.EUR,
                GBP: data.rates.GBP
            };

            // Enviamos el resultado al hilo principal
            self.postMessage({ success: true, rates });

        } catch (error) {
            // Si algo falla, avisamos al hilo principal
            self.postMessage({ success: false, error: error.message });
        }
    }
};
