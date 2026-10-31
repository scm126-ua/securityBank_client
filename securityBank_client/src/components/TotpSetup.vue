<template>
    <ol class="totp-steps">
        <li>
            <span class="step-text">
                Escanea este código QR con tu aplicación de autenticación (Google Authenticator, Authy…).
            </span>
            <img :src="setup.qr_code" alt="Código QR para configurar la verificación en dos pasos" class="totp-qr"
                width="160" height="160" />
            <span class="small text-muted">¿No puedes escanearlo? Introduce esta clave en la aplicación:</span>
            <code class="totp-secret">{{ setup.secret }}</code>
        </li>

        <li>
            <label :for="inputId" class="step-text form-label">
                Escribe el código de 6 dígitos que muestra la aplicación.
            </label>
            <input :id="inputId" :value="modelValue" type="text" class="form-control totp-input"
                :class="{ 'is-invalid': error }" placeholder="000000" inputmode="numeric"
                autocomplete="one-time-code" maxlength="6" @input="$emit('update:modelValue', $event.target.value.trim())" />
            <div v-if="error" class="invalid-feedback">
                {{ error }}
            </div>
        </li>
    </ol>
</template>

<script>
// Pasos para dar de alta la verificación en dos pasos: el QR (o la clave) para la
// aplicación de autenticación y el primer código que confirma que está bien configurada.
export default {
    name: 'TotpSetup',

    props: {
        // Respuesta del servidor con el secreto y el QR (data:image/png).
        setup: {
            type: Object,
            required: true
        },
        modelValue: {
            type: String,
            default: ''
        },
        inputId: {
            type: String,
            required: true
        },
        error: {
            type: String,
            default: ''
        }
    },

    emits: ['update:modelValue']
}
</script>

<style scoped>
.totp-steps {
    display: grid;
    gap: 1.25rem;
    margin: 0;
    padding-left: 1.25rem;
}

.totp-steps li::marker {
    font-weight: 600;
    color: var(--sb-navy-800);
}

.totp-steps li {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
}

.step-text {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--sb-text);
}

.totp-qr {
    padding: 0.5rem;
    border: 1px solid var(--sb-border);
    border-radius: var(--sb-radius);
    background-color: #ffffff;
}

.totp-secret {
    padding: 0.375rem 0.625rem;
    border: 1px solid var(--sb-border);
    border-radius: 0.375rem;
    font-size: 0.875rem;
    color: var(--sb-navy-900);
    background-color: #ffffff;
    overflow-wrap: anywhere;
    user-select: all;
}

.totp-input {
    max-width: 14rem;
}
</style>
