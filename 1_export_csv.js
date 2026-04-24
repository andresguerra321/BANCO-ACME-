// ============================================================
// FUNCIONALIDAD 1: EXPORTAR HISTORIAL A CSV
// Usa: Blob, URL.createObjectURL, elemento <a> dinámico
// Tema cubierto: Manipulación del DOM + JS nativo
// ============================================================

/**
 * Convierte el historial de transacciones del usuario a un archivo .csv
 * y lo descarga automáticamente en el navegador.
 */
export function exportTransactionsToCSV(user) {
    if (!user.transactions || user.transactions.length === 0) {
        showToast('No hay transacciones para exportar', 'error');
        return;
    }

    // 1. Definimos los encabezados de las columnas
    const headers = ['Fecha', 'Referencia', 'Tipo', 'Concepto', 'Valor (COP)'];

    // 2. Convertimos cada transacción a una fila de texto CSV
    const rows = user.transactions.map(tx => {
        const fecha = new Date(tx.date).toLocaleDateString('es-CO');
        const valor = tx.type === 'Consignación' ? tx.value : -tx.value;
        // Las comas dentro del concepto las envolvemos en comillas para no romper el CSV
        const concepto = `"${tx.concept}"`;
        return [fecha, tx.reference, tx.type, concepto, valor].join(',');
    });

    // 3. Unimos todo en un solo string con saltos de línea
    const csvContent = [headers.join(','), ...rows].join('\n');

    // 4. Creamos un Blob (archivo en memoria) con el contenido
    //    'text/csv' le dice al navegador qué tipo de archivo es
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // 5. Generamos una URL temporal que apunta al Blob
    const url = URL.createObjectURL(blob);

    // 6. Creamos un enlace <a> invisible, lo "clickeamos" y lo eliminamos
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `historial_${user.accountNumber}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 7. Liberamos la URL temporal de memoria (buena práctica)
    URL.revokeObjectURL(url);

    showToast('Historial exportado exitosamente', 'success');
}


// ============================================================
// CÓMO INTEGRARLO EN dashboard.js:
// ============================================================
// 
// 1. En setupPrintFunctionality(), agrega esto:
//
//    const exportCsvBtn = document.getElementById('exportCsvBtn');
//    if (exportCsvBtn) {
//        exportCsvBtn.addEventListener('click', () => {
//            exportTransactionsToCSV(currentUser);
//        });
//    }
//
// 2. En dashboard.html, dentro del panel de historial agrega el botón:
//
//    <button id="exportCsvBtn" class="btn-link">Exportar CSV ↓</button>
//
// ============================================================
