<template>
    <div>
        <span class="lock-icon">
            <AppIcon name="lock" />
        </span>

        <span class="lock-label">Acceso bloqueado</span>
        <h1 class="lock-title">Demasiados intentos</h1>
        <p class="lock-text">
            Por tu seguridad, hemos bloqueado temporalmente el acceso a esta cuenta tras varios intentos
            fallidos de inicio de sesión.
        </p>

        <div class="timer-box">
            <span class="section-label">Podrás volver a intentarlo en</span>
            <span class="timer" role="timer">{{ formattedTime }}</span>
        </div>

        <button type="button" class="btn btn-outline-primary w-100" @click="$emit('retry-login')">
            <AppIcon name="arrow-left" class="me-2" />
            Volver al inicio de sesión
        </button>
    </div>
</template>

<script lang="ts">
import AppIcon from './AppIcon.vue'

// Cuenta atrás del bloqueo que impone el servidor. Se calcula sobre la hora de fin
// para no retrasarse cuando el navegador ralentiza los temporizadores de la pestaña.
export default {
    name: 'TooManyLoginAttemptsView',

    components: { AppIcon },

    props: {
        initialSeconds: { type: Number, required: true },
    },

    emits: ['retry-login'],

    data() {
        return {
            endsAt: Date.now() + this.initialSeconds * 1000,
            remainingSeconds: Math.max(0, this.initialSeconds),
            countdownInterval: null as ReturnType<typeof setInterval> | null,
        }
    },

    computed: {
        formattedTime(): string {
            const min = Math.floor(this.remainingSeconds / 60)
            const sec = this.remainingSeconds % 60
            return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
        },
    },

    mounted() {
        this.countdownInterval = setInterval(() => {
            this.remainingSeconds = Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000))

            // Al terminar el bloqueo se vuelve al formulario de acceso.
            if (this.remainingSeconds === 0) {
                this.$emit('retry-login')
            }
        }, 1000)
    },

    beforeUnmount() {
        if (this.countdownInterval) clearInterval(this.countdownInterval)
    },
}
</script>

<style scoped>
.lock-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    margin-bottom: 1.25rem;
    border-radius: 50%;
    font-size: 1.375rem;
    color: var(--sb-danger);
    background-color: var(--sb-danger-bg);
}

.lock-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--sb-danger);
}

.lock-title {
    margin: 0.25rem 0 0.375rem;
    font-size: 1.75rem;
    font-weight: 600;
    color: var(--sb-navy-900);
}

.lock-text {
    margin-bottom: 1.5rem;
    color: var(--sb-muted);
}

.timer-box {
    margin-bottom: 1.5rem;
    padding: 1.25rem;
    border: 1px solid var(--sb-border);
    border-radius: var(--sb-radius);
    text-align: center;
    background-color: var(--sb-surface-muted);
}

.timer {
    display: block;
    margin-top: 0.25rem;
    font-size: 2.75rem;
    font-weight: 600;
    line-height: 1.2;
    font-variant-numeric: tabular-nums;
    color: var(--sb-navy-900);
}
</style>
