// js/ui.js

// 1. TEMPLATES: Definimos la estructura con Múltiples Slots y Estilos
const toastTemplate = document.createElement('template');
toastTemplate.innerHTML = `
    <style>
        /* Estilos encapsulados solo para este componente */
        :host {
            display: block;
            margin-bottom: 15px;
            padding: 15px 20px;
            border-radius: 12px;
            color: #fff;
            background: rgba(30, 30, 30, 0.85);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            opacity: 0;
            transform: translateX(100%);
            animation: slideIn 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
            border: 1px solid rgba(255, 255, 255, 0.1);
            position: relative;
            overflow: hidden;
        }
        
        /* Uso del atributo 'type' para cambiar el color del borde izquierdo */
        :host([type="success"]) { border-left: 5px solid #28c76f; }
        :host([type="error"]) { border-left: 5px solid #ea5455; }
        :host([type="info"]) { border-left: 5px solid #00cfe8; }

        :host(.slide-out) {
            animation: slideOut 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
        }

        @keyframes slideIn {
            to { opacity: 1; transform: translateX(0); }
        }

        @keyframes slideOut {
            to { opacity: 0; transform: translateX(120%); }
        }

        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 4px;
            font-weight: 600;
            font-size: 1rem;
        }

        .message {
            font-family: inherit;
            font-size: 0.9rem;
            color: rgba(255, 255, 255, 0.85);
            line-height: 1.4;
        }
        
        .progress-bar {
            position: absolute;
            bottom: 0; left: 0; right: 0; height: 3px;
            background: rgba(255,255,255,0.2);
            transform-origin: left;
            animation: progress var(--duration, 3.5s) linear forwards;
        }

        @keyframes progress {
            from { transform: scaleX(1); }
            to { transform: scaleX(0); }
        }
    </style>
    
    <div class="header">
        <!-- Slot con nombre para el título (Opcional) -->
        <slot name="title"></slot>
    </div>
    <div class="message">
        <!-- Slot por defecto para el mensaje -->
        <slot></slot>
    </div>
    <!-- Barra de progreso visual que lee una variable CSS CSS -->
    <div class="progress-bar"></div>
`;

// 2. WEB COMPONENTS: Manejo del Ciclo de Vida y Atributos Observados
class BancoToast extends HTMLElement {
    // Definimos qué atributos queremos que el componente "escuche" activamente
    static get observedAttributes() {
        return ['duration', 'type'];
    }

    constructor() {
        super();
        // 3. SHADOW DOM: Encapsulación
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(toastTemplate.content.cloneNode(true));
        
        this.timer = null;
    }

    // CICLO DE VIDA 1: Cuando el elemento se inserta en el DOM
    connectedCallback() {
        // Obtenemos el atributo duration o usamos 3500ms por defecto
        const duration = parseInt(this.getAttribute('duration')) || 3500;
        
        // Le pasamos la duración a la variable CSS para sincronizar la animación de la barra
        this.style.setProperty('--duration', `${duration}ms`);

        // Iniciamos el temporizador de auto-destrucción
        this.startTimer(duration);
    }

    // CICLO DE VIDA 2: Cuando el elemento cambia de atributos (via setAttribute)
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        
        console.log(`[BancoToast] El atributo '${name}' cambió a ${newValue}`);
        
        if (name === 'duration' && this.timer) {
            // Si cambian la duración sobre la marcha, reiniciamos el temporizador
            clearTimeout(this.timer);
            this.startTimer(parseInt(newValue));
            this.style.setProperty('--duration', `${newValue}ms`);
        }
    }

    // CICLO DE VIDA 3: Cuando el elemento sale del DOM
    disconnectedCallback() {
        // Buena práctica: Limpiar temporizadores para evitar "Memory Leaks" 
        if (this.timer) {
            clearTimeout(this.timer);
            console.log('[BancoToast] Limpieza de temporizadores exitosa.');
        }
    }

    // Método encapsulado para la lógica de ocultar
    startTimer(ms) {
        this.timer = setTimeout(() => {
            this.classList.add('slide-out');
            
            // Esperamos a que acabe la animación para sacarlo del DOM
            setTimeout(() => {
                if (this.parentNode) {
                    this.parentNode.removeChild(this); 
                }
            }, 300); // 300ms = duración de la animación en CSS
            
        }, ms);
    }
}

customElements.define('banco-toast', BancoToast);

/**
 * Muestra un mensaje de notificación flotante (Toast)
 * @param {string} message - Mensaje principal a mostrar
 * @param {string} type - 'success', 'error', 'info'
 * @param {string} title - (Opcional) Título destacado (usa slot="title")
 * @param {number} duration - (Opcional) Tiempo en milisegundos antes de ocultarse
 */
export function showToast(message, type = 'info', title = null, duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    // Instanciamos el Custom Element
    const toast = document.createElement('banco-toast');
    
    // Asignamos los atributos que "observedAttributes" está escuchando
    toast.setAttribute('type', type);
    toast.setAttribute('duration', duration.toString());

    // Uso de Slot Nombrado para el título
    if (title) {
        const titleSpan = document.createElement('span');
        titleSpan.setAttribute('slot', 'title'); // Le decimos al Shadow DOM a qué slot va
        titleSpan.textContent = title;
        toast.appendChild(titleSpan);
    } else {
        // Títulos automáticos por tipo si no se especifican
        const autoTitles = { 'success': '¡Completado!', 'error': '¡Alerta!', 'info': 'Notificación' };
        const autoSpan = document.createElement('span');
        autoSpan.setAttribute('slot', 'title');
        autoSpan.textContent = autoTitles[type] || 'Aviso';
        toast.appendChild(autoSpan);
    }

    // El mensaje principal va al default <slot> (como nodo de texto)
    toast.appendChild(document.createTextNode(message));
    
    container.appendChild(toast);
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
