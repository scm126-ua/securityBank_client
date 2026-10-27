<template>
    <div class="container mt-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h4 class="fw-bold mb-1">Mis cuentas</h4>
                <p class="text-muted mb-0">
                    Selecciona una cuenta para acceder a sus detalles.
                </p>
            </div>

            <span class="badge rounded-pill text-bg-primary">
                {{ accounts.length }} cuentas
            </span>
        </div>

        <!-- Cargando cuentas -->
        <div v-if="loading" class="text-center py-5">
            <div class="spinner-border" style="color: #163b65" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
            <p class="text-muted mt-3">Cargando tus cuentas...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="alert alert-danger" role="alert">
            {{ error }}

            <button class="btn btn-outline-danger btn-sm ms-2" @click="fetchAccounts">
                Reintentar
            </button>
        </div>

        <!-- Sin cuentas -->
        <div v-else-if="accounts.length === 0" class="card border-0 shadow-sm">
            <div class="card-body text-center py-5">
                <h5 class="fw-bold">Todavía no tienes cuentas</h5>
                <p class="text-muted mb-0">
                    Cuando tengas una cuenta bancaria, aparecerá aquí.
                </p>
            </div>
        </div>

        <!-- Listado de cuentas -->
        <div v-else class="row g-3">
            <div v-for="account in accounts" :key="account.id" class="col-12 col-md-6 col-xl-4">
                <button type="button" class="account-button card border-0 shadow-sm w-100 text-start h-100"
                    @click="$emit('select-account', account)">
                    <div class="card-body p-4">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <div class="account-icon">
                                <span class="fw-bold">SB</span>
                            </div>

                            <span class="text-muted small">
                                Cuenta bancaria
                            </span>
                        </div>

                        <p class="text-muted small mb-1">IBAN</p>
                        <p class="fw-semibold iban-text mb-3">
                            {{ formatIBAN(account.iban) }}
                        </p>

                        <div class="d-flex justify-content-between align-items-end">
                            <div>
                                <p class="text-muted small mb-1">Saldo disponible</p>
                                <h4 class="fw-bold mb-0 balance-text">
                                    {{ formatBalance(account.balance) }}
                                </h4>
                            </div>

                            <span class="access-icon" aria-hidden="true">
                                &rarr;
                            </span>
                        </div>
                    </div>
                </button>
            </div>
        </div>
    </div>
</template>



<script lang="ts">
import api from '@/api/axios';

interface Account {
    id: number
    iban: string
    balance: number
}

export default {
    name: 'UserAccounts',

    data() {
        return {
            accounts: [] as Account[],
            loading: false,
            error: '',
        }
    },

    mounted() {
        this.fetchAccounts()
    },

    methods: {
        async fetchAccounts() {
            this.loading = true
            this.error = ''

            try {
                await api.get('/accounts', {
                    
                }).then((response) => {
                    this.accounts = response.data.accounts || []
                })


            } catch (err) {
                console.error('Error al cargar las cuentas:', err)
                this.error = 'No se han podido cargar tus cuentas.'
            } finally {
                this.loading = false
            }
        },

        formatIBAN(iban: string): string {
            return iban
                .replace(/\s/g, '')
                .replace(/(.{4})/g, '$1 ')
                .trim()
        },

        formatBalance(balance: number): string {
            return new Intl.NumberFormat('es-ES', {
                style: 'currency',
                currency: 'EUR',
            }).format(balance)
        },

        openAccount(account: Account) {
            this.$emit('select-account', account)
        },
    },
}
</script>



<style scoped>
.account-button {
    color: #163b65;
    background-color: #ffffff;
    border-radius: 12px;
    transition:
        transform 0.2s ease,
        box-shadow 0.2s ease;
    cursor: pointer;
}

.account-button:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgb(22 59 101 / 12%) !important;
}

.account-button:focus-visible {
    outline: 3px solid #2878c8;
    outline-offset: 3px;
}

.account-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    color: #ffffff;
    background-color: #163b65;
    border-radius: 10px;
}

.iban-text {
    overflow-wrap: anywhere;
    font-size: 0.9rem;
    letter-spacing: 0.3px;
}

.balance-text {
    color: #163b65;
}

.access-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    color: #ffffff;
    background-color: #2878c8;
    border-radius: 50%;
    font-size: 1.3rem;
    transition: transform 0.2s ease;
}

.account-button:hover .access-icon {
    transform: translateX(3px);
}
</style>
