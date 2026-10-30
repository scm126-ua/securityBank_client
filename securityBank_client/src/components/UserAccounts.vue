<template>
    <div class="container mt-4">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
            <div>
                <h4 class="fw-bold mb-1">Mis cuentas</h4>
                <p class="text-muted mb-0">
                    Selecciona una cuenta para acceder a sus detalles.
                </p>
            </div>

            <div class="d-flex align-items-center gap-3">
                <span class="badge rounded-pill text-bg-primary">
                    {{ accounts.length }} cuentas
                </span>

                <button type="button" class="btn btn-primary" :disabled="creating" @click="createAccount">
                    <span v-if="creating" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                    {{ creating ? 'Creando...' : 'Nueva cuenta' }}
                </button>

                <button type="button" class="btn btn-outline-primary" @click="$emit('open-documents')">
                    Mis documentos
                </button>

                <button type="button" class="btn btn-outline-dark" @click="open2FAModal">
                    🛡️ Seguridad 2FA
                </button>

                <button type="button" class="btn btn-outline-secondary" @click="$emit('logout')">
                    Cerrar sesión
                </button>
            </div>
        </div>

        <!-- Error al crear una cuenta -->
        <div v-if="actionError" class="alert alert-danger" role="alert">
            {{ actionError }}
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

                            <span class="badge" :class="account.status === 'ACTIVE'
                                ? 'text-bg-success'
                                : 'text-bg-secondary'">
                                {{ account.status }}
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

        <!-- Modal 2FA -->
        <div v-if="show2FAModal" class="modal-backdrop fade show"></div>
        <div v-if="show2FAModal" class="modal fade show d-block" tabindex="-1" role="dialog" aria-modal="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content shadow border-0 rounded-4">
                    <div class="modal-header border-0 pb-0">
                        <h5 class="modal-title fw-bold">Autenticación de dos factores (2FA)</h5>
                        <button type="button" class="btn-close" aria-label="Cerrar" @click="close2FAModal"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div v-if="modalLoading" class="text-center py-4">
                            <div class="spinner-border text-primary" role="status"></div>
                            <p class="text-muted small mt-2">Cargando...</p>
                        </div>

                        <div v-else>
                            <div v-if="modalMessage" class="alert alert-success small py-2">
                                {{ modalMessage }}
                            </div>
                            <div v-if="modalError" class="alert alert-danger small py-2">
                                {{ modalError }}
                            </div>

                            <!-- Estado 2FA Actual -->
                            <div class="d-flex align-items-center justify-content-between p-3 border rounded-3 bg-light mb-3">
                                <div>
                                    <div class="fw-semibold">Estado de protección</div>
                                    <small class="text-muted">Protege el inicio de sesión con código TOTP</small>
                                </div>
                                <span class="badge fs-6" :class="totpEnabled ? 'text-bg-success' : 'text-bg-secondary'">
                                    {{ totpEnabled ? 'Activado' : 'Desactivado' }}
                                </span>
                            </div>

                            <!-- Si 2FA está ACTIVADO -> opción de desactivar -->
                            <div v-if="totpEnabled">
                                <p class="small text-muted mb-3">
                                    Tu cuenta requiere un código de 6 dígitos de tu app de autenticación cada vez que inicias sesión.
                                </p>

                                <div v-if="showDisableForm" class="p-3 border rounded-3 bg-light mb-3">
                                    <label class="form-label fw-semibold small">Introduce el código 2FA actual para confirmar desactivación:</label>
                                    <input v-model.trim="disableCode" type="text" maxlength="6"
                                        class="form-control text-center fs-5 fw-bold letter-spacing mb-2"
                                        placeholder="000000" />
                                    <button class="btn btn-danger w-100 btn-sm" :disabled="modalActionLoading" @click="disable2FA">
                                        {{ modalActionLoading ? 'Desactivando...' : 'Confirmar desactivación' }}
                                    </button>
                                </div>
                                <div v-else>
                                    <button class="btn btn-outline-danger w-100" @click="showDisableForm = true">
                                        Desactivar 2FA
                                    </button>
                                </div>
                            </div>

                            <!-- Si 2FA está DESACTIVADO -> opción de configurar y activar -->
                            <div v-else>
                                <div v-if="setupData">
                                    <p class="small text-muted mb-2 text-center">
                                        1. Escanea este código QR con tu app de autenticación:
                                    </p>
                                    <div class="text-center mb-2">
                                        <img :src="setupData.qr_code" alt="Código QR" class="img-thumbnail" style="width: 160px; height: 160px;" />
                                    </div>
                                    <div class="text-center small text-muted mb-3">
                                        O introduce la clave manualmente: <br />
                                        <code class="user-select-all fw-bold text-dark fs-6">{{ setupData.secret }}</code>
                                    </div>
                                    <label class="form-label fw-semibold small">
                                        2. Introduce el código de 6 dígitos para verificar y activar:
                                    </label>
                                    <input v-model.trim="enableCode" type="text" maxlength="6"
                                        class="form-control text-center fs-5 fw-bold letter-spacing mb-3"
                                        placeholder="000000" />
                                    <button class="btn btn-primary w-100" :disabled="modalActionLoading" @click="confirmEnable2FA">
                                        {{ modalActionLoading ? 'Activando...' : 'Activar 2FA' }}
                                    </button>
                                </div>
                                <div v-else>
                                    <p class="small text-muted mb-3">
                                        La autenticación de dos factores añade una capa de seguridad para evitar accesos no autorizados a tu banca online.
                                    </p>
                                    <button class="btn btn-primary w-100" :disabled="modalActionLoading" @click="start2FASetup">
                                        {{ modalActionLoading ? 'Iniciando...' : 'Configurar y activar 2FA' }}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
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
    status: string
}

