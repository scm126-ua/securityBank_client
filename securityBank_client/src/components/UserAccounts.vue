<template>
    <section>
        <div class="page-header">
            <div>
                <h1 class="page-title">Mis cuentas</h1>
                <p class="page-subtitle">
                    Selecciona una cuenta para consultar su detalle y sus operaciones.
                </p>
            </div>

            <button type="button" class="btn btn-primary" :disabled="creating || loading" @click="createAccount">
                <span v-if="creating" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                <AppIcon v-else name="plus" class="me-2" />
                {{ creating ? 'Abriendo cuenta...' : 'Abrir nueva cuenta' }}
            </button>
        </div>

        <!-- Resultado de abrir una cuenta -->
        <div v-if="actionError" class="alert alert-danger d-flex gap-2" role="alert">
            <AppIcon name="alert-circle" />
            <span>{{ actionError }}</span>
        </div>

        <div v-if="createdIBAN" class="alert alert-success d-flex gap-2" role="status">
            <AppIcon name="check-circle" />
            <span>Se ha abierto la cuenta <strong>{{ formatIBAN(createdIBAN) }}</strong>.</span>
        </div>

        <!-- Cargando cuentas -->
        <div v-if="loading" class="panel empty-state">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
            <p class="text-muted mt-3 mb-0">Cargando tus cuentas...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="alert alert-danger d-flex flex-wrap align-items-center gap-2" role="alert">
            <AppIcon name="alert-circle" />
            <span>{{ error }}</span>
            <button class="btn btn-outline-danger btn-sm ms-auto" @click="fetchAccounts">
                Reintentar
            </button>
        </div>

        <!-- Sin cuentas -->
        <div v-else-if="accounts.length === 0" class="panel empty-state">
            <span class="empty-icon">
                <AppIcon name="bank" />
            </span>
            <h2 class="empty-title">Todavía no tienes cuentas</h2>
            <p class="empty-text mb-4">
                Abre tu primera cuenta en un solo paso. Se creará con un saldo inicial de 0,00 €.
            </p>
            <button type="button" class="btn btn-primary" :disabled="creating" @click="createAccount">
                <AppIcon name="plus" class="me-2" />
                Abrir mi primera cuenta
            </button>
        </div>

        <template v-else>
            <!-- Posición global -->
            <div class="panel summary mb-4">
                <div class="summary-item">
                    <span class="section-label">Saldo total</span>
                    <span class="summary-value amount">{{ formatCurrency(totalBalance) }}</span>
                    <span class="summary-hint">En cuentas activas</span>
                </div>
                <div class="summary-item">
                    <span class="section-label">Cuentas activas</span>
                    <span class="summary-value">{{ activeAccounts.length }}</span>
                </div>
                <div class="summary-item">
                    <span class="section-label">Cuentas cerradas</span>
                    <span class="summary-value">{{ accounts.length - activeAccounts.length }}</span>
                </div>
            </div>

            <!-- Listado de cuentas -->
            <div class="panel">
                <div class="panel-header">
                    <h2 class="panel-title">Cuentas</h2>
                    <span class="small text-muted">
                        {{ accounts.length }} {{ accounts.length === 1 ? 'cuenta' : 'cuentas' }}
                    </span>
                </div>

                <ul class="list-unstyled mb-0">
                    <li v-for="account in sortedAccounts" :key="account.id" class="account-item">
                        <button type="button" class="account-row" :class="{ closed: account.status !== 'ACTIVE' }"
                            @click="$emit('select-account', account)">
                            <span class="account-icon">
                                <AppIcon name="bank" />
                            </span>

                            <span class="account-main">
                                <span class="account-iban">{{ formatIBAN(account.iban) }}</span>
                                <span class="account-meta">Abierta el {{ formatDate(account.created_at) }}</span>
                            </span>

                            <span class="status-badge"
                                :class="account.status === 'ACTIVE' ? 'status-active' : 'status-closed'">
                                {{ accountStatusLabel(account.status) }}
                            </span>

                            <span class="account-balance">
                                <span class="section-label">Saldo</span>
                                <span class="amount">{{ formatCurrency(account.balance) }}</span>
                            </span>

                            <AppIcon name="chevron-right" class="account-chevron" />
                        </button>
                    </li>
                </ul>
            </div>
        </template>
    </section>
</template>



