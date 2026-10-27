```vue
<template>
    <div class="bank-page">
        <!-- Navbar -->
        <nav class="navbar navbar-expand-lg navbar-dark bank-navbar">
            <div class="container">
                <a class="navbar-brand fw-bold" href="#">
                    <i class="bi bi-shield-lock-fill me-2"></i>
                    SecurityBank
                </a>

                <div class="navbar-nav ms-auto">
                    <a class="nav-link active" href="#">Inicio</a>
                    <a class="nav-link" href="#movimientos">Movimientos</a>
                    <a class="nav-link" href="#">Mi perfil</a>
                </div>
            </div>
        </nav>

        <!-- Contenido -->
        <div class="container py-5">
            <h2 class="fw-bold mb-2">Bienvenido a SecurityBank</h2>
            <p class="text-secondary mb-4">
                Consulta el estado de tu cuenta bancaria.
            </p>

            <div class="d-flex flex-wrap justify-content-between gap-3 mb-4">
                <button type="button" class="btn btn-outline-secondary" @click="$emit('back-to-accounts')">
                    &larr; Volver a mis cuentas
                </button>

                <button v-if="selectedAccount.status === 'ACTIVE'" type="button" class="btn btn-outline-danger"
                    :disabled="closing" @click="closeAccount">
                    <span v-if="closing" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                    {{ closing ? 'Cerrando...' : 'Cerrar cuenta' }}
                </button>
            </div>

            <div v-if="closeError" class="alert alert-danger" role="alert">
                {{ closeError }}
            </div>

            <!-- Saldo real de la cuenta -->
            <div class="card balance-card mb-4">
                <div class="card-body p-4">
                    <p class="mb-2">Saldo disponible</p>

                    <h1 class="fw-bold">
                        {{ formatBalance(selectedAccount.balance) }}
                    </h1>

                    <p class="mb-2">
                        <i class="bi bi-credit-card me-2"></i>
                        Cuenta {{ selectedAccount.id }}
                    </p>

                    <p class="mb-2">
                        <i class="bi bi-bank me-2"></i>
                        {{ selectedAccount.iban }}
                    </p>

                    <span class="badge" :class="selectedAccount.status === 'ACTIVE'
                        ? 'text-bg-success'
                        : 'text-bg-secondary'">
                        {{ selectedAccount.status }}
                    </span>

                    <p class="mt-3 mb-0 small">
                        <i class="bi bi-calendar3 me-2"></i>
                        Creada el {{ formatDate(selectedAccount.created_at) }}
                    </p>
                </div>
            </div>

            <!-- Acciones de movimientos -->
            <div class="row g-3 mb-5" id="movimientos">
                <div class="col-12">
                    <h3 class="fw-bold">Movimientos</h3>
                    <p class="text-secondary">
                        Consulta las operaciones de esta cuenta.
                    </p>
                </div>

                <div class="col-md-4">
                    <button class="btn btn-primary w-100 py-3" @click="movementFilter = 'ALL'">
                        <i class="bi bi-arrow-left-right me-2"></i>
                        Todos
                    </button>
                </div>

                <div class="col-md-4">
                    <button class="btn btn-outline-primary w-100 py-3" @click="movementFilter = 'INCOME'">
                        <i class="bi bi-graph-up-arrow me-2"></i>
                        Ingresos
                    </button>
                </div>

                <div class="col-md-4">
                    <button class="btn btn-outline-primary w-100 py-3" @click="movementFilter = 'EXPENSE'">
                        <i class="bi bi-graph-down-arrow me-2"></i>
                        Gastos
                    </button>
                </div>
            </div>

            <!-- Movimientos pendientes de conectar con la API -->
            <div class="card">
                <div class="card-header bg-white py-3">
                    <h5 class="mb-0 fw-bold">Últimos movimientos</h5>
                </div>

                <div class="card-body text-center py-5">
                    <i class="bi bi-receipt empty-icon"></i>

                    <h5 class="mt-3">Movimientos no disponibles</h5>

                    <p class="text-secondary mb-0">
                        Todavía no se han conectado los movimientos de esta cuenta
                        con el backend.
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import api from '@/api/axios'

export default {
    props: {
        selectedAccount: {
            type: Object,
            required: true
        }
    },

    data() {
        return {
            movementFilter: 'ALL',
            closing: false,
            closeError: ''
        }
    },

    methods: {
        // Solicita confirmación y cierra la cuenta seleccionada.
        async closeAccount() {
            const confirmed = window.confirm(
                'La cuenta se cerrará de forma permanente. ¿Deseas continuar?'
            )

            if (!confirmed || this.closing) {
                return
            }

            this.closing = true
            this.closeError = ''

            try {
                await api.patch(`/accounts/${this.selectedAccount.id}/close`)
                this.$emit('account-closed')
            } catch (error) {
                console.error('Error al cerrar la cuenta:', error)
                this.closeError = error.response?.data?.error ||
                    'No se ha podido cerrar la cuenta.'
            } finally {
                this.closing = false
            }
        },

        formatBalance(balance) {
            const amount = Number(balance)

            if (!Number.isFinite(amount)) {
                return '—'
            }

            return amount.toLocaleString('es-ES', {
                style: 'currency',
                currency: 'EUR'
            })
        },

        formatDate(date) {
            if (!date) {
                return 'No disponible'
            }

            const parsedDate = new Date(date)

            if (Number.isNaN(parsedDate.getTime())) {
                return 'No disponible'
            }

            return parsedDate.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            })
        }
    }
}
</script>

<style scoped>
.bank-page {
    min-height: 100vh;
    background-color: #f4f7fb;
}

.bank-navbar {
    background-color: #163b65;
}

.navbar-brand {
    font-size: 1.3rem;
}

.balance-card {
    background: linear-gradient(135deg, #163b65, #2878c8);
    color: white;
    border: none;
    border-radius: 16px;
}

.card {
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
}

.empty-icon {
    font-size: 3rem;
    color: #94a3b8;
}

.btn {
    border-radius: 10px;
    font-weight: 500;
}

.btn-primary {
    background-color: #163b65;
    border-color: #163b65;
}

.btn-primary:hover {
    background-color: #0f2d4d;
    border-color: #0f2d4d;
}

.btn-outline-primary {
    color: #163b65;
    border-color: #163b65;
}

.btn-outline-primary:hover {
    background-color: #163b65;
    border-color: #163b65;
    color: white;
}
</style>
```
