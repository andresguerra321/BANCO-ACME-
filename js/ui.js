// js/ui.js

/**
 * Muestra un mensaje de notificación flotante (Toast)
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - 'success', 'error', 'info'
 */
export function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Eliminar después de 3.5 segundos
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, 3500);
}

/**
 * Formatea moneda a COP
 */
export function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(amount);
}

/**
 * Formatea fecha para mostrar
 */
export function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('es-CO', options);
}

/**
 * Genera un número de referencia aleatorio
 */
export function generateReference() {
    return 'REF-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}
