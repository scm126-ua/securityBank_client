<template>
    <section>
        <div class="page-header">
            <div>
                <h1 class="page-title">Seguridad</h1>
                <p class="page-subtitle">Gestiona cómo se protege el acceso a tu banca online.</p>
            </div>
        </div>

        <div class="row g-4">
            <!-- Verificación en dos pasos -->
            <div class="col-lg-8">
                <div class="panel">
                    <div class="panel-header">
                        <h2 class="panel-title">Verificación en dos pasos (2FA)</h2>
                        <span v-if="!loading && statusLoaded" class="status-badge"
                            :class="totpEnabled ? 'status-active' : 'status-closed'">
                            {{ totpEnabled ? 'Activada' : 'Desactivada' }}
                        </span>
                    </div>

                    <div class="panel-body">
                        <div v-if="loading" class="text-center py-4">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Cargando...</span>
                            </div>
                        </div>

                        <template v-else>
                            <div v-if="message" class="alert alert-success d-flex gap-2" role="status">
                                <AppIcon name="check-circle" />
                                <span>{{ message }}</span>
                            </div>

                            <div v-if="error" class="alert alert-danger d-flex flex-wrap align-items-center gap-2"
                                role="alert">
                                <AppIcon name="alert-circle" />
                                <span>{{ error }}</span>
                                <button v-if="!statusLoaded" type="button" class="btn btn-outline-danger btn-sm ms-auto"
                                    @click="fetch2FAStatus">
                                    Reintentar
                                </button>
                            </div>

                            <!-- Activada: se puede desactivar con un código actual -->
                            <template v-if="statusLoaded && totpEnabled">
                                <p class="text-muted">
                                    Cada vez que inicies sesión te pediremos un código de 6 dígitos de tu aplicación
                                    de autenticación.
                                </p>

                                <form v-if="showDisableForm" class="action-box" @submit.prevent="disable2FA">
                                    <label for="disableTotpCode" class="form-label">
                                        Para desactivarla, escribe el código que muestra ahora tu aplicación.
                                    </label>
                                    <input id="disableTotpCode" v-model.trim="disableCode" type="text"
                                        class="form-control totp-input mb-3" placeholder="000000" inputmode="numeric"
                                        autocomplete="one-time-code" maxlength="6" />
                                    <div class="d-flex flex-wrap gap-2">
                                        <button type="submit" class="btn btn-danger" :disabled="actionLoading">
                                            <span v-if="actionLoading" class="spinner-border spinner-border-sm me-2"
                                                aria-hidden="true"></span>
                                            {{ actionLoading ? 'Desactivando...' : 'Desactivar 2FA' }}
                                        </button>
                                        <button type="button" class="btn btn-outline-secondary" :disabled="actionLoading"
                                            @click="showDisableForm = false; disableCode = ''; error = ''">
                                            Cancelar
                                        </button>
                                    </div>
                                </form>

                                <button v-else type="button" class="btn btn-outline-danger"
                                    @click="showDisableForm = true; message = ''">
                                    Desactivar la verificación en dos pasos
                                </button>
                            </template>

                            <!-- Desactivada: configuración y activación -->
                            <template v-else-if="statusLoaded">
                                <form v-if="setupData" @submit.prevent="confirmEnable2FA">
                                    <TotpSetup v-model="enableCode" :setup="setupData" input-id="enableTotpCode"
                                        @update:model-value="error = ''" />

                                    <div class="d-flex flex-wrap gap-2 mt-4">
                                        <button type="submit" class="btn btn-primary" :disabled="actionLoading">
                                            <span v-if="actionLoading" class="spinner-border spinner-border-sm me-2"
                                                aria-hidden="true"></span>
                                            {{ actionLoading ? 'Activando...' : 'Activar 2FA' }}
                                        </button>
                                        <button type="button" class="btn btn-outline-secondary" :disabled="actionLoading"
                                            @click="setupData = null; enableCode = ''; error = ''">
                                            Cancelar
                                        </button>
                                    </div>
                                </form>

                                <template v-else>
                                    <p class="text-muted">
                                        Añade un código temporal de tu móvil a cada inicio de sesión: aunque alguien
                                        conozca tu contraseña, no podrá acceder sin él.
                                    </p>
                                    <button type="button" class="btn btn-primary" :disabled="actionLoading"
                                        @click="start2FASetup">
                                        <span v-if="actionLoading" class="spinner-border spinner-border-sm me-2"
                                            aria-hidden="true"></span>
                                        <AppIcon v-else name="shield-check" class="me-2" />
                                        {{ actionLoading ? 'Iniciando...' : 'Configurar y activar 2FA' }}
                                    </button>
                                </template>
                            </template>
                        </template>
                    </div>
                </div>
            </div>

            <!-- Medidas que protegen la cuenta -->
            <div class="col-lg-4">
                <div class="panel">
                    <div class="panel-header">
                        <h2 class="panel-title">Protección de tu acceso</h2>
                    </div>

                    <ul class="measures">
                        <li v-for="measure in measures" :key="measure.title">
                            <AppIcon :name="measure.icon" />
                            <div>
                                <span class="measure-title">{{ measure.title }}</span>
                                <span class="measure-text">{{ measure.text }}</span>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </section>
