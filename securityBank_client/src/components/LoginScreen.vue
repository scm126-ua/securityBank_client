<template>

    <div class="background">
        <div class="container py-5">
            <div class="row justify-content-center">
                <div class="col-12 col-lg-6 col-xl-5">

                    <div class="card align-items-center p-3 mb-4">
                        <div class="brand-icon mb-3">🔒</div>
                        <h1 class="h3 fw-bold">SecurityBank</h1>
                        <p class="text-secondary mb-0">
                            Tu banca segura, siempre contigo
                        </p>
                    </div>

                    <div v-if="loginBlock">
                        <TooManyLoginAttemptsView :initial-seconds="lockedUntil" @retry-login="retryLogin" />
                    </div>

                    <div v-else class="card border-0 shadow-sm">
                        <!-- INICIO DE SESIÓN -->
                        <template v-if="!registerMode">
                            <!-- PASO 2FA EN LOGIN -->
                            <div v-if="totpLoginRequired">
                                <div class="card-header bg-white border-0 pt-4 px-4 text-center">
                                    <div class="brand-icon-sm mx-auto mb-2">🛡️</div>
                                    <h2 class="h4 fw-bold mb-1">Verificación en dos pasos</h2>
                                    <p class="text-secondary mb-0 small">
                                        Introduce el código de tu aplicación de autenticación
                                    </p>
                                </div>

                                <div class="card-body p-4">
                                    <div v-if="serverError" class="alert alert-danger" role="alert">
                                        {{ serverError }}
                                    </div>

                                    <form @submit.prevent="verifyLoginTotp" novalidate>
                                        <div class="mb-4">
                                            <label for="loginTotpCode" class="form-label fw-semibold text-center d-block">
                                                Código de seguridad (6 dígitos)
                                            </label>

                                            <input id="loginTotpCode" v-model.trim="loginTotpCode" type="text"
                                                class="form-control form-control-lg text-center fs-3 fw-bold letter-spacing"
                                                :class="{ 'is-invalid': errors.loginTotpCode }"
                                                placeholder="000000" maxlength="6" autofocus required
                                                @input="errors.loginTotpCode = ''; serverError = ''" />

                                            <div v-if="errors.loginTotpCode" class="invalid-feedback text-center">
                                                {{ errors.loginTotpCode }}
                                            </div>

                                            <div class="form-text text-center mt-2">
                                                Abre Google Authenticator o tu app 2FA habitual.
                                            </div>
                                        </div>

                                        <button type="submit" class="btn btn-primary btn-lg w-100 mb-2" :disabled="loading">
                                            <span v-if="loading" class="spinner-border spinner-border-sm me-2"
                                                aria-hidden="true"></span>
                                            {{ loading ? 'Verificando...' : 'Verificar y acceder' }}
                                        </button>

                                        <button type="button" class="btn btn-outline-secondary w-100"
                                            @click="cancelLoginTotp" :disabled="loading">
                                            Volver
                                        </button>
                                    </form>
                                </div>
                            </div>

                            <!-- PASO NORMAL DE LOGIN -->
                            <div v-else>
                                <div class="card-header bg-white border-0 pt-4 px-4">
                                    <h2 class="h4 fw-bold mb-1">Iniciar sesión</h2>
                                    <p class="text-secondary mb-0">
                                        Accede a tu cuenta bancaria.
                                    </p>
                                </div>

                                <div class="card-body p-4">
                                    <div v-if="serverError" class="alert alert-danger" role="alert">
                                        {{ serverError }}
                                    </div>

                                    <form @submit.prevent="logUser" novalidate>
                                        <!-- Email -->
                                        <div class="mb-3">
                                            <label for="loginEmail" class="form-label fw-semibold">
                                                Correo electrónico
                                            </label>

                                            <input id="loginEmail" v-model.trim="email" type="email"
                                                class="form-control form-control-lg" :class="{ 'is-invalid': errors.email }"
                                                placeholder="usuario@correo.com" autocomplete="username" required
                                                maxlength="254" @input="errors.email = ''; serverError = ''" />

                                            <div v-if="errors.email" class="invalid-feedback">
                                                {{ errors.email }}
                                            </div>
                                        </div>

                                        <!-- Contraseña -->
                                        <div class="mb-3">
                                            <label for="loginPassword" class="form-label fw-semibold">
                                                Contraseña
                                            </label>

                                            <input id="loginPassword" v-model="password" type="password"
                                                class="form-control form-control-lg"
                                                :class="{ 'is-invalid': errors.password }"
                                                placeholder="Introduce tu contraseña" autocomplete="current-password"
                                                required @input="errors.password = ''; serverError = ''" />

                                            <div v-if="errors.password" class="invalid-feedback">
                                                {{ errors.password }}
                                            </div>
                                        </div>

                                        <div class="d-flex justify-content-end mb-4">
                                            <a href="#" @click.prevent="forgotPassword">
                                                ¿Has olvidado tu contraseña?
                                            </a>
                                        </div>

                                        <button type="submit" class="btn btn-primary btn-lg w-100" :disabled="loading">
                                            <span v-if="loading" class="spinner-border spinner-border-sm me-2"
                                                aria-hidden="true"></span>

                                            {{ loading ? 'Accediendo...' : 'Iniciar sesión' }}
                                        </button>
                                    </form>

                                    <hr class="my-4" />

                                    <p class="text-center mb-0">
                                        ¿Todavía no tienes cuenta?
                                        <button type="button" class="btn btn-link p-0 align-baseline"
                                            @click="switchMode(true)">
                                            Regístrate
                                        </button>
                                    </p>
                                </div>
                            </div>
                        </template>

                        <!-- REGISTRO -->
                        <template v-else>
                            <div class="card-header bg-white border-0 pt-4 px-4">
                                <h2 class="h4 fw-bold mb-1">Crear una cuenta</h2>
                                <p class="text-secondary mb-0">
                                    Introduce tus datos para registrarte.
                                </p>
                            </div>

                            <div class="card-body p-4">
                                <div v-if="serverError" class="alert alert-danger" role="alert">
                                    {{ serverError }}
                                </div>

                                <form @submit.prevent="registerUser" novalidate>
                                    <!-- Nombre -->
                                    <div class="mb-3">
                                        <label for="registerName" class="form-label fw-semibold">
                                            Nombre
                                        </label>

                                        <input id="registerName" v-model.trim="name" type="text" class="form-control"
                                            :class="{ 'is-invalid': errors.name }" placeholder="Tu nombre"
                                            autocomplete="given-name" maxlength="30" required
                                            @input="errors.name = ''; serverError = ''" />

                                        <div v-if="errors.name" class="invalid-feedback">
                                            {{ errors.name }}
                                        </div>
                                    </div>

                                    <!-- Apellidos -->
                                    <div class="mb-3">
                                        <label for="registerLastName" class="form-label fw-semibold">
                                            Apellidos
                                        </label>

                                        <input id="registerLastName" v-model.trim="lastName" type="text"
                                            class="form-control" :class="{ 'is-invalid': errors.lastName }"
                                            placeholder="Tus apellidos" autocomplete="family-name" maxlength="60"
                                            required @input="errors.lastName = ''; serverError = ''" />

                                        <div v-if="errors.lastName" class="invalid-feedback">
                                            {{ errors.lastName }}
                                        </div>
                                    </div>

                                    <!-- Email -->
                                    <div class="mb-3">
                                        <label for="registerEmail" class="form-label fw-semibold">
                                            Correo electrónico
                                        </label>

                                        <input id="registerEmail" v-model.trim="email" type="email" class="form-control"
                                            :class="{ 'is-invalid': errors.email }" placeholder="usuario@correo.com"
                                            autocomplete="email" maxlength="254" required
                                            @input="errors.email = ''; serverError = ''; onEmailChange()" />

                                        <div v-if="errors.email" class="invalid-feedback">
                                            {{ errors.email }}
                                        </div>
                                    </div>

                                    <!-- DNI -->
                                    <div class="mb-3">
                                        <label for="loginDNI" class="form-label fw-semibold">
                                            DNI
                                        </label>

                                        <input id="loginDNI" v-model.trim="dni" type="text"
                                            class="form-control form-control-lg" :class="{ 'is-invalid': errors.dni }"
                                            placeholder="12345678A" autocomplete="username" required maxlength="9"
                                            @input="errors.dni = ''; serverError = ''" />

                                        <div v-if="errors.dni" class="invalid-feedback">
                                            {{ errors.dni }}
                                        </div>
                                    </div>

                                    <!-- Contraseña -->
                                    <div class="mb-3">
                                        <label for="registerPassword" class="form-label fw-semibold">
                                            Contraseña
                                        </label>

                                        <input id="registerPassword" v-model="password" type="password"
                                            class="form-control" :class="{ 'is-invalid': errors.password }"
                                            placeholder="Mínimo 8 caracteres" autocomplete="new-password" minlength="8"
                                            maxlength="128" required @input="errors.password = ''; serverError = ''" />

                                        <div v-if="errors.password" class="invalid-feedback">
                                            {{ errors.password }}
                                        </div>

                                        <div class="form-text">
                                            Utiliza al menos 8 caracteres, con letras y números.
                                        </div>
                                    </div>

                                    <!-- Confirmar contraseña -->
                                    <div class="mb-3">
                                        <label for="confirmPassword" class="form-label fw-semibold">
                                            Confirmar contraseña
                                        </label>

                                        <input id="confirmPassword" v-model="confirmPassword" type="password"
                                            class="form-control" :class="{ 'is-invalid': errors.confirmPassword }"
                                            placeholder="Repite tu contraseña" autocomplete="new-password" required
                                            @input="errors.confirmPassword = ''; serverError = ''" />

                                        <div v-if="errors.confirmPassword" class="invalid-feedback">
                                            {{ errors.confirmPassword }}
                                        </div>
                                    </div>

                                    <!-- SECCIÓN / BOTÓN DE ACTIVACIÓN 2FA -->
                                    <div class="mb-4">
                                        <div class="card border bg-light">
                                            <div class="card-body p-3">
                                                <div class="d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <h6 class="fw-bold mb-1">
                                                            <span class="me-1">🛡️</span> Autenticación de doble factor (2FA)
                                                        </h6>
                                                        <p class="small text-muted mb-0">
                                                            Añade seguridad extra a tu cuenta con código TOTP.
                                                        </p>
                                                    </div>
                                                    <button type="button" class="btn btn-sm"
                                                        :class="enable2FA ? 'btn-outline-danger' : 'btn-primary'"
                                                        @click="toggle2FA">
                                                        {{ enable2FA ? 'Desactivar 2FA' : 'Activar 2FA' }}
                                                    </button>
                                                </div>

                                                <!-- Desplegable de configuración TOTP -->
                                                <div v-if="enable2FA" class="mt-3 pt-3 border-top">
                                                    <div v-if="loadingTotp" class="text-center py-3">
                                                        <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                                                        <span class="small">Generando código QR...</span>
                                                    </div>

                                                    <div v-else-if="totpError" class="alert alert-danger py-2 small mb-2">
                                                        {{ totpError }}
                                                        <button type="button" class="btn btn-link btn-sm p-0 ms-2"
                                                            @click="generateRegistrationTotp">
                                                            Reintentar
                                                        </button>
                                                    </div>

                                                    <div v-else-if="totpData">
                                                        <p class="small text-muted mb-2 text-center">
                                                            1. Escanea este código QR con tu app (Google Authenticator, Authy, etc.):
                                                        </p>
                                                        <div class="text-center mb-2">
                                                            <img :src="totpData.qr_code" alt="Código QR 2FA"
                                                                class="img-thumbnail" style="width: 160px; height: 160px;" />
                                                        </div>
                                                        <div class="text-center small text-muted mb-3">
                                                            O introduce la clave manualmente: <br />
                                                            <code class="user-select-all fw-bold text-dark fs-6">{{ totpData.secret }}</code>
                                                        </div>

                                                        <label for="registerTotpCode" class="form-label fw-semibold small">
                                                            2. Introduce el código de 6 dígitos que muestra tu app para confirmar:
                                                        </label>
                                                        <input id="registerTotpCode" v-model.trim="totpCode" type="text"
                                                            class="form-control text-center fs-5 fw-bold letter-spacing"
                                                            :class="{ 'is-invalid': errors.totpCode }"
                                                            placeholder="000000" maxlength="6" autocomplete="one-time-code"
                                                            @input="errors.totpCode = ''; serverError = ''" />
                                                        <div v-if="errors.totpCode" class="invalid-feedback text-center">
                                                            {{ errors.totpCode }}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Condiciones -->
                                    <div class="mb-4">
                                        <div class="form-check">
                                            <input id="acceptTerms" v-model="acceptTerms" type="checkbox"
                                                class="form-check-input" :class="{ 'is-invalid': errors.acceptTerms }"
                                                required />

                                            <label for="acceptTerms" class="form-check-label">
                                                He leído y acepto las condiciones del servicio y la
                                                política de privacidad.
                                            </label>

                                            <div v-if="errors.acceptTerms" class="text-danger small">
                                                {{ errors.acceptTerms }}
                                            </div>
                                        </div>
                                    </div>

                                    <button type="submit" class="btn btn-primary btn-lg w-100" :disabled="loading">
                                        <span v-if="loading" class="spinner-border spinner-border-sm me-2"
                                            aria-hidden="true"></span>

                                        {{ loading ? 'Creando cuenta...' : 'Completar registro' }}
                                    </button>
                                </form>

                                <hr class="my-4" />

                                <p class="text-center mb-0">
                                    ¿Ya tienes una cuenta?
                                    <button type="button" class="btn btn-link p-0 align-baseline"
                                        @click="switchMode(false)">
                                        Inicia sesión
                                    </button>
                                </p>
                            </div>
                        </template>
                    </div>
                </div>
            </div>

        </div>
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
    verifyUserPublicKeysCertificate,
    signChallenge,
} from '../services/crypto'
import { storeIdentity, storePrivateKeys } from '../services/keyStore'
import TooManyLoginAttemptsView from './TooManyLoginAttemptsView.vue';

export default {
    name: 'LoginScreen',
    data() {
        return {
            registerMode: false,
            loading: false,
            loginBlock: false,
            email: '',
            password: '',
            confirmPassword: '',
            name: '',
            lastName: '',
            dni: '',
            acceptTerms: false,
            serverError: '',
            lockedUntil: 0,

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

    components: {
        TooManyLoginAttemptsView
    },

    methods: {
        clearErrors() {
            this.serverError = ''

            Object.keys(this.errors).forEach((key) => {
                this.errors[key] = ''
            })
        },

        retryLogin() {
            this.loginBlock = false
            this.lockedUntil = 0
            this.password = ''
            this.serverError = ''
        },

        switchMode(register) {
            this.registerMode = register
            this.clearErrors()
            this.password = ''
            this.confirmPassword = ''
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

            dni = dni.trim().toUpperCase()

            if (!/^\d{8}[A-Z]$/.test(dni)) {
                return false
            }

            const letters = 'TRWAGMYFPDXBNJZSQVHLCKE'
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
            this.serverError = ''

            try {
                const identityResponse = await api.get('/server/public-key')

                const serverPublicKey = await importServerSigningPublicKey(
                    identityResponse.data,
                    import.meta.env.VITE_SERVER_KEY_FINGERPRINT ||
                        localStorage.getItem('serverKeyFingerprint')
                )
                localStorage.setItem('serverKeyFingerprint', identityResponse.data.fingerprint_sha256)

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
                    this.loading = false
                    return
                }

                await this.completeLogin(challengeResponse, masterKey, serverPublicKey, '')

            } catch (error) {
                const status = error.response?.status
                const data = error.response?.data

                if (status === 423 && data?.retry_after_seconds > 0) {
                    this.lockedUntil = data.retry_after_seconds
                    this.loginBlock = true
                } else if (status === 401) {
                    this.serverError = 'Correo o contraseña incorrectos'
                } else {
                    this.serverError =
                        data?.error ||
                        error.message ||
                        'No se ha podido iniciar sesión. Inténtalo de nuevo.'
                }
            } finally {
                if (!this.totpLoginRequired) {
                    this.loading = false
                }
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
                throw new Error(
                    'El certificado de las claves del usuario no es válido'
                )
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

                this.$emit('register-success', response.data)

                this.switchMode(false)
                this.password = ''
                this.confirmPassword = ''
                this.serverError = 'Registro completado. Ya puedes iniciar sesión.'
            } catch (error) {
                this.serverError =
                    error.response?.data?.error ||
                    'No se ha podido completar el registro. Inténtalo de nuevo.'
            } finally {
                this.loading = false
            }
        },

        forgotPassword() {
            this.serverError =
                'La recuperación de contraseña todavía no está disponible.'
        }
    }
}
</script>

<style scoped>
.background {
    background-image: url('@/assets/background-login.jpg');
    background-size: cover;
    background-repeat: no-repeat;
    min-height: 100vh;
    width: 100vw;
}

.brand-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    border-radius: 18px;
    background: #163b65;
    font-size: 30px;
}

.brand-icon-sm {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: #163b65;
    font-size: 24px;
}

.card {
    border-radius: 16px;
    overflow: hidden;
}

.form-control {
    min-height: 46px;
}

.form-control:focus {
    border-color: #2878c8;
    box-shadow: 0 0 0 0.2rem rgba(40, 120, 200, 0.15);
}

.letter-spacing {
    letter-spacing: 0.35rem;
}

.btn-primary {
    background-color: #163b65;
    border-color: #163b65;
}

.btn-primary:hover {
    background-color: #0f2d4d;
    border-color: #0f2d4d;
}

.btn-link {
    text-decoration: none;
}

.btn-link:hover {
    text-decoration: underline;
}
</style>