export default {
    name: 'UserAccounts',

    data() {
        return {
            accounts: [] as Account[],
            loading: false,
            creating: false,
            error: '',
            actionError: '',

            // Modal 2FA
            show2FAModal: false,
            modalLoading: false,
            modalActionLoading: false,
            modalError: '',
            modalMessage: '',
            totpEnabled: false,
            setupData: null as { secret: string; otpauth_url: string; qr_code: string } | null,
            enableCode: '',
            showDisableForm: false,
            disableCode: ''
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
                await api.get('/accounts').then((response) => {
                    this.accounts = response.data.accounts || []
                })
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

            try {
                const response = await api.post('/accounts')
                const account = response.data.account

                if (account) {
                    this.accounts.push(account)
                }
            } catch (err) {
                console.error('Error al crear la cuenta:', err)
                this.actionError = 'No se ha podido crear la cuenta.'
            } finally {
                this.creating = false
            }
        },

        async open2FAModal() {
            this.show2FAModal = true
            this.modalError = ''
            this.modalMessage = ''
            this.setupData = null
            this.showDisableForm = false
            this.enableCode = ''
            this.disableCode = ''
            await this.fetch2FAStatus()
        },

        close2FAModal() {
            this.show2FAModal = false
            this.setupData = null
            this.showDisableForm = false
            this.modalError = ''
            this.modalMessage = ''
        },

        async fetch2FAStatus() {
            this.modalLoading = true
            try {
                const res = await api.get('/totp/status')
                this.totpEnabled = res.data.totp_enabled
            } catch (err: any) {
                this.modalError = err.response?.data?.error || 'Error al obtener estado 2FA'
            } finally {
                this.modalLoading = false
            }
        },

        async start2FASetup() {
            this.modalActionLoading = true
            this.modalError = ''
            try {
                const res = await api.post('/totp/setup')
                this.setupData = res.data
            } catch (err: any) {
                this.modalError = err.response?.data?.error || 'Error al iniciar configuración 2FA'
            } finally {
                this.modalActionLoading = false
            }
        },

        async confirmEnable2FA() {
            if (!this.enableCode || this.enableCode.length !== 6) {
                this.modalError = 'Introduce un código de 6 dígitos válido.'
                return
            }

            this.modalActionLoading = true
            this.modalError = ''
            try {
                await api.post('/totp/enable', { code: this.enableCode })
                this.totpEnabled = true
                this.setupData = null
                this.enableCode = ''
                this.modalMessage = 'Autenticación de dos factores activada con éxito.'
            } catch (err: any) {
                this.modalError = err.response?.data?.error || 'Código incorrecto. No se pudo activar el 2FA.'
            } finally {
                this.modalActionLoading = false
            }
        },

        async disable2FA() {
            if (!this.disableCode || this.disableCode.length !== 6) {
                this.modalError = 'Introduce el código de 6 dígitos.'
                return
            }

            this.modalActionLoading = true
            this.modalError = ''
            try {
                await api.post('/totp/disable', { code: this.disableCode })
                this.totpEnabled = false
                this.showDisableForm = false
                this.disableCode = ''
                this.modalMessage = 'Autenticación de dos factores desactivada.'
            } catch (err: any) {
                this.modalError = err.response?.data?.error || 'Código incorrecto. No se pudo desactivar el 2FA.'
            } finally {
                this.modalActionLoading = false
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

.letter-spacing {
    letter-spacing: 0.35rem;
}
</style>