</template>

<script>
import api from '@/api/axios'
import AppIcon from './AppIcon.vue'
import TotpSetup from './TotpSetup.vue'

// Medidas de seguridad que ya protegen el acceso, con o sin 2FA.
const measures = [
    {
        icon: 'lock',
        title: 'Contraseña protegida',
        text: 'Nunca sale de tu dispositivo: el banco solo recibe una clave derivada de ella.'
    },
    {
        icon: 'key',
        title: 'Acceso con firma digital',
        text: 'Cada inicio de sesión se valida con un desafío firmado por tu clave privada.'
    },
    {
        icon: 'alert',
        title: 'Bloqueo por intentos fallidos',
        text: 'Tras varios intentos fallidos, el acceso se bloquea temporalmente.'
    },
    {
        icon: 'logout',
        title: 'Cierre por inactividad',
        text: 'La sesión se cierra tras 15 minutos sin actividad.'
    }
]

export default {
    name: 'UserSecurity',

    components: { AppIcon, TotpSetup },

    data() {
        return {
            measures,
            loading: false,
            actionLoading: false,
            error: '',
            message: '',
            statusLoaded: false,
            totpEnabled: false,
            setupData: null,
            enableCode: '',
            showDisableForm: false,
            disableCode: ''
        }
    },

    mounted() {
        this.fetch2FAStatus()
    },

    methods: {
        async fetch2FAStatus() {
            this.loading = true
            this.error = ''
            try {
                const res = await api.get('/totp/status')
                this.totpEnabled = res.data.totp_enabled
                this.statusLoaded = true
            } catch (err) {
                this.error = err.response?.data?.error || 'Error al obtener estado 2FA'
            } finally {
                this.loading = false
            }
        },

        async start2FASetup() {
            this.actionLoading = true
            this.error = ''
            this.message = ''
            try {
                const res = await api.post('/totp/setup')
                this.setupData = res.data
            } catch (err) {
                this.error = err.response?.data?.error || 'Error al iniciar configuración 2FA'
            } finally {
                this.actionLoading = false
            }
        },

        async confirmEnable2FA() {
            if (!this.enableCode || this.enableCode.length !== 6) {
                this.error = 'Introduce un código de 6 dígitos válido.'
                return
            }

            this.actionLoading = true
            this.error = ''
            try {
                await api.post('/totp/enable', { code: this.enableCode })
                this.totpEnabled = true
                this.setupData = null
                this.enableCode = ''
                this.message = 'Autenticación de dos factores activada con éxito.'
            } catch (err) {
                this.error = err.response?.data?.error || 'Código incorrecto. No se pudo activar el 2FA.'
            } finally {
                this.actionLoading = false
            }
        },

        async disable2FA() {
            if (!this.disableCode || this.disableCode.length !== 6) {
                this.error = 'Introduce el código de 6 dígitos.'
                return
            }

            this.actionLoading = true
            this.error = ''
            try {
                await api.post('/totp/disable', { code: this.disableCode })
                this.totpEnabled = false
                this.showDisableForm = false
                this.disableCode = ''
                this.message = 'Autenticación de dos factores desactivada.'
            } catch (err) {
                this.error = err.response?.data?.error || 'Código incorrecto. No se pudo desactivar el 2FA.'
            } finally {
                this.actionLoading = false
            }
        }
    }
}
</script>

<style scoped>
.action-box {
    padding: 1.25rem;
    border: 1px solid var(--sb-border);
    border-radius: var(--sb-radius);
    background-color: var(--sb-surface-muted);
}

.action-box .totp-input {
    max-width: 14rem;
}

.measures {
    display: grid;
    gap: 1rem;
    margin: 0;
    padding: 1.25rem;
    list-style: none;
}

.measures li {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
}

.measures :deep(.app-icon) {
    margin-top: 0.125rem;
    color: var(--sb-navy-700);
}

.measure-title {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--sb-navy-900);
}

.measure-text {
    display: block;
    font-size: 0.8125rem;
    color: var(--sb-muted);
}
</style>
