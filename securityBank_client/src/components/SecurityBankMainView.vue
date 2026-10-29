<template>
    <section>
        <button type="button" class="back-link" @click="$emit('back-to-accounts')">
            <AppIcon name="arrow-left" />
            Volver a mis cuentas
        </button>

        <div class="page-header">
            <div>
                <h1 class="page-title">Detalle de la cuenta</h1>
                <p class="page-subtitle">Consulta el saldo, los datos de la cuenta y las operaciones disponibles.</p>
            </div>
        </div>

        <div v-if="closeError" class="alert alert-danger d-flex gap-2" role="alert">
            <AppIcon name="alert-circle" />
            <span>{{ closeError }}</span>
        </div>

        <div v-if="certificateError" class="alert alert-danger d-flex gap-2" role="alert">
            <AppIcon name="alert-circle" />
            <span>{{ certificateError }}</span>
        </div>

        <div v-if="certificateDownloaded" class="alert alert-success d-flex gap-2" role="status">
            <AppIcon name="check-circle" />
            <span>Se ha descargado el certificado de titularidad firmado por SecurityBank.</span>
        </div>

        <div class="row g-4">
            <div class="col-lg-8">
                <!-- Saldo y datos de la cuenta -->
                <div class="balance-card mb-4">
                    <div class="d-flex flex-wrap justify-content-between align-items-start gap-3">
                        <div>
                            <span class="balance-label">Saldo disponible</span>
                            <p class="balance-amount amount">{{ formatCurrency(selectedAccount.balance) }}</p>
                        </div>

                        <span class="status-badge"
                            :class="selectedAccount.status === 'ACTIVE' ? 'status-active' : 'status-closed'">
                            {{ accountStatusLabel(selectedAccount.status) }}
                        </span>
                    </div>

                    <dl class="account-details">
                        <div class="detail detail-iban">
                            <dt>IBAN</dt>
                            <dd>
                                <span class="iban">{{ formatIBAN(selectedAccount.iban) }}</span>
                                <button type="button" class="copy-button" @click="copyIBAN">
                                    <AppIcon :name="ibanCopied ? 'check' : 'copy'" />
                                    {{ ibanCopied ? 'Copiado' : 'Copiar' }}
                                </button>
                            </dd>
                        </div>
                        <div class="detail">
                            <dt>Fecha de apertura</dt>
                            <dd>{{ formatDate(selectedAccount.created_at) }}</dd>
                        </div>
                        <div class="detail">
                            <dt>Divisa</dt>
                            <dd>Euro (EUR)</dd>
                        </div>
                        <div class="detail">
                            <dt>Referencia</dt>
                            <dd>{{ selectedAccount.id }}</dd>
                        </div>
                    </dl>
                </div>

                <!-- Movimientos -->
                <div class="panel" id="movimientos">
                    <div class="panel-header">
                        <h2 class="panel-title">Movimientos</h2>

                        <div class="btn-group btn-group-sm" role="group" aria-label="Filtrar movimientos">
                            <button v-for="filter in movementFilters" :key="filter.value" type="button" class="btn"
                                :class="movementFilter === filter.value ? 'btn-primary' : 'btn-outline-primary'"
                                :aria-pressed="movementFilter === filter.value" @click="movementFilter = filter.value">
                                {{ filter.label }}
                            </button>
                        </div>
                    </div>

                    <div class="empty-state">
                        <span class="empty-icon">
                            <AppIcon name="transfer" />
                        </span>
                        <h3 class="empty-title">No hay movimientos que mostrar</h3>
                        <p class="empty-text">Las operaciones de esta cuenta aparecerán aquí.</p>
                    </div>
                </div>
            </div>

            <!-- Operaciones -->
            <div class="col-lg-4">
                <div class="panel">
                    <div class="panel-header">
                        <h2 class="panel-title">Operaciones</h2>
                    </div>

                    <div class="operation">
                        <span class="operation-icon">
                            <AppIcon name="file-check" />
                        </span>
                        <div>
                            <h3 class="operation-title">Certificado de titularidad</h3>
                            <p class="operation-text">
                                Documento firmado digitalmente por el banco que acredita que eres titular de
                                esta cuenta.
                            </p>
                            <button type="button" class="btn btn-outline-primary btn-sm"
                                :disabled="generatingCertificate" @click="downloadOwnershipCertificate">
                                <span v-if="generatingCertificate" class="spinner-border spinner-border-sm me-2"
                                    aria-hidden="true"></span>
                                <AppIcon v-else name="download" class="me-1" />
                                {{ generatingCertificate ? 'Generando...' : 'Descargar certificado' }}
                            </button>
                        </div>
                    </div>

                    <div v-if="selectedAccount.status === 'ACTIVE'" class="operation">
                        <span class="operation-icon operation-icon-danger">
                            <AppIcon name="x-circle" />
                        </span>
                        <div>
                            <h3 class="operation-title">Cerrar cuenta</h3>
                            <p class="operation-text">
                                {{ hasBalance
                                    ? 'Para cerrar la cuenta, su saldo debe ser 0,00 €.'
                                    : 'La cuenta se cerrará de forma permanente y no admitirá nuevas operaciones.' }}
                            </p>
                            <button type="button" class="btn btn-outline-danger btn-sm"
                                :disabled="closing || hasBalance" @click="confirmingClose = true">
                                <span v-if="closing" class="spinner-border spinner-border-sm me-2"
                                    aria-hidden="true"></span>
                                {{ closing ? 'Cerrando...' : 'Cerrar cuenta' }}
                            </button>
                        </div>
                    </div>

                    <div v-else class="operation">
                        <span class="operation-icon">
                            <AppIcon name="info" />
                        </span>
                        <div>
                            <h3 class="operation-title">Cuenta cerrada</h3>
                            <p class="operation-text mb-0">Esta cuenta está cerrada y no admite nuevas operaciones.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <ConfirmDialog v-if="confirmingClose" title="¿Cerrar esta cuenta?" confirm-label="Cerrar cuenta"
            @confirm="closeAccount" @cancel="confirmingClose = false">
            Vas a cerrar la cuenta <strong class="text-nowrap">{{ formatIBAN(selectedAccount.iban) }}</strong>.
            El cierre es permanente: la cuenta no podrá volver a utilizarse.
        </ConfirmDialog>
    </section>
