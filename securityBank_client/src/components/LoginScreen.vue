<template>

    <div class=background>
        <div class="container py-5">
            <div class="row justify-content-center">
                <div class="col-12 col-md-9 col-lg-6 col-xl-5">

                    <div class="card align-items-center p-3 mb-4">
                        <div class="brand-icon mb-3">🔒</div>
                        <h1 class="h3 fw-bold">SecurityBank</h1>
                        <p class="text-secondary mb-0">
                            Tu banca segura, siempre contigo
                        </p>
                    </div>

                    <div class="card border-0 shadow-sm">
                        <!-- INICIO DE SESIÓN -->
                        <template v-if="!registerMode">
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
                                            @input="errors.email = ''; serverError = ''" />

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
    signChallenge,
    verifyUserPublicKeysCertificate
} from '../services/crypto'
import { storeIdentity, storePrivateKeys } from '../services/keyStore'

export default {
    name: 'LoginScreen',

    data() {
        return {
            registerMode: false,
            loading: false,

            email: '',
            password: '',
            confirmPassword: '',
            name: '',
            lastName: '',
            dni: '',
            acceptTerms: false,

            serverError: '',

            errors: {
                email: '',
                password: '',
                name: '',
                lastName: '',
                confirmPassword: '',
                acceptTerms: '',
                dni: ''
            }
        }
    },

    methods: {
        clearErrors() {
            this.serverError = ''

            Object.keys(this.errors).forEach((key) => {
                this.errors[key] = ''
            })
        },

        switchMode(register) {
            this.registerMode = register
            this.clearErrors()
            this.password = ''
            this.confirmPassword = ''
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

            if (!this.acceptTerms) {
                this.errors.acceptTerms = 'Debes aceptar las condiciones para continuar.'
                valid = false
            }

            return valid
        },

        async logUser() {
            if (this.loading || !this.validateLogin()) {
                return
            }

            this.loading = true

            try {
                const identityResponse = await api.get('/server/public-key')
                const serverPublicKey = await importServerSigningPublicKey(
                    identityResponse.data
                )
                // La contraseña no sale del navegador: solo se envía la clave de autenticación.
                const masterKey = await deriveMasterKey(this.email, this.password)
                const challengeResponse = await api.post('/login/challenge', {
                    email: this.email,
                    auth_key: await deriveAuthKey(masterKey)
                })
                const privateKeys = await restorePrivateKeys(
                    challengeResponse.data.private_key_bundle,
                    masterKey
                )
                const signature = await signChallenge(
                    privateKeys.signing,
                    challengeResponse.data.challenge
                )
                const response = await api.post('/login/verify', {
                    challenge_id: challengeResponse.data.challenge_id,
                    signature
                })

                const certificateIsValid = await verifyUserPublicKeysCertificate(
                    serverPublicKey,
                    response.data.user
                )
                if (!certificateIsValid) {
                    throw new Error('El certificado de las claves del usuario no es válido')
                }

                storePrivateKeys(privateKeys)
                storeIdentity(response.data.user, serverPublicKey)
                localStorage.setItem('token', response.data.token)
                this.$emit('login-success', response.data)
            } catch (error) {
                if (error.response?.status === 401) {
                    this.serverError = 'Correo o contraseña incorrectos.'
                } else {
                    this.serverError =
                        error.response?.data?.error ||
                        error.message ||
                        'No se ha podido iniciar sesión. Inténtalo de nuevo.'
                }
            } finally {
                this.loading = false
            }
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

                const response = await api.post('/register', {
                    name: this.name,
                    surname: this.lastName,
                    email: this.email,
                    auth_key: authKey,
                    dni: this.dni.trim().toUpperCase(),
                    public_key: publicKey,
                    signing_public_key: signingPublicKey,
                    private_key_bundle: privateKeyBundle
                })

                // Llveamos el evento al padre
                this.$emit('register-success', response.data)

                // Si el backend no inicia sesión automáticamente:
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
    height: 100vh;
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