<script lang="ts">
import api from '@/api/axios';
import { accountStatusLabel, formatCurrency, formatDate, formatIBAN } from '@/utils/format';
import AppIcon from './AppIcon.vue';

interface Account {
    id: number
    iban: string
    balance: number
    status: string
    created_at: string
}

export default {
    name: 'UserAccounts',

    components: { AppIcon },

    emits: ['select-account'],

    data() {
        return {
            accounts: [] as Account[],
            loading: false,
            creating: false,
            error: '',
            actionError: '',
            createdIBAN: '',
        }
    },

    computed: {
        activeAccounts(): Account[] {
            return this.accounts.filter((account) => account.status === 'ACTIVE')
        },

        // Suma de los saldos de las cuentas activas.
        totalBalance(): number {
            return this.activeAccounts.reduce((total, account) => total + Number(account.balance), 0)
        },

        // Primero las cuentas activas y, dentro de cada grupo, por orden de apertura.
        sortedAccounts(): Account[] {
            return [...this.accounts].sort((a, b) =>
                Number(b.status === 'ACTIVE') - Number(a.status === 'ACTIVE') || a.id - b.id)
        },
    },

    mounted() {
        this.fetchAccounts()
    },

    methods: {
        accountStatusLabel,
        formatCurrency,
        formatDate,
        formatIBAN,

        async fetchAccounts() {
            this.loading = true
            this.error = ''

            try {
                const response = await api.get('/accounts')
                this.accounts = response.data.accounts || []
            } catch (err) {
                console.error('Error al cargar las cuentas:', err)
                this.error = 'No se han podido cargar tus cuentas.'
            } finally {
                this.loading = false
            }
        },

        // Crea una cuenta bancaria y la añade al listado actual.
        async createAccount() {
            if (this.creating) {
                return
            }

            this.creating = true
            this.actionError = ''
            this.createdIBAN = ''

            try {
                const response = await api.post('/accounts')
                const account = response.data.account

                if (account) {
                    this.accounts.push(account)
                    this.createdIBAN = account.iban
                }
            } catch (err) {
                console.error('Error al crear la cuenta:', err)
                this.actionError = 'No se ha podido abrir la cuenta.'
            } finally {
                this.creating = false
            }
        },
    },
}
</script>



<style scoped>
/* Posición global */
.summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
}

.summary-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 1.25rem 1.5rem;
}

.summary-item + .summary-item {
    border-left: 1px solid var(--sb-border);
}

.summary-value {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--sb-navy-900);
}

.summary-hint {
    font-size: 0.8125rem;
    color: var(--sb-muted);
}

@media (max-width: 575.98px) {
    .summary {
        grid-template-columns: 1fr 1fr;
    }

    .summary-item:first-child {
        grid-column: 1 / -1;
        border-bottom: 1px solid var(--sb-border);
    }

    .summary-item + .summary-item {
        border-left: 0;
    }

    .summary-item:last-child {
        border-left: 1px solid var(--sb-border);
    }
}

/* Listado */
.account-item + .account-item {
    border-top: 1px solid var(--sb-border);
}

.account-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem 1rem;
    width: 100%;
    padding: 1rem 1.25rem;
    border: 0;
    text-align: left;
    color: var(--sb-text);
    background-color: var(--sb-surface);
    transition: background-color 0.15s ease;
}

.account-row:hover {
    background-color: var(--sb-surface-muted);
}

.account-row:focus-visible {
    outline: 2px solid var(--sb-blue-600);
    outline-offset: -2px;
}

.account-icon {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 0.5rem;
    font-size: 1.25rem;
    color: var(--sb-navy-800);
    background-color: #e8eef5;
}

.account-main {
    display: flex;
    flex: 1 1 14rem;
    flex-direction: column;
    min-width: 0;
}

.account-iban {
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--sb-navy-900);
    overflow-wrap: anywhere;
}

.account-meta {
    font-size: 0.8125rem;
    color: var(--sb-muted);
}

.account-balance {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    min-width: 8.5rem;
    margin-left: auto;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--sb-navy-900);
}

.account-chevron {
    color: var(--sb-muted);
    transition: transform 0.15s ease;
}

.account-row:hover .account-chevron {
    transform: translateX(2px);
}

.account-row.closed .account-icon {
    color: var(--sb-muted);
    background-color: #edf0f3;
}

.account-row.closed .account-iban,
.account-row.closed .account-balance {
    color: var(--sb-muted);
}
</style>