</template>

<script>
import api from '@/api/axios'
import { accountStatusLabel, formatCurrency, formatDate, formatIBAN } from '@/utils/format'
import AppIcon from './AppIcon.vue'
import ConfirmDialog from './ConfirmDialog.vue'

const movementFilters = [
    { value: 'ALL', label: 'Todos' },
    { value: 'INCOME', label: 'Ingresos' },
    { value: 'EXPENSE', label: 'Gastos' }
]

export default {
    components: { AppIcon, ConfirmDialog },

    props: {
        selectedAccount: {
            type: Object,
            required: true
        }
    },

    emits: ['back-to-accounts', 'account-closed'],

    data() {
        return {
            movementFilters,
            movementFilter: 'ALL',
            confirmingClose: false,
            closing: false,
            closeError: '',
            generatingCertificate: false,
            certificateError: '',
            certificateDownloaded: false,
            ibanCopied: false
        }
    },

    computed: {
        // El servidor solo permite cerrar cuentas sin saldo.
        hasBalance() {
            return Number(this.selectedAccount.balance) !== 0
        }
    },

    methods: {
        accountStatusLabel,
        formatCurrency,
        formatDate,
        formatIBAN,

        // Cierra la cuenta seleccionada una vez confirmada la acción.
        async closeAccount() {
            this.confirmingClose = false

            if (this.closing) {
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

        // Copia el IBAN sin espacios al portapapeles.
        async copyIBAN() {
            try {
                await navigator.clipboard.writeText(String(this.selectedAccount.iban).replace(/\s/g, ''))
                this.ibanCopied = true
                setTimeout(() => (this.ibanCopied = false), 2000)
            } catch (error) {
                console.error('No se ha podido copiar el IBAN:', error)
            }
        },

        // Solicita el certificado firmado y lo descarga como un archivo JSON.
        async downloadOwnershipCertificate() {
            if (this.generatingCertificate) {
                return
            }

            this.generatingCertificate = true
            this.certificateError = ''
            this.certificateDownloaded = false

            try {
                const response = await api.get(
                    `/accounts/${this.selectedAccount.id}/ownership-certificate`
                )
                const content = JSON.stringify(response.data, null, 2)
                const file = new Blob([content], {
                    type: 'application/json;charset=utf-8'
                })
                const downloadURL = URL.createObjectURL(file)
                const link = document.createElement('a')
                const normalizedIBAN = String(this.selectedAccount.iban)
                    .replace(/[^a-zA-Z0-9]/g, '')

                link.href = downloadURL
                link.download = `certificado-titularidad-${normalizedIBAN}.json`
                document.body.appendChild(link)
                link.click()
                link.remove()
                URL.revokeObjectURL(downloadURL)
                this.certificateDownloaded = true
            } catch (error) {
                console.error('Error al generar el certificado:', error)
                this.certificateError = error.response?.data?.error ||
                    'No se ha podido generar el certificado de titularidad.'
            } finally {
                this.generatingCertificate = false
            }
        }
    }
}
</script>

<style scoped>
/* Saldo y datos de la cuenta */
.balance-card {
    padding: 1.75rem;
    color: #ffffff;
    border-radius: var(--sb-radius);
    background:
        radial-gradient(circle at 90% 0%, rgb(31 95 168 / 35%), transparent 45%),
        linear-gradient(135deg, var(--sb-navy-900), var(--sb-navy-700));
    box-shadow: var(--sb-shadow);
}

.balance-label {
    font-size: 0.8125rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgb(255 255 255 / 70%);
}

.balance-amount {
    margin: 0.25rem 0 0;
    font-size: 2.5rem;
    font-weight: 600;
    line-height: 1.2;
}

.balance-card .status-badge {
    color: #ffffff;
    background-color: rgb(255 255 255 / 14%);
}

.balance-card .status-active::before {
    background-color: #5fd39a;
}

.account-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: 1rem 1.5rem;
    margin: 1.75rem 0 0;
    padding-top: 1.25rem;
    border-top: 1px solid rgb(255 255 255 / 18%);
}

.detail-iban {
    grid-column: 1 / -1;
}

.detail dt {
    margin-bottom: 0.125rem;
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: rgb(255 255 255 / 60%);
}

.detail dd {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    margin: 0;
    font-weight: 500;
}

.iban {
    font-size: 1.125rem;
    letter-spacing: 0.04em;
    overflow-wrap: anywhere;
}

.copy-button {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.625rem;
    border: 1px solid rgb(255 255 255 / 30%);
    border-radius: 0.375rem;
    font-size: 0.8125rem;
    color: #ffffff;
    background: none;
}

.copy-button:hover {
    background-color: rgb(255 255 255 / 10%);
}

/* Operaciones */
.operation {
    display: flex;
    gap: 1rem;
    padding: 1.25rem;
}

.operation + .operation {
    border-top: 1px solid var(--sb-border);
}

.operation-icon {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.5rem;
    font-size: 1.125rem;
    color: var(--sb-navy-800);
    background-color: #e8eef5;
}

.operation-icon-danger {
    color: var(--sb-danger);
    background-color: var(--sb-danger-bg);
}

.operation-title {
    margin-bottom: 0.25rem;
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--sb-navy-900);
}

.operation-text {
    margin-bottom: 0.75rem;
    font-size: 0.875rem;
    color: var(--sb-muted);
}
</style>
