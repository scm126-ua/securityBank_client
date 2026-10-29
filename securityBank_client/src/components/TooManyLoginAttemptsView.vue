<template>
    <div class="lock-page">
        <div class="lock-card">
            <span class="lock-label">Acceso bloqueado</span>
            <h2>Demasiados intentos</h2>
            <p>Espera antes de volver a intentarlo.</p>

            <div class="timer">{{ formattedTime }}</div>
        </div>
    </div>
</template>

<script lang="ts">
export default {
    name: 'TooManyLoginAttemptsView',

    props: {
        initialSeconds: { type: Number, required: true },
    },

    data() {
        return {
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

        remainingMinutes(): number {
            return Math.ceil(this.remainingSeconds / 60)
        },
    },

    mounted() {
        this.countdownInterval = setInterval(() => {
            if (this.remainingSeconds > 0) {
                this.remainingSeconds--
            } else if (this.countdownInterval) {
                clearInterval(this.countdownInterval)
            }
        }, 1000)
    },

    beforeDestroy() {
        if (this.countdownInterval) clearInterval(this.countdownInterval)
    },
}
</script>

<style scoped>
.lock-page {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    box-sizing: border-box;
    z-index: 10;
}

.lock-card {
    width: 100%;
    max-width: 500px;
    padding: 1.75rem;
    text-align: center;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    box-shadow: 0 4px 16px rgb(0 0 0 / 5%);

    transform: translateY(-200px);
}

.lock-label {
    color: #b42318;
    font-size: 1rem;
    font-weight: 600;
}

.lock-card h2 {
    margin: 0.8rem 0 0.6rem;
    color: #163b65;
    font-size: 1.3rem;
}

.lock-card p {
    margin-bottom: 2rem;
    color: #64748b;
    font-size: 0.95rem;
}

.timer {
    color: #163b65;
    font-size: 2.8rem;
    font-weight: 700;
    line-height: 1.3;
    font-variant-numeric: tabular-nums;
}

@media (max-width: 400px) {
    .lock-card {
        padding: 1.4rem;
    }

    .timer {
        font-size: 2.4rem;
    }
}
</style>