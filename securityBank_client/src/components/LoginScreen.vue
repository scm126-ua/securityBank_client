<template>
    <div class="auth-page">
        <!-- Presentación de la entidad -->
        <aside class="auth-brand">
            <div class="brand">
                <span class="brand-mark">
                    <AppIcon name="shield-check" />
                </span>
                <span class="brand-name">SecurityBank</span>
            </div>

            <div class="brand-content">
                <span class="brand-eyebrow">Banca online</span>
                <h2 class="brand-title">Tu dinero y tus documentos, protegidos de extremo a extremo.</h2>
                <p class="brand-text">
                    Consulta tus cuentas, descarga certificados firmados por el banco y guarda tus
                    documentos cifrados con las máximas garantías.
                </p>

                <ul class="feature-list">
                    <li v-for="feature in features" :key="feature.title">
                        <span class="feature-icon">
                            <AppIcon :name="feature.icon" />
                        </span>
                        <div>
                            <span class="feature-title">{{ feature.title }}</span>
                            <span class="feature-text">{{ feature.text }}</span>
                        </div>
                    </li>
                </ul>
            </div>

            <div class="brand-footer">
                <AppIcon name="lock" class="me-2" />
                Conexión protegida con TLS · © {{ currentYear }} SecurityBank
            </div>
        </aside>

        <!-- Formularios -->
        <main class="auth-main">
            <div class="auth-form">
                <div class="brand brand-mobile">
                    <span class="brand-mark">
                        <AppIcon name="shield-check" />
                    </span>
                    <span class="brand-name">SecurityBank</span>
                </div>

                <!-- ACCESO BLOQUEADO tras varios intentos fallidos -->
                <TooManyLoginAttemptsView v-if="lockSeconds > 0" :initial-seconds="lockSeconds"
                    @retry-login="retryLogin" />

                <!-- VERIFICACIÓN EN DOS PASOS al iniciar sesión -->
                <template v-else-if="totpLoginRequired">
                    <button type="button" class="back-link" :disabled="loading" @click="cancelLoginTotp">
                        <AppIcon name="arrow-left" />
                        Volver al inicio de sesión
                    </button>

                    <span class="step-icon">
                        <AppIcon name="shield-check" />
                    </span>
                    <h1 class="auth-title">Verificación en dos pasos</h1>
                    <p class="auth-subtitle">
                        Introduce el código de 6 dígitos que muestra tu aplicación de autenticación.
                    </p>

                    <div v-if="serverError" class="alert alert-danger d-flex gap-2" role="alert">
                        <AppIcon name="alert-circle" />
                        <span>{{ serverError }}</span>
                    </div>

                    <form @submit.prevent="verifyLoginTotp" novalidate>
                        <div class="mb-4">
                            <label for="loginTotpCode" class="form-label">Código de verificación</label>

                            <input id="loginTotpCode" ref="loginTotpInput" v-model.trim="loginTotpCode" type="text"
                                class="form-control form-control-lg totp-input"
                                :class="{ 'is-invalid': errors.loginTotpCode }" placeholder="000000"
                                inputmode="numeric" autocomplete="one-time-code" maxlength="6" required
                                @input="errors.loginTotpCode = ''; serverError = ''" />

                            <div v-if="errors.loginTotpCode" class="invalid-feedback">
                                {{ errors.loginTotpCode }}
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary btn-lg w-100" :disabled="loading">
                            <span v-if="loading" class="spinner-border spinner-border-sm me-2"
                                aria-hidden="true"></span>

                            {{ loading ? 'Verificando...' : 'Verificar y acceder' }}
                        </button>
                    </form>

                    <p class="security-note">
                        <AppIcon name="info" class="me-1" />
                        El código cambia cada 30 segundos. Consúltalo en Google Authenticator, Authy o tu
                        aplicación habitual.
                    </p>
                </template>

                <!-- INICIO DE SESIÓN -->
                <template v-else-if="!registerMode">
                    <h1 class="auth-title">Acceso clientes</h1>
                    <p class="auth-subtitle">Identifícate con tu correo electrónico y tu contraseña.</p>

                    <div v-if="infoMessage" class="alert alert-info d-flex gap-2" role="status">
                        <AppIcon name="info" />
                        <span>{{ infoMessage }}</span>
                    </div>

                    <div v-if="successMessage" class="alert alert-success d-flex gap-2" role="status">
                        <AppIcon name="check-circle" />
                        <span>{{ successMessage }}</span>
                    </div>

                    <div v-if="serverError" class="alert alert-danger d-flex gap-2" role="alert">
                        <AppIcon name="alert-circle" />
                        <span>{{ serverError }}</span>
                    </div>

                    <form @submit.prevent="logUser" novalidate>
                        <!-- Email -->
                        <div class="mb-3">
                            <label for="loginEmail" class="form-label">Correo electrónico</label>

                            <input id="loginEmail" v-model.trim="email" type="email" class="form-control"
                                :class="{ 'is-invalid': errors.email }" placeholder="usuario@correo.com"
                                autocomplete="username" required maxlength="254"
                                @input="errors.email = ''; serverError = ''" />

                            <div v-if="errors.email" class="invalid-feedback">
                                {{ errors.email }}
                            </div>
                        </div>

                        <!-- Contraseña -->
                        <div class="mb-4">
                            <div class="d-flex justify-content-between align-items-baseline">
                                <label for="loginPassword" class="form-label">Contraseña</label>
                                <a href="#" class="small" @click.prevent="forgotPassword">
                                    ¿Has olvidado tu contraseña?
                                </a>
                            </div>

                            <div class="input-group has-validation">
                                <input id="loginPassword" v-model="password" :type="showPassword ? 'text' : 'password'"
                                    class="form-control" :class="{ 'is-invalid': errors.password }"
                                    placeholder="Introduce tu contraseña" autocomplete="current-password" required
                                    @input="errors.password = ''; serverError = ''" />

                                <button type="button" class="btn btn-outline-secondary password-toggle"
                                    :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                                    :aria-pressed="showPassword" @click="showPassword = !showPassword">
                                    <AppIcon :name="showPassword ? 'eye-off' : 'eye'" />
                                </button>

                                <div v-if="errors.password" class="invalid-feedback">
                                    {{ errors.password }}
                                </div>
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary btn-lg w-100" :disabled="loading">
                            <span v-if="loading" class="spinner-border spinner-border-sm me-2"
                                aria-hidden="true"></span>

                            {{ loading ? 'Verificando identidad...' : 'Iniciar sesión' }}
                        </button>
                    </form>

                    <div class="switch-box">
                        <span>¿Todavía no eres cliente?</span>
                        <button type="button" class="btn btn-outline-primary" @click="switchMode(true)">
                            Regístrate
                        </button>
                    </div>

                    <p class="security-note">
                        <AppIcon name="shield" class="me-1" />
                        SecurityBank nunca te pedirá tu contraseña por correo electrónico ni por teléfono.
                    </p>
                </template>

                <!-- REGISTRO -->
                <template v-else>
                    <button type="button" class="back-link" @click="switchMode(false)">
                        <AppIcon name="arrow-left" />
                        Volver al inicio de sesión
                    </button>

                    <h1 class="auth-title">Hazte cliente</h1>
                    <p class="auth-subtitle">Completa tus datos para darte de alta en la banca online.</p>

                    <div v-if="serverError" class="alert alert-danger d-flex gap-2" role="alert">
                        <AppIcon name="alert-circle" />
                        <span>{{ serverError }}</span>
                    </div>

                    <form @submit.prevent="registerUser" novalidate>
                        <div class="row g-3 mb-3">
                            <!-- Nombre -->
                            <div class="col-sm-6">
                                <label for="registerName" class="form-label">Nombre</label>

                                <input id="registerName" v-model.trim="name" type="text" class="form-control"
                                    :class="{ 'is-invalid': errors.name }" placeholder="Tu nombre"
                                    autocomplete="given-name" maxlength="30" required
                                    @input="errors.name = ''; serverError = ''" />

                                <div v-if="errors.name" class="invalid-feedback">
                                    {{ errors.name }}
                                </div>
                            </div>

                            <!-- Apellidos -->
                            <div class="col-sm-6">
                                <label for="registerLastName" class="form-label">Apellidos</label>

                                <input id="registerLastName" v-model.trim="lastName" type="text" class="form-control"
                                    :class="{ 'is-invalid': errors.lastName }" placeholder="Tus apellidos"
                                    autocomplete="family-name" maxlength="60" required
                                    @input="errors.lastName = ''; serverError = ''" />

                                <div v-if="errors.lastName" class="invalid-feedback">
                                    {{ errors.lastName }}
                                </div>
                            </div>

                            <!-- Email -->
                            <div class="col-sm-7">
                                <label for="registerEmail" class="form-label">Correo electrónico</label>

                                <input id="registerEmail" v-model.trim="email" type="email" class="form-control"
                                    :class="{ 'is-invalid': errors.email }" placeholder="usuario@correo.com"
                                    autocomplete="email" maxlength="254" required
                                    @input="errors.email = ''; serverError = ''; onEmailChange()" />

                                <div v-if="errors.email" class="invalid-feedback">
                                    {{ errors.email }}
                                </div>
                            </div>

                            <!-- DNI -->
                            <div class="col-sm-5">
                                <label for="registerDni" class="form-label">DNI</label>

                                <input id="registerDni" v-model.trim="dni" type="text" class="form-control dni-input"
                                    :class="{ 'is-invalid': errors.dni }" placeholder="12345678Z" autocomplete="off"
                                    maxlength="9" required @input="errors.dni = ''; serverError = ''" />

                                <div v-if="errors.dni" class="invalid-feedback">
                                    {{ errors.dni }}
                                </div>
                            </div>

                            <!-- Contraseña -->
                            <div class="col-sm-6">
                                <label for="registerPassword" class="form-label">Contraseña</label>

                                <div class="input-group has-validation">
                                    <input id="registerPassword" v-model="password"
                                        :type="showPassword ? 'text' : 'password'" class="form-control"
                                        :class="{ 'is-invalid': errors.password }" placeholder="Mínimo 8 caracteres"
                                        autocomplete="new-password" minlength="8" maxlength="128" required
                                        aria-describedby="passwordRules"
                                        @input="errors.password = ''; serverError = ''" />

                                    <button type="button" class="btn btn-outline-secondary password-toggle"
                                        :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                                        :aria-pressed="showPassword" @click="showPassword = !showPassword">
                                        <AppIcon :name="showPassword ? 'eye-off' : 'eye'" />
                                    </button>

                                    <div v-if="errors.password" class="invalid-feedback">
                                        {{ errors.password }}
                                    </div>
                                </div>
                            </div>

                            <!-- Confirmar contraseña -->
                            <div class="col-sm-6">
                                <label for="confirmPassword" class="form-label">Confirmar contraseña</label>

                                <input id="confirmPassword" v-model="confirmPassword"
                                    :type="showPassword ? 'text' : 'password'" class="form-control"
                                    :class="{ 'is-invalid': errors.confirmPassword }" placeholder="Repite tu contraseña"
                                    autocomplete="new-password" required
                                    @input="errors.confirmPassword = ''; serverError = ''" />

                                <div v-if="errors.confirmPassword" class="invalid-feedback">
                                    {{ errors.confirmPassword }}
                                </div>
                            </div>
                        </div>

                        <ul id="passwordRules" class="password-rules">
                            <li v-for="rule in passwordRules" :key="rule.label" :class="{ met: rule.met }">
                                <AppIcon :name="rule.met ? 'check-circle' : 'circle'" />
                                {{ rule.label }}
                            </li>
                        </ul>

                        <!-- Verificación en dos pasos (opcional) -->
                        <div class="option-box mb-4">
                            <div class="d-flex align-items-start gap-3">
                                <span class="option-icon">
                                    <AppIcon name="shield-check" />
                                </span>

                                <div class="flex-grow-1">
                                    <span class="option-title">
                                        Verificación en dos pasos
                                        <span class="option-badge">Opcional</span>
                                    </span>
                                    <span class="option-text">
                                        Pide un código temporal de tu móvil cada vez que inicies sesión.
                                    </span>
                                </div>

                                <button type="button" class="btn btn-sm"
                                    :class="enable2FA ? 'btn-outline-secondary' : 'btn-outline-primary'"
                                    :disabled="loadingTotp" @click="toggle2FA">
                                    {{ enable2FA ? 'Desactivar' : 'Activar' }}
                                </button>
                            </div>

                            <div v-if="enable2FA" class="option-content">
                                <div v-if="loadingTotp" class="text-center text-muted small py-3">
                                    <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                                    Generando el código QR...
                                </div>

                                <div v-else-if="totpError"
                                    class="alert alert-danger d-flex flex-wrap align-items-center gap-2 mb-0" role="alert">
                                    <AppIcon name="alert-circle" />
                                    <span>{{ totpError }}</span>
                                    <button type="button" class="btn btn-outline-danger btn-sm ms-auto"
                                        @click="generateRegistrationTotp">
                                        Reintentar
                                    </button>
                                </div>

                                <TotpSetup v-else-if="totpData" v-model="totpCode" :setup="totpData"
                                    input-id="registerTotpCode" :error="errors.totpCode"
                                    @update:model-value="errors.totpCode = ''; serverError = ''" />
                            </div>
                        </div>

                        <!-- Condiciones -->
                        <div class="form-check mb-4">
                            <input id="acceptTerms" v-model="acceptTerms" type="checkbox" class="form-check-input"
                                :class="{ 'is-invalid': errors.acceptTerms }" required
                                @change="errors.acceptTerms = ''" />

                            <label for="acceptTerms" class="form-check-label small">
                                He leído y acepto las condiciones del servicio y la política de privacidad.
                            </label>

                            <div v-if="errors.acceptTerms" class="invalid-feedback">
                                {{ errors.acceptTerms }}
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary btn-lg w-100" :disabled="loading">
                            <span v-if="loading" class="spinner-border spinner-border-sm me-2"
                                aria-hidden="true"></span>

                            {{ loading ? 'Generando tus claves de seguridad...' : 'Completar registro' }}
                        </button>
                    </form>

                    <p class="security-note">
                        <AppIcon name="key" class="me-1" />
                        Tus claves se generan en este navegador y se protegen con tu contraseña antes de enviarse.
                    </p>
                </template>
            </div>
        </main>
    </div>
</template>

<script>
import api from '../api/axios'
import {
    deriveAuthKey,
    deriveMasterKey,
    encryptPrivateKeys,
    exportPublicKey,
    generateUserKeyPairs,
    importServerSigningPublicKey,
    restorePrivateKeys,
    signChallenge,
    verifyUserPublicKeysCertificate
} from '../services/crypto'
import { storeIdentity, storePrivateKeys } from '../services/keyStore'
import AppIcon from './AppIcon.vue'
import TooManyLoginAttemptsView from './TooManyLoginAttemptsView.vue'
import TotpSetup from './TotpSetup.vue'

// Garantías de seguridad que se muestran junto al formulario.
const features = [
    {
        icon: 'lock',
        title: 'Tu contraseña no sale de tu dispositivo',
        text: 'El banco solo recibe una clave de autenticación derivada de ella.'
    },
    {
        icon: 'key',
        title: 'Acceso con firma digital',
        text: 'Cada inicio de sesión se valida con un desafío firmado por tu clave privada.'
    },
    {
        icon: 'file-check',
        title: 'Documentos cifrados y firmados',
        text: 'Se cifran con AES-256 en tu navegador antes de llegar al banco.'
    }
]

export default {
    name: 'LoginScreen',

    components: { AppIcon, TooManyLoginAttemptsView, TotpSetup },

    props: {
        // Aviso al volver a esta pantalla, por ejemplo tras cerrar la sesión.
        notice: {
            type: String,
            default: ''
        }
    },

    data() {
        return {
            features,
            currentYear: new Date().getFullYear(),
            registerMode: false,
            loading: false,
            showPassword: false,
            // Segundos que faltan para que el servidor vuelva a permitir el acceso.
            lockSeconds: 0,

            email: '',
            password: '',
            confirmPassword: '',
            name: '',
            lastName: '',
            dni: '',
            acceptTerms: false,

            serverError: '',
            successMessage: '',
            infoMessage: this.notice,

            // 2FA Registro
            enable2FA: false,
            loadingTotp: false,
            totpError: '',
            totpData: null,
            totpCode: '',

            // 2FA Login
            totpLoginRequired: false,
            loginTotpCode: '',
            pendingChallengeResponse: null,
            pendingMasterKey: null,
            pendingServerPublicKey: null,

            errors: {
                email: '',
                password: '',
                name: '',
                lastName: '',
                confirmPassword: '',
                acceptTerms: '',
                dni: '',
                totpCode: '',
                loginTotpCode: ''
            }
        }
    },

    computed: {
        // Requisitos de la contraseña que se comprueban mientras se escribe.
        passwordRules() {
            return [
                { label: 'Al menos 8 caracteres', met: this.password.length >= 8 },
                { label: 'Una letra', met: /[a-zA-Z]/.test(this.password) },
                { label: 'Un número', met: /[0-9]/.test(this.password) }
            ]
        }
    },

    methods: {
        clearErrors() {
            this.serverError = ''
            this.successMessage = ''
            this.infoMessage = ''

            Object.keys(this.errors).forEach((key) => {
                this.errors[key] = ''
            })
        },

        // Vuelve al formulario de acceso tras el bloqueo, conservando el correo.
        retryLogin() {
            this.lockSeconds = 0
            this.password = ''
            this.clearErrors()
        },

        switchMode(register) {
            this.registerMode = register
            this.clearErrors()
            this.password = ''
            this.confirmPassword = ''
            this.showPassword = false
            this.enable2FA = false
            this.totpData = null
            this.totpCode = ''
            this.totpLoginRequired = false
            this.loginTotpCode = ''
        },

        onEmailChange() {
            if (this.enable2FA && this.totpData) {
                // Si el usuario cambia el email después de generar el QR, refrescamos el QR si es válido
                if (this.isValidEmail(this.email)) {
                    this.generateRegistrationTotp()
                }
            }
        },

        isValidEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        },


        validateDNI(dni) {
            if (typeof dni !== 'string') {
                return false
            }

            // Eliminar espacios al principio y al final y convertir a mayúsculas.
            dni = dni.trim().toUpperCase()

            // Comprobar formato: 8 números y una letra.
            if (!/^\d{8}[A-Z]$/.test(dni)) {
                return false
            }

            // Letras utilizadas para validar el DNI.
            const letters = 'TRWAGMYFPDXBNJZSQVHLCKE'

            // Calcular la letra correspondiente al número.
            const number = parseInt(dni.substring(0, 8), 10)
            const expectedLetter = letters[number % 23]

            return dni[8] === expectedLetter
        },


        validateLogin() {
            this.clearErrors()

            let valid = true

            if (!this.email) {
                this.errors.email = 'Introduce tu correo electrónico.'
                valid = false
            } else if (!this.isValidEmail(this.email)) {
                this.errors.email = 'Introduce un correo electrónico válido.'
                valid = false
            }

            if (!this.password) {
                this.errors.password = 'Introduce tu contraseña.'
                valid = false
            }

            return valid
        },

        validateRegistration() {
            this.clearErrors()

            let valid = true

            if (!this.name) {
                this.errors.name = 'Introduce tu nombre.'
                valid = false
            } else if (this.name.length > 30) {
                this.errors.name = 'El nombre no puede superar los 30 caracteres.'
                valid = false
            }

            if (!this.lastName) {
                this.errors.lastName = 'Introduce tus apellidos.'
                valid = false
            } else if (this.lastName.length > 60) {
                this.errors.lastName = 'Los apellidos no pueden superar los 60 caracteres.'
                valid = false
            }

            if (!this.email) {
                this.errors.email = 'Introduce tu correo electrónico.'
                valid = false
            } else if (!this.isValidEmail(this.email)) {
                this.errors.email = 'Introduce un correo electrónico válido.'
                valid = false
            }

            if (!this.dni) {
                this.errors.dni = 'Introduce tu DNI.'
                valid = false
            } else if (!this.validateDNI(this.dni)) {
                this.errors.dni = 'Introduce un DNI válido.'
                valid = false
            }

            if (!this.password) {
                this.errors.password = 'Introduce una contraseña.'
                valid = false
            } else if (this.password.length < 8) {
                this.errors.password = 'La contraseña debe tener al menos 8 caracteres.'
                valid = false
            } else if (
                !/[a-zA-Z]/.test(this.password) ||
                !/[0-9]/.test(this.password)
            ) {
                this.errors.password = 'Incluye al menos una letra y un número.'
                valid = false
            }

            if (!this.confirmPassword) {
                this.errors.confirmPassword = 'Confirma tu contraseña.'
                valid = false
            } else if (this.password !== this.confirmPassword) {
                this.errors.confirmPassword = 'Las contraseñas no coinciden.'
                valid = false
            }

            // Validación de 2FA si está activo
            if (this.enable2FA) {
                if (!this.totpCode) {
                    this.errors.totpCode = 'Introduce el código de 6 dígitos de tu app 2FA.'
                    valid = false
                } else if (!/^\d{6}$/.test(this.totpCode)) {
                    this.errors.totpCode = 'El código debe tener 6 dígitos numéricos.'
                    valid = false
                }
            }

            if (!this.acceptTerms) {
                this.errors.acceptTerms = 'Debes aceptar las condiciones para continuar.'
                valid = false
            }

            return valid
        },

        async toggle2FA() {
            if (this.enable2FA) {
                this.enable2FA = false
                this.totpData = null
                this.totpCode = ''
                this.totpError = ''
                this.errors.totpCode = ''
                return
            }

            if (!this.email) {
                this.errors.email = 'Introduce primero tu correo electrónico para configurar el 2FA.'
                return
            }
            if (!this.isValidEmail(this.email)) {
                this.errors.email = 'Introduce un correo electrónico válido antes de activar el 2FA.'
                return
            }

            this.enable2FA = true
            await this.generateRegistrationTotp()
        },

        async generateRegistrationTotp() {
            this.loadingTotp = true
            this.totpError = ''
            try {
                const response = await api.post('/totp/generate', {
                    email: this.email.trim().toLowerCase()
                })
                this.totpData = response.data
            } catch (err) {
                this.totpError = err.response?.data?.error || 'No se pudo generar la clave 2FA.'
            } finally {
                this.loadingTotp = false
            }
        },

        cancelLoginTotp() {
            this.totpLoginRequired = false
            this.loginTotpCode = ''
            this.pendingChallengeResponse = null
            this.pendingMasterKey = null
            this.pendingServerPublicKey = null
            this.password = ''
            this.clearErrors()
        },

        async logUser() {
            if (this.loading || !this.validateLogin()) {
                return
            }

            this.loading = true

            try {
                // Huella fijada al compilar o, si no hay, la vista en el primer acceso (TOFU).
                const identityResponse = await api.get('/server/public-key')
                const serverPublicKey = await importServerSigningPublicKey(
                    identityResponse.data,
                    import.meta.env.VITE_SERVER_KEY_FINGERPRINT ||
                        localStorage.getItem('serverKeyFingerprint')
                )
                localStorage.setItem('serverKeyFingerprint', identityResponse.data.fingerprint_sha256)
                // La contraseña no sale del navegador: solo se envía la clave de autenticación.
                const masterKey = await deriveMasterKey(this.email, this.password)
                const challengeResponse = await api.post('/login/challenge', {
                    email: this.email,
                    auth_key: await deriveAuthKey(masterKey)
                })

                // Si el usuario tiene 2FA activado, solicitamos el código antes de continuar
                if (challengeResponse.data.totp_required) {
                    this.pendingChallengeResponse = challengeResponse
                    this.pendingMasterKey = masterKey
                    this.pendingServerPublicKey = serverPublicKey
                    this.totpLoginRequired = true
                    this.loginTotpCode = ''
                    this.$nextTick(() => this.$refs.loginTotpInput?.focus())
                    return
                }

                await this.completeLogin(challengeResponse, masterKey, serverPublicKey, '')
            } catch (error) {
                const status = error.response?.status
                const data = error.response?.data

                if (status === 423 && data?.retry_after_seconds > 0) {
                    // El backend ha bloqueado la cuenta
                    this.lockSeconds = data.retry_after_seconds
                } else if (status === 401) {
                    this.serverError = 'Correo o contraseña incorrectos.'
                } else {
                    this.serverError =
                        data?.error ||
                        error.message ||
                        'No se ha podido iniciar sesión. Inténtalo de nuevo.'
                }
            } finally {
                this.loading = false
            }
        },

        async verifyLoginTotp() {
            if (!this.loginTotpCode) {
                this.errors.loginTotpCode = 'Introduce el código 2FA.'
                return
            }
            if (!/^\d{6}$/.test(this.loginTotpCode)) {
                this.errors.loginTotpCode = 'El código debe tener exactamente 6 dígitos numéricos.'
                return
            }

            this.loading = true
            this.serverError = ''
            this.errors.loginTotpCode = ''

            try {
                await this.completeLogin(
                    this.pendingChallengeResponse,
                    this.pendingMasterKey,
                    this.pendingServerPublicKey,
                    this.loginTotpCode
                )
            } catch (error) {
                const status = error.response?.status
                const data = error.response?.data
                if (status === 401) {
                    this.errors.loginTotpCode = data?.error || 'Código 2FA incorrecto'
                } else {
                    this.serverError =
                        data?.error ||
                        error.message ||
                        'Error al verificar el código 2FA.'
                }
            } finally {
                this.loading = false
            }
        },

        // Firma el desafío, lo verifica en el servidor y comprueba el certificado de las claves.
        async completeLogin(challengeResponse, masterKey, serverPublicKey, totpCode) {
            const privateKeys = await restorePrivateKeys(
                challengeResponse.data.private_key_bundle,
                masterKey
            )
            const signature = await signChallenge(
                privateKeys.signing,
                challengeResponse.data.challenge
            )

            const verifyPayload = {
                challenge_id: challengeResponse.data.challenge_id,
                signature
            }
            if (totpCode) {
                verifyPayload.totp_code = totpCode
            }

            const response = await api.post('/login/verify', verifyPayload)

            const certificateIsValid = await verifyUserPublicKeysCertificate(
                serverPublicKey,
                response.data.user
            )
            if (!certificateIsValid) {
                throw new Error('El certificado de las claves del usuario no es válido')
            }

            storePrivateKeys(privateKeys)
            storeIdentity(response.data.user, serverPublicKey)
            this.$emit('login-success', response.data)
        },

        async registerUser() {
            if (this.loading || !this.validateRegistration()) {
                return
            }

            this.loading = true

            try {
                const [keyPairs, masterKey] = await Promise.all([
                    generateUserKeyPairs(),
                    deriveMasterKey(this.email, this.password)
                ])
                const [publicKey, signingPublicKey, privateKeyBundle, authKey] = await Promise.all([
                    exportPublicKey(keyPairs.encryption.publicKey),
                    exportPublicKey(keyPairs.signing.publicKey),
                    encryptPrivateKeys(keyPairs, masterKey),
                    deriveAuthKey(masterKey)
                ])

                const payload = {
                    name: this.name,
                    surname: this.lastName,
                    email: this.email,
                    auth_key: authKey,
                    dni: this.dni.trim().toUpperCase(),
                    public_key: publicKey,
                    signing_public_key: signingPublicKey,
                    private_key_bundle: privateKeyBundle
                }

                if (this.enable2FA && this.totpData && this.totpCode) {
                    payload.totp_secret = this.totpData.secret
                    payload.totp_code = this.totpCode
                }

                const response = await api.post('/register', payload)

                // Llveamos el evento al padre
                this.$emit('register-success', response.data)

                // Si el backend no inicia sesión automáticamente:
                this.switchMode(false)
                this.successMessage = 'Registro completado. Ya puedes iniciar sesión.'
            } catch (error) {
                this.serverError =
                    error.response?.data?.error ||
                    'No se ha podido completar el registro. Inténtalo de nuevo.'
            } finally {
                this.loading = false
            }
        },

        forgotPassword() {
            this.clearErrors()
            this.infoMessage = 'La recuperación de contraseña todavía no está disponible.'
        }
    }
}
</script>

<style scoped>
.auth-page {
    display: grid;
    min-height: 100vh;
    background-color: var(--sb-surface);
}

@media (min-width: 992px) {
    .auth-page {
        grid-template-columns: minmax(400px, 5fr) 7fr;
    }
}

/* Panel de la entidad */
.auth-brand {
    display: none;
    flex-direction: column;
    justify-content: space-between;
    gap: 2.5rem;
    padding: 3rem;
    color: #ffffff;
    background:
        radial-gradient(circle at 85% 10%, rgb(31 95 168 / 35%), transparent 50%),
        linear-gradient(160deg, var(--sb-navy-900) 0%, var(--sb-navy-800) 60%, var(--sb-navy-700) 100%);
    border-right: 3px solid var(--sb-gold-500);
}

@media (min-width: 992px) {
    .auth-brand {
        display: flex;
    }
}

.brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.brand-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border: 1px solid rgb(201 165 76 / 55%);
    border-radius: 0.5rem;
    font-size: 1.375rem;
    color: var(--sb-gold-500);
    background-color: var(--sb-navy-800);
}

.brand-name {
    font-size: 1.25rem;
    font-weight: 600;
    letter-spacing: 0.01em;
}

.brand-content {
    max-width: 30rem;
}

.brand-eyebrow {
    display: block;
    margin-bottom: 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--sb-gold-500);
}

.brand-title {
    margin-bottom: 1rem;
    font-size: 1.875rem;
    font-weight: 600;
    line-height: 1.25;
}

.brand-text {
    margin-bottom: 2rem;
    color: rgb(255 255 255 / 75%);
}

.feature-list {
    display: grid;
    gap: 1.25rem;
    margin: 0;
    padding: 0;
    list-style: none;
}

.feature-list li {
    display: flex;
    gap: 1rem;
}

.feature-icon {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    font-size: 1.125rem;
    color: var(--sb-gold-500);
    background-color: rgb(255 255 255 / 8%);
}

.feature-title {
    display: block;
    font-weight: 600;
}

.feature-text {
    display: block;
    font-size: 0.875rem;
    color: rgb(255 255 255 / 70%);
}

.brand-footer {
    display: flex;
    align-items: center;
    font-size: 0.8125rem;
    color: rgb(255 255 255 / 60%);
}

/* Formularios */
.auth-main {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2.5rem 1rem;
}

.auth-form {
    width: 100%;
    max-width: 460px;
}

.brand-mobile {
    margin-bottom: 2rem;
    color: var(--sb-navy-900);
}

@media (min-width: 992px) {
    .brand-mobile {
        display: none;
    }
}

.auth-title {
    margin-bottom: 0.375rem;
    font-size: 1.75rem;
    font-weight: 600;
    color: var(--sb-navy-900);
}

.auth-subtitle {
    margin-bottom: 1.75rem;
    color: var(--sb-muted);
}

.password-toggle {
    min-width: 2.875rem;
    color: var(--sb-muted);
    border-color: var(--sb-border-strong);
}

.dni-input {
    text-transform: uppercase;
}

.dni-input::placeholder {
    text-transform: none;
}

.password-rules {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.25rem;
    margin: 0 0 1.25rem;
    padding: 0;
    list-style: none;
    font-size: 0.8125rem;
    color: var(--sb-muted);
}

.password-rules li {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
}

.password-rules li.met {
    color: var(--sb-success);
}

.switch-box {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-top: 2rem;
    padding: 1rem 1.25rem;
    border: 1px solid var(--sb-border);
    border-radius: var(--sb-radius);
    background-color: var(--sb-surface-muted);
}

.security-note {
    display: flex;
    align-items: flex-start;
    margin: 1.5rem 0 0;
    font-size: 0.8125rem;
    color: var(--sb-muted);
}

/* Verificación en dos pasos */
.step-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    margin-bottom: 1.25rem;
    border-radius: 50%;
    font-size: 1.375rem;
    color: var(--sb-navy-800);
    background-color: #e8eef5;
}

.option-box {
    padding: 1rem 1.25rem;
    border: 1px solid var(--sb-border);
    border-radius: var(--sb-radius);
    background-color: var(--sb-surface-muted);
}

.option-icon {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 0.5rem;
    color: var(--sb-navy-800);
    background-color: #e1e9f3;
}

.option-title {
    display: block;
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--sb-navy-900);
}

.option-badge {
    margin-left: 0.25rem;
    padding: 0.1rem 0.4rem;
    border: 1px solid var(--sb-border-strong);
    border-radius: 0.25rem;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--sb-muted);
}

.option-text {
    display: block;
    font-size: 0.8125rem;
    color: var(--sb-muted);
}

.option-content {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--sb-border);
}
</style>
