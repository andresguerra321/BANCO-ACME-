// ============================================================
// FUNCIONALIDAD 4: NOTIFICACIONES DEL NAVEGADOR
// Usa: Notifications API nativa del browser
// Tema cubierto: Asincronía (async/await) + APIs del navegador
// ============================================================

// --- AGREGAR EN js/ui.js o js/dashboard.js ---

/**
 * Solicita permiso al usuario para mostrar notificaciones del sistema.
 * Retorna true si el permiso fue concedido.
 */
async function requestNotificationPermission() {
    // Verificamos si el navegador soporta notificaciones
    if (!('Notification' in window)) {
        console.warn('Este navegador no soporta notificaciones.');
        return false;
    }

    // Si ya fue concedido antes, no volvemos a pedir
    if (Notification.permission === 'granted') return true;

    // Si no fue denegado, pedimos permiso (esto abre el popup del browser)
    if (Notification.permission !== 'denied') {
        const permiso = await Notification.requestPermission();
        return permiso === 'granted';
    }

    return false;
}

/**
 * Muestra una notificación del sistema operativo al usuario.
 * Se llama después de cada transacción exitosa.
 * 
 * @param {string} titulo - Título de la notificación
 * @param {string} cuerpo - Mensaje de la notificación
 * @param {string} tipo - 'consignacion' | 'retiro' | 'transferencia'
 */
async function notificarTransaccion(titulo, cuerpo, tipo = 'info') {
    const tienePermiso = await requestNotificationPermission();
    if (!tienePermiso) return;

    const iconos = {
        consignacion: '💰',
        retiro: '💸',
        transferencia: '🔁',
        info: '🏦'
    };

    // Creamos la notificación nativa del SO
    const notificacion = new Notification(`${iconos[tipo]} Banco Acme`, {
        body: `${titulo}\n${cuerpo}`,
        icon: 'img/ChatGPT Image 10 abr 2026, 08_13_43 a.m..png', // El logo del banco
        badge: 'img/ChatGPT Image 10 abr 2026, 08_13_43 a.m..png',
        tag: `banco-acme-${Date.now()}`, // Evita duplicados
        silent: false
    });

    // Auto-cerrar después de 5 segundos
    setTimeout(() => notificacion.close(), 5000);

    // Evento: si el usuario hace clic en la notificación, enfoca la ventana
    notificacion.onclick = () => {
        window.focus();
        notificacion.close();
    };
}

// ============================================================
// CÓMO INTEGRARLO EN dashboard.js:
// ============================================================
//
// 1. Al inicializar, pedimos permiso apenas carga el dashboard:
//    En initUI() agrega:
//    requestNotificationPermission();
//
// 2. En registerTransaction(), después de updateUser(currentUser):
//    
//    const esConsignacion = type === 'Consignación';
//    notificarTransaccion(
//        esConsignacion ? 'Consignación exitosa' : 'Retiro registrado',
//        `${concept} — ${formatCurrency(parseFloat(value))}`,
//        esConsignacion ? 'consignacion' : 'retiro'
//    );
//
// 3. Para transferencias, después de updateUser en realizarTransferencia():
//    notificarTransaccion(
//        'Transferencia enviada',
//        `${formatCurrency(monto)} enviados a ${accountNumberDestino}`,
//        'transferencia'
//    );
//
// NOTA IMPORTANTE PARA EL EXAMEN:
// Las notificaciones solo funcionan en HTTPS o localhost.
// En Live Server (localhost:5501) funcionan perfectamente.
// ============================================================
