// ============================================================
// FUNCIONALIDAD: CLAVE DINÁMICA (TOKEN 2FA)
// Tema cubierto: Temporizadores (setInterval), Lógica Matemática,
// Manipulación DOM reactiva, Seguridad Simulada.
// ============================================================

let intervalId = null;

/**
 * Genera el token numérico de 6 dígitos basado en el tiempo actual.
 * Cambia exactamente cada 30 segundos.
 */
export function getCurrentToken() {
    // Calculamos el "periodo" actual (bloques de 30 segundos)
    const period = Math.floor(Date.now() / 30000);
    
    // Generador pseudo-aleatorio determinista básico
    // Multiplicamos por un primo grande para dispersar los valores
    const hash = (period * 99991 + 12345) % 1000000;
    
    // Aseguramos que siempre tenga 6 dígitos
    return hash.toString().padStart(6, '0');
}

/**
 * Inicializa el widget visual del Token Dinámico en el contenedor indicado
 */
export function initDynamicToken(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // 1. Construir la estructura del widget
    container.innerHTML = `
        <div class="token-widget panel center-panel" style="margin-bottom: 2rem; background: rgba(0, 113, 227, 0.05); border: 1px solid rgba(0, 113, 227, 0.2);">
            <p class="text-muted mb-2" style="font-weight: 500;">Tu Clave Dinámica 2FA</p>
            <h2 id="dynamicTokenDisplay" class="token-value" style="font-size: 2.5rem; letter-spacing: 0.2em; font-family: monospace; color: #ffffff; margin: 0.5rem 0; transition: opacity 0.2s ease;">------</h2>
            <div class="token-progress-container" style="background: rgba(0,0,0,0.1); height: 6px; border-radius: 10px; overflow: hidden; margin-top: 1rem;">
                <div id="tokenProgressBar" class="token-progress-bar" style="height: 100%; background: var(--primary-color); transition: width 1s linear, background-color 0.3s ease;"></div>
            </div>
            <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.8rem;">
                Este código de seguridad expira en <strong id="tokenSecondsLeft">30</strong>s
            </p>
        </div>
    `;

    // 2. Primera actualización inmediata
    updateTokenUI();
    
    // 3. Establecer intervalo cada segundo (1000ms)
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(updateTokenUI, 1000);
}

/**
 * Función que actualiza la UI cada segundo
 */
function updateTokenUI() {
    const display = document.getElementById('dynamicTokenDisplay');
    const progressBar = document.getElementById('tokenProgressBar');
    const secondsLeftDisplay = document.getElementById('tokenSecondsLeft');
    
    // Si el usuario navegó a otra sección y los elementos no existen, detenemos el intervalo
    if (!display || !progressBar) {
        if(intervalId) clearInterval(intervalId);
        return;
    }

    const token = getCurrentToken();
    const currentSecond = Math.floor(Date.now() / 1000) % 30;
    const secondsLeft = 30 - currentSecond;
    const progressPercent = (secondsLeft / 30) * 100;

    // Si el token cambió, hacemos una pequeña animación
    if (display.textContent !== token) {
        display.style.opacity = '0';
        setTimeout(() => {
            display.textContent = token;
            display.style.opacity = '1';
        }, 150);
    }
    
    secondsLeftDisplay.textContent = secondsLeft;
    progressBar.style.width = `${progressPercent}%`;
    
    // Alerta visual de expiración próxima
    if (secondsLeft <= 5) {
        progressBar.style.backgroundColor = 'var(--danger-color)';
    } else {
        progressBar.style.backgroundColor = 'var(--primary-color)';
    }
}

/**
 * Valida si el token introducido es igual al actual
 */
export function validateToken(inputToken) {
    return inputToken === getCurrentToken();
}
