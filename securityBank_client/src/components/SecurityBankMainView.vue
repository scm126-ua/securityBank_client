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

        <!-- Alertas de estado / acciones -->
        <div v-if="actionMessage.text" :class="['alert', actionMessage.isError ? 'alert-danger' : 'alert-success', 'd-flex gap-2']" role="alert">
            <AppIcon :name="actionMessage.isError ? 'alert-circle' : 'check-circle'" />
            <span>{{ actionMessage.text }}</span>
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
                            <p class="balance-amount amount">{{ formatCurrency(account.balance) }}</p>
                        </div>

                        <span class="status-badge"
                            :class="account.status === 'ACTIVE' ? 'status-active' : 'status-closed'">
                            {{ accountStatusLabel(account.status) }}
                        </span>
                    </div>

                    <dl class="account-details">
                        <div class="detail detail-iban">
                            <dt>IBAN</dt>
                            <dd>
                                <span class="iban">{{ formatIBAN(account.iban) }}</span>
                                <button type="button" class="copy-button" @click="copyIBAN">
                                    <AppIcon :name="ibanCopied ? 'check' : 'copy'" />
                                    {{ ibanCopied ? 'Copiado' : 'Copiar' }}
                                </button>
                            </dd>
                        </div>
                        <div class="detail">
                            <dt>Fecha de apertura</dt>
                            <dd>{{ formatDate(account.created_at) }}</dd>
                        </div>
                        <div class="detail">
                            <dt>Divisa</dt>
                            <dd>Euro (EUR)</dd>
                        </div>
                        <div class="detail">
                            <dt>Referencia</dt>
                            <dd>{{ account.id }}</dd>
                        </div>
                    </dl>

                    <!-- Botones de Acción Bancaria -->
                    <div v-if="account.status === 'ACTIVE'" class="action-buttons-grid pt-3 mt-3 border-top border-white-50 border-opacity-25">
                        <button type="button" class="btn btn-action-deposit" @click="openModal('deposit')">
                            <AppIcon name="plus" class="me-1" />
                            Ingresar Dinero
                        </button>
                        <button type="button" class="btn btn-action-withdraw" @click="openModal('withdraw')">
                            <AppIcon name="arrow-left" class="me-1" />
                            Retirar Dinero
                        </button>
                        <button type="button" class="btn btn-action-transfer" @click="openModal('transfer')">
                            <AppIcon name="transfer" class="me-1" />
                            Enviar Transferencia
                        </button>
                    </div>
                </div>

                <!-- Movimientos -->
                <div class="panel" id="movimientos">
                    <div class="panel-header d-flex flex-wrap justify-content-between align-items-center gap-2">
                        <h2 class="panel-title mb-0">Historial de Movimientos</h2>

                        <div class="btn-group btn-group-sm" role="group" aria-label="Filtrar movimientos">
                            <button v-for="filter in movementFilters" :key="filter.value" type="button" class="btn"
                                :class="movementFilter === filter.value ? 'btn-primary' : 'btn-outline-primary'"
                                :aria-pressed="movementFilter === filter.value" @click="setFilter(filter.value)">
                                {{ filter.label }}
                            </button>
                        </div>
                    </div>

                    <!-- Cargando -->
                    <div v-if="loadingTransactions" class="empty-state">
                        <div class="spinner-border text-primary" role="status"></div>
                        <p class="empty-text mt-2 mb-0">Cargando movimientos...</p>
                    </div>

                    <!-- Sin movimientos -->
                    <div v-else-if="transactions.length === 0" class="empty-state">
                        <span class="empty-icon">
                            <AppIcon name="transfer" />
                        </span>
                        <h3 class="empty-title">No hay movimientos que mostrar</h3>
                        <p class="empty-text">Las operaciones de esta cuenta aparecerán aquí.</p>
                    </div>

                    <!-- Tabla de movimientos -->
                    <div v-else class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light small text-uppercase text-muted">
                                <tr>
                                    <th class="ps-3">Operación</th>
                                    <th>Concepto</th>
                                    <th>Referencia (UUID)</th>
                                    <th>Fecha</th>
                                    <th class="text-end">Importe</th>
                                    <th class="text-center pe-3">Justificante</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="tx in transactions" :key="tx.reference">
                                    <td class="ps-3">
                                        <div class="d-flex align-items-center gap-2">
                                            <span v-if="tx.type === 'DEPOSIT'" class="badge text-bg-success">
                                                Ingreso
                                            </span>
                                            <span v-else-if="tx.type === 'WITHDRAWAL'" class="badge text-bg-warning">
                                                Retirada
                                            </span>
                                            <span v-else class="badge text-bg-info text-white">
                                                Transferencia
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <span class="fw-medium">{{ tx.description || 'Sin concepto' }}</span>
                                    </td>
                                    <td>
                                        <code class="small text-secondary">{{ tx.reference ? tx.reference.substring(0, 13) + '...' : '—' }}</code>
                                    </td>
                                    <td class="small text-muted">
                                        {{ formatDateTime(tx.created_at) }}
                                    </td>
                                    <td class="text-end fw-bold" :class="isPositive(tx) ? 'text-success' : 'text-danger'">
                                        {{ isPositive(tx) ? '+' : '-' }}{{ formatCurrency(tx.amount) }}
                                    </td>
                                    <td class="text-center pe-3">
                                        <button type="button" class="btn btn-sm btn-outline-secondary" @click="viewReceipt(tx.reference)" title="Ver justificante firmado">
                                            <AppIcon name="shield-check" class="text-primary me-1" />
                                            Justificante
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Paginación -->
                    <div v-if="totalPages > 1" class="panel-footer d-flex justify-content-between align-items-center p-3 border-top">
                        <small class="text-muted">Mostrando {{ transactions.length }} de {{ totalTransactions }} movimientos</small>
                        <div class="btn-group btn-group-sm">
                            <button type="button" class="btn btn-outline-secondary" :disabled="currentPage <= 1" @click="changePage(currentPage - 1)">
                                Anterior
                            </button>
                            <span class="btn btn-light disabled">{{ currentPage }} / {{ totalPages }}</span>
                            <button type="button" class="btn btn-outline-secondary" :disabled="currentPage >= totalPages" @click="changePage(currentPage + 1)">
                                Siguiente
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Panel lateral: Operaciones y Documentos -->
            <div class="col-lg-4">
                <div class="panel">
                    <div class="panel-header">
                        <h2 class="panel-title">Operaciones</h2>
                    </div>

                    <!-- Certificado de titularidad -->
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

                    <!-- Extracto bancario oficial -->
                    <div class="operation">
                        <span class="operation-icon">
                            <AppIcon name="file-text" />
                        </span>
                        <div>
                            <h3 class="operation-title">Extracto de movimientos</h3>
                            <p class="operation-text">
                                Descarga el extracto oficial firmado con RSA-PSS que certifica todas las operaciones registradas.
                            </p>
                            <button type="button" class="btn btn-outline-primary btn-sm"
                                :disabled="downloadingStatement" @click="downloadStatement">
                                <span v-if="downloadingStatement" class="spinner-border spinner-border-sm me-2"
                                    aria-hidden="true"></span>
                                <AppIcon v-else name="download" class="me-1" />
                                {{ downloadingStatement ? 'Descargando...' : 'Descargar extracto oficial' }}
                            </button>
                        </div>
                    </div>

                    <!-- Cerrar cuenta -->
                    <div v-if="account.status === 'ACTIVE'" class="operation">
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

        <!-- ── MODAL: OPERATIVA (Ingreso / Retirada / Transferencia) ── -->
        <Teleport to="body">
            <div v-if="activeModal" class="modal d-block" tabindex="-1" role="dialog" aria-modal="true" style="background: rgba(0,0,0,0.5);">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content shadow border-0">
                        <div class="modal-header">
                            <h5 class="modal-title fw-bold">
                                <span v-if="activeModal === 'deposit'">Ingresar Dinero</span>
                                <span v-else-if="activeModal === 'withdraw'">Retirar Dinero</span>
                                <span v-else>Nueva Transferencia</span>
                            </h5>
                            <button type="button" class="btn-close" @click="closeModal"></button>
                        </div>

                        <form @submit.prevent="submitOperation">
                            <div class="modal-body">
                                <div v-if="modalError" class="alert alert-danger small mb-3">
                                    {{ modalError }}
                                </div>

                                <!-- IBAN destino (solo transferencia) -->
                                <div v-if="activeModal === 'transfer'" class="mb-3">
                                    <label class="form-label fw-semibold small">IBAN Destino</label>
                                    <input v-model="form.destinationIBAN" type="text" class="form-control" placeholder="ES0000000000000000000000" required>
                                    <div class="form-text">Introduce el código IBAN de la cuenta a la que deseas transferir.</div>
                                </div>

                                <!-- Importe -->
                                <div class="mb-3">
                                    <label class="form-label fw-semibold small">Importe (€)</label>
                                    <div class="input-group">
                                        <input v-model.number="form.amount" type="number" step="0.01" min="0.01" class="form-control" placeholder="0.00" required>
                                        <span class="input-group-text">€</span>
                                    </div>
                                    <div v-if="activeModal === 'withdraw' || activeModal === 'transfer'" class="form-text">
                                        Saldo disponible: {{ formatCurrency(account.balance) }}
                                    </div>
                                </div>

                                <!-- Concepto -->
                                <div class="mb-3">
                                    <label class="form-label fw-semibold small">Concepto</label>
                                    <input v-model="form.description" type="text" class="form-control" placeholder="Ej. Pago alquiler, nómina, etc." maxlength="100">
                                </div>
                            </div>

                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" :disabled="submitting" @click="closeModal">Cancelar</button>
                                <button type="submit" class="btn btn-primary" :disabled="submitting">
                                    <span v-if="submitting" class="spinner-border spinner-border-sm me-1"></span>
                                    Confirmar Operación
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </Teleport>

        <!-- ── MODAL: JUSTIFICANTE FIRMADO (RECEIPT) ── -->
        <Teleport to="body">
            <div v-if="receiptModal" class="modal d-block" tabindex="-1" role="dialog" aria-modal="true" style="background: rgba(0,0,0,0.5);">
                <div class="modal-dialog modal-dialog-centered modal-lg">
                    <div class="modal-content shadow border-0">
                        <div class="modal-header bg-light">
                            <h5 class="modal-title fw-bold text-primary">
                                <AppIcon name="shield-check" class="text-success me-2" />
                                Justificante Oficial de Movimiento
                            </h5>
                            <button type="button" class="btn-close" @click="receiptModal = null"></button>
                        </div>

                        <div class="modal-body p-4">
                            <div class="alert alert-success d-flex align-items-center gap-2 small mb-4">
                                <AppIcon name="check-circle" />
                                <div>
                                    <strong>Verificado por el Servidor:</strong> La firma criptográfica RSA-PSS y el sello HMAC-SHA256 garantizan la autenticidad e integridad inmutable de esta operación.
                                </div>
                            </div>

                            <div class="row g-3 mb-4">
                                <div class="col-md-6">
                                    <small class="text-muted d-block">Referencia Única (UUID)</small>
                                    <code class="fw-bold">{{ receiptModal.receipt.reference }}</code>
                                </div>
                                <div class="col-md-6">
                                    <small class="text-muted d-block">Identificador de Justificante</small>
                                    <code>{{ receiptModal.receipt.receipt_id }}</code>
                                </div>
                                <div class="col-md-4">
                                    <small class="text-muted d-block">Tipo de Operación</small>
                                    <span class="badge text-bg-primary">{{ receiptModal.receipt.type }}</span>
                                </div>
                                <div class="col-md-4">
                                    <small class="text-muted d-block">Importe</small>
                                    <strong class="fs-5">{{ formatCurrency(receiptModal.receipt.amount) }}</strong>
                                </div>
                                <div class="col-md-4">
                                    <small class="text-muted d-block">Fecha y Hora</small>
                                    <span>{{ formatDateTime(receiptModal.receipt.created_at) }}</span>
                                </div>
                                <div class="col-12">
                                    <small class="text-muted d-block">Concepto</small>
                                    <span>{{ receiptModal.receipt.description || 'Sin concepto' }}</span>
                                </div>
                            </div>

                            <!-- Firma digital RSA-PSS -->
                            <div class="border rounded p-3 bg-light">
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <small class="fw-bold text-muted text-uppercase">Firma Digital ({{ receiptModal.signature_algorithm }})</small>
                                    <span class="badge text-bg-success">Válida</span>
                                </div>
                                <pre class="small text-muted mb-0 text-break" style="font-size: 0.75rem;">{{ receiptModal.signature }}</pre>
                            </div>
                        </div>

                        <div class="modal-footer">
                            <button type="button" class="btn btn-outline-primary" @click="downloadReceiptJSON">
                                <AppIcon name="download" class="me-1" /> Descargar Justificante (.json)
                            </button>
                            <button type="button" class="btn btn-secondary" @click="receiptModal = null">Cerrar</button>
                        </div>
                    </div>
                </div>
            </div>
        </Teleport>

        <!-- Diálogo para confirmar el cierre de cuenta -->
        <ConfirmDialog v-if="confirmingClose" title="¿Cerrar esta cuenta?" confirm-label="Cerrar cuenta"
            @confirm="closeAccount" @cancel="confirmingClose = false">
            Vas a cerrar la cuenta <strong class="text-nowrap">{{ formatIBAN(account.iban) }}</strong>.
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
    { value: '', label: 'Todos' },
    { value: 'DEPOSIT', label: 'Ingresos' },
    { value: 'WITHDRAWAL', label: 'Retiradas' },
    { value: 'TRANSFER', label: 'Transferencias' }
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
            account: { ...this.selectedAccount },
            movementFilters,
            movementFilter: '',
            confirmingClose: false,
            closing: false,
            closeError: '',
            generatingCertificate: false,
            certificateError: '',
            certificateDownloaded: false,
            ibanCopied: false,

            // Movimientos
            transactions: [],
            totalTransactions: 0,
            currentPage: 1,
            pageSize: 10,
            loadingTransactions: false,

            // Modales de operaciones
            activeModal: null, // 'deposit' | 'withdraw' | 'transfer' | null
            submitting: false,
            modalError: '',
            form: {
                amount: null,
                description: '',
                destinationIBAN: ''
            },

            // Extracto y justificante
            downloadingStatement: false,
            actionMessage: { text: '', isError: false },
            receiptModal: null
        }
    },

    computed: {
        hasBalance() {
            return Number(this.account.balance) !== 0
        },
        totalPages() {
            return Math.ceil(this.totalTransactions / this.pageSize) || 1
        }
    },

    watch: {
        selectedAccount: {
            handler(newVal) {
                if (newVal) {
                    this.account = { ...newVal }
                }
            },
            deep: true
        }
    },

    mounted() {
        this.fetchTransactions()
    },

    methods: {
        accountStatusLabel,
        formatCurrency,
        formatDate,
        formatIBAN,

        formatDateTime(date) {
            if (!date) return '—'
            const parsed = new Date(date)
            return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        },

        isPositive(tx) {
            if (tx.type === 'DEPOSIT') return true
            if (tx.type === 'TRANSFER' && tx.destination_account_id === this.account.id) return true
            return false
        },

        // Copia el IBAN sin espacios al portapapeles.
        async copyIBAN() {
            try {
                await navigator.clipboard.writeText(String(this.account.iban).replace(/\s/g, ''))
                this.ibanCopied = true
                setTimeout(() => (this.ibanCopied = false), 2000)
            } catch (error) {
                console.error('No se ha podido copiar el IBAN:', error)
            }
        },

        // Solicita el certificado de titularidad firmado
        async downloadOwnershipCertificate() {
            if (this.generatingCertificate) {
                return
            }

            this.generatingCertificate = true
            this.certificateError = ''
            this.certificateDownloaded = false

            try {
                const response = await api.get(
                    `/accounts/${this.account.id}/ownership-certificate`
                )
                const content = JSON.stringify(response.data, null, 2)
                const file = new Blob([content], {
                    type: 'application/json;charset=utf-8'
                })
                const downloadURL = URL.createObjectURL(file)
                const link = document.createElement('a')
                const normalizedIBAN = String(this.account.iban)
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
        },

        // Carga el listado paginado y filtrado de movimientos
        async fetchTransactions() {
            this.loadingTransactions = true
            try {
                const params = {
                    page: this.currentPage,
                    page_size: this.pageSize
                }
                if (this.movementFilter) {
                    params.type = this.movementFilter
                }

                const res = await api.get(`/accounts/${this.account.id}/transactions`, { params })
                this.transactions = res.data.transactions || []
                this.totalTransactions = res.data.total || 0
            } catch (err) {
                console.error('Error cargando movimientos:', err)
            } finally {
                this.loadingTransactions = false
            }
        },

        setFilter(type) {
            this.movementFilter = type
            this.currentPage = 1
            this.fetchTransactions()
        },

        changePage(newPage) {
            this.currentPage = newPage
            this.fetchTransactions()
        },

        openModal(type) {
            this.activeModal = type
            this.modalError = ''
            this.form = { amount: null, description: '', destinationIBAN: '' }
        },

        closeModal() {
            this.activeModal = null
            this.modalError = ''
        },

        // Enviar operación al backend
        async submitOperation() {
            this.submitting = true
            this.modalError = ''

            // Clave de idempotencia única para prevenir doble gasto
            const idempotencyKey = crypto.randomUUID()

            try {
                let endpoint = ''
                const payload = {
                    amount: this.form.amount,
                    description: this.form.description,
                    idempotency_key: idempotencyKey
                }

                if (this.activeModal === 'deposit') {
                    endpoint = `/accounts/${this.account.id}/deposit`
                } else if (this.activeModal === 'withdraw') {
                    endpoint = `/accounts/${this.account.id}/withdraw`
                } else if (this.activeModal === 'transfer') {
                    endpoint = `/accounts/${this.account.id}/transfer`
                    payload.destination_iban = this.form.destinationIBAN
                }

                await api.post(endpoint, payload)

                // Actualizar saldo local
                if (this.activeModal === 'deposit') {
                    this.account.balance = Number(this.account.balance) + Number(this.form.amount)
                    this.actionMessage = { text: '¡Ingreso realizado con éxito!', isError: false }
                } else {
                    this.account.balance = Number(this.account.balance) - Number(this.form.amount)
                    this.actionMessage = { text: '¡Operación completada con éxito!', isError: false }
                }

                this.closeModal()
                this.currentPage = 1
                await this.fetchTransactions()
            } catch (err) {
                console.error('Error en la operación:', err)
                this.modalError = err.response?.data?.error || 'No se pudo completar la operación.'
            } finally {
                this.submitting = false
            }
        },

        // Obtener justificante firmado con RSA-PSS
        async viewReceipt(reference) {
            try {
                const res = await api.get(`/transactions/${reference}/receipt`)
                this.receiptModal = res.data
            } catch (err) {
                alert(err.response?.data?.error || 'No se pudo obtener el justificante.')
            }
        },

        downloadReceiptJSON() {
            if (!this.receiptModal) return
            const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.receiptModal, null, 2))
            const downloadAnchor = document.createElement('a')
            downloadAnchor.setAttribute('href', dataStr)
            downloadAnchor.setAttribute('download', `justificante-${this.receiptModal.receipt.reference}.json`)
            document.body.appendChild(downloadAnchor)
            downloadAnchor.click()
            downloadAnchor.remove()
        },

        // Descargar Extracto Oficial firmado
        async downloadStatement() {
            this.downloadingStatement = true
            try {
                const res = await api.get(`/accounts/${this.account.id}/statement`)
                const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data, null, 2))
                const downloadAnchor = document.createElement('a')
                downloadAnchor.setAttribute('href', dataStr)
                downloadAnchor.setAttribute('download', `extracto-bancario-${this.account.iban}.json`)
                document.body.appendChild(downloadAnchor)
                downloadAnchor.click()
                downloadAnchor.remove()
                this.actionMessage = { text: 'Extracto oficial descargado y verificado correctamente.', isError: false }
            } catch (err) {
                this.actionMessage = { text: err.response?.data?.error || 'No se pudo generar el extracto.', isError: true }
            } finally {
                this.downloadingStatement = false
            }
        },

        // Cierra la cuenta seleccionada una vez confirmada la acción.
        async closeAccount() {
            this.confirmingClose = false

            if (this.closing) {
                return
            }

            this.closing = true
            this.closeError = ''

            try {
                await api.patch(`/accounts/${this.account.id}/close`)
                this.$emit('account-closed')
            } catch (error) {
                this.closeError = error.response?.data?.error || 'No se ha podido cerrar la cuenta.'
            } finally {
                this.closing = false
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

/* Botones de acción operativa */
.action-buttons-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.75rem;
}

.btn-action-deposit,
.btn-action-withdraw,
.btn-action-transfer {
    background-color: #ffffff;
    color: var(--sb-navy-900, #0d3b66);
    font-weight: 600;
    font-size: 0.9rem;
    border: none;
    border-radius: 0.5rem;
    padding: 0.6rem 0.75rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}

.btn-action-deposit:hover,
.btn-action-withdraw:hover,
.btn-action-transfer:hover {
    background-color: #f0f4f8;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.12);
}

/* Operaciones laterales */
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

.table th {
    font-size: 0.78rem;
    letter-spacing: 0.5px;
}
</style>
