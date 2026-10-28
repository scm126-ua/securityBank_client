<template>
    <div class="login-locked-page">
        <div class="card login-locked-card border-0 shadow-sm">
            <div class="card-body p-4 p-md-5 text-center">

                <!-- Icono de bloqueo -->
                <div class="lock-icon mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
                        aria-hidden="true">
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        <path d="M12 15v3" />
                    </svg>
                </div>

                <span class="status-label mb-3">
                    Acceso temporalmente bloqueado
                </span>

                <h2 class="fw-bold mt-3 mb-3">
                    Demasiados intentos de inicio de sesión
                </h2>

                <p class="text-muted description mb-4">
                    Por seguridad, hemos bloqueado temporalmente los nuevos intentos
                    de acceso tras detectar demasiados errores de autenticación.
                    Podrás volver a intentarlo cuando termine el periodo de espera.
                </p>

                <!-- Cuenta atrás -->
                <div class="countdown-box mb-4">
                    <p class="countdown-caption mb-2">
                        Tiempo restante
                    </p>

                    <div class="countdown-time" role="timer" aria-live="off">
                        {{ formattedTime }}
                    </div>

                    <span class="badge rounded-pill countdown-badge mt-3">
                        {{ remainingMinutes }} minutos restantes
                    </span>
                </div>

                <button type="button" class="btn btn-primary w-100 retry-button" :disabled="remainingSeconds > 0"
                    @click="$emit('retry-login')">
                    {{ remainingSeconds > 0
                        ? 'Espera para volver a intentarlo'
                        : 'Volver a iniciar sesión' }}
                </button>

                <p class="security-note text-muted small mt-4 mb-0">
                    <span class="fw-semibold">SecurityBank</span>
                    · Protegemos la seguridad de tu cuenta.
                </p>

            </div>
        </div>
    </div>
</template>

<script lang="ts">

export default {
    name: 'LoginLocked',

    props: {
        // Tiempo restante en segundos, proporcionado por el backend.
        initialSeconds: {
            type: Number,
            required: true,
        },
    },

    data() {
        return {
            remainingSeconds: Math.max(0, this.initialSeconds),
            countdownInterval: null as ReturnType<typeof setInterval> | null,
        }
    },

    computed: {
        formattedTime(): string {
            const minutes = Math.floor(this.remainingSeconds / 60)
            const seconds = this.remainingSeconds % 60

            return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        },

        remainingMinutes(): number {
            return Math.ceil(this.remainingSeconds / 60)
        },
    },

    mounted() {
        this.startCountdown()
    },

    beforeDestroy() {
        this.stopCountdown()
    },

    methods: {
        startCountdown() {
            this.stopCountdown()

            if (this.remainingSeconds <= 0) return

            this.countdownInterval = setInterval(() => {
                if (this.remainingSeconds > 0) {
                    this.remainingSeconds--
                } else {
                    this.stopCountdown()
                }
            }, 1000)
        },

        stopCountdown() {
            if (this.countdownInterval !== null) {
                clearInterval(this.countdownInterval)
                this.countdownInterval = null
            }
        },
    },
}
</script>

<style scoped>
.login-locked-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background-color: #f5f7fa;
}

.login-locked-card {
    width: 100%;
    max-width: 510px;
    border-radius: 16px;
}

.lock-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 76px;
    height: 76px;
    color: #163b65;
    background-color: #eaf0f7;
    border-radius: 20px;
}

.status-label {
    display: inline-block;
    padding: 7px 12px;
    color: #8a4b13;
    background-color: #fff0d9;
    border-radius: 20px;
    font-size: 0.78rem;
    font-weight: 600;
}

.description {
    font-size: 0.95rem;
    line-height: 1.65;
}

.countdown-box {
    padding: 24px 16px;
    background-color: #f5f7fa;
    border: 1px solid #e4e9f0;
    border-radius: 12px;
}

.countdown-caption {
    color: #68778a;
    font-size: 0.9rem;
}

.countdown-time {
    color: #163b65;
    font-size: 3rem;
    font-weight: 700;
    line-height: 1.2;
    font-variant-numeric: tabular-nums;
    letter-spacing: 2px;
}

.countdown-badge {
    padding: 8px 12px;
    color: #163b65;
    background-color: #e3ebf5;
    font-size: 0.8rem;
}

.retry-button {
    min-height: 48px;
    border: none;
    border-radius: 10px;
    background-color: #163b65;
    font-weight: 600;
}

.retry-button:hover:not(:disabled) {
    background-color: #214f80;
}

.retry-button:disabled {
    background-color: #a5b2c1;
    cursor: not-allowed;
}

.security-note {
    line-height: 1.5;
}

@media (max-width: 576px) {
    .login-locked-page {
        padding: 16px;
    }

    .countdown-time {
        font-size: 2.5rem;
    }
}
</style>
