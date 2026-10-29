const rsaAlgorithm = {
    modulusLength: 3072,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256'
}
const pbkdf2Iterations = 600000
const privateKeyBundleVersion = 2
const privateKeyBundleContext = new TextEncoder().encode(
    'securitybank-private-key-bundle-v2'
)
const masterKeyContext = 'securitybank-master-key-v2:'
const authKeyLabel = new TextEncoder().encode('securitybank-auth-key-v2')
const privateKeysKeyLabel = new TextEncoder().encode('securitybank-private-keys-v2')
const userKeyCertificateVersion = 'securitybank-user-keys-v1'

// Convierte datos binarios a Base64 para poder transportarlos como texto.
// Procesa bloques para que documentos de varios MB no sean lentos.
export function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer)
    const chunkSize = 0x8000
    let binary = ''

    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
    }

    return btoa(binary)
}

// Convierte texto en Base64 a los datos binarios originales.
export function base64ToBytes(value) {
    const binary = atob(value)
    const bytes = new Uint8Array(binary.length)

    for (let index = 0; index < binary.length; index++) {
        bytes[index] = binary.charCodeAt(index)
    }

    return bytes
}

// Obtiene bytes aleatorios usando el generador seguro del navegador.
export function randomBytes(length) {
    return crypto.getRandomValues(new Uint8Array(length))
}

// Convierte texto o datos binarios a un formato aceptado por Web Crypto.
function normalizeData(data) {
    if (typeof data === 'string') {
        return new TextEncoder().encode(data)
    }
    if (data instanceof ArrayBuffer) {
        return new Uint8Array(data)
    }
    if (ArrayBuffer.isView(data)) {
        return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    }

    throw new TypeError('Los datos deben ser texto o contenido binario')
}

// Construye la misma representación inequívoca que firma el servidor.
function userKeyCertificatePayload(email, publicKey, signingPublicKey) {
    const encoder = new TextEncoder()
    const fields = [
        userKeyCertificateVersion,
        email.trim().toLowerCase(),
        publicKey,
        signingPublicKey
    ].map((field) => encoder.encode(field))
    const payloadLength = fields.reduce(
        (length, field) => length + 4 + field.length,
        0
    )
    const payload = new Uint8Array(payloadLength)
    const view = new DataView(payload.buffer)
    let offset = 0

    fields.forEach((field) => {
        view.setUint32(offset, field.length)
        offset += 4
        payload.set(field, offset)
        offset += field.length
    })

    return payload
}

// Deriva de la contraseña una clave maestra que nunca sale del navegador. El
// correo normalizado actúa como sal para poder derivarla antes de autenticarse.
export async function deriveMasterKey(email, password) {
    const passwordKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    )
    const masterKey = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            hash: 'SHA-256',
            salt: new TextEncoder().encode(masterKeyContext + email.trim().toLowerCase()),
            iterations: pbkdf2Iterations
        },
        passwordKey,
        256
    )

    return crypto.subtle.importKey(
        'raw',
        masterKey,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    )
}

// Obtiene la clave que se envía al servidor para autenticarse. Es independiente
// de la que protege las claves privadas: conocerla no permite descifrarlas.
export async function deriveAuthKey(masterKey) {
    const authKey = await crypto.subtle.sign('HMAC', masterKey, authKeyLabel)

    return arrayBufferToBase64(authKey)
}

// Deriva de la clave maestra la clave AES no exportable que protege las claves privadas.
async function derivePrivateKeyEncryptionKey(masterKey, salt) {
    const encryptionKey = await crypto.subtle.sign(
        'HMAC',
        masterKey,
        new Uint8Array([...privateKeysKeyLabel, ...salt])
    )

    return crypto.subtle.importKey('raw', encryptionKey, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

// Genera el par usado para cifrar y descifrar claves AES.
export async function generateEncryptionKeyPair() {
    return crypto.subtle.generateKey(
        {
            name: 'RSA-OAEP',
            ...rsaAlgorithm
        },
        true,
        ['encrypt', 'decrypt']
    )
}

// Genera el par usado para firmar y verificar desafíos de autenticación.
export async function generateSigningKeyPair() {
    return crypto.subtle.generateKey(
        {
            name: 'RSA-PSS',
            ...rsaAlgorithm
        },
        true,
        ['sign', 'verify']
    )
}

// Genera los dos pares de claves necesarios para un usuario.
export async function generateUserKeyPairs() {
    const [encryption, signing] = await Promise.all([
        generateEncryptionKeyPair(),
        generateSigningKeyPair()
    ])

    return { encryption, signing }
}

// Exporta una clave pública en formato SPKI codificado en Base64.
export async function exportPublicKey(publicKey) {
    const exportedKey = await crypto.subtle.exportKey('spki', publicKey)
    return arrayBufferToBase64(exportedKey)
}

// Exporta una clave privada en formato PKCS#8 codificado en Base64.
export async function exportPrivateKey(privateKey) {
    const exportedKey = await crypto.subtle.exportKey('pkcs8', privateKey)
    return arrayBufferToBase64(exportedKey)
}

// Protege las dos claves privadas con una clave derivada de la clave maestra.
export async function encryptPrivateKeys(keyPairs, masterKey) {
    if (!masterKey) {
        throw new Error('La clave maestra es obligatoria para proteger las claves')
    }

    const privateKeys = {
        encryption: await exportPrivateKey(keyPairs.encryption.privateKey),
        signing: await exportPrivateKey(keyPairs.signing.privateKey)
    }
    const plaintext = new TextEncoder().encode(JSON.stringify(privateKeys))
    const salt = randomBytes(16)
    const nonce = randomBytes(12)
    const encryptionKey = await derivePrivateKeyEncryptionKey(masterKey, salt)
    const ciphertext = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: nonce,
            additionalData: privateKeyBundleContext
        },
        encryptionKey,
        plaintext
    )

    return {
        version: privateKeyBundleVersion,
        algorithm: 'AES-256-GCM',
        kdf: 'PBKDF2-HMAC-SHA256+HMAC-SHA256',
        iterations: pbkdf2Iterations,
        salt: arrayBufferToBase64(salt),
        nonce: arrayBufferToBase64(nonce),
        ciphertext: arrayBufferToBase64(ciphertext)
    }
}

// Recupera las claves privadas cuando la clave maestra y el paquete son válidos.
export async function decryptPrivateKeys(bundle, masterKey) {
    if (bundle?.version !== privateKeyBundleVersion || bundle?.iterations !== pbkdf2Iterations) {
        throw new Error('El formato de las claves privadas no es compatible')
    }

    const salt = base64ToBytes(bundle.salt)
    const nonce = base64ToBytes(bundle.nonce)
    const ciphertext = base64ToBytes(bundle.ciphertext)
    const encryptionKey = await derivePrivateKeyEncryptionKey(masterKey, salt)
    const plaintext = await crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: nonce,
            additionalData: privateKeyBundleContext
        },
        encryptionKey,
        ciphertext
    )

    return JSON.parse(new TextDecoder().decode(plaintext))
}

// Importa la clave privada destinada a descifrar claves AES.
export async function importEncryptionPrivateKey(encodedKey) {
    return crypto.subtle.importKey(
        'pkcs8',
        base64ToBytes(encodedKey),
        {
            name: 'RSA-OAEP',
            hash: 'SHA-256'
        },
        false,
        ['decrypt']
    )
}

// Importa la clave pública destinada a proteger claves AES.
export async function importEncryptionPublicKey(encodedKey) {
    return crypto.subtle.importKey(
        'spki',
        base64ToBytes(encodedKey),
        {
            name: 'RSA-OAEP',
            hash: 'SHA-256'
        },
        false,
        ['encrypt']
    )
}

// Importa la clave pública que verifica las firmas de un usuario.
export async function importSigningPublicKey(encodedKey) {
    return crypto.subtle.importKey(
        'spki',
        base64ToBytes(encodedKey),
        {
            name: 'RSA-PSS',
            hash: 'SHA-256'
        },
        false,
        ['verify']
    )
}

// Importa la clave privada destinada a firmar desafíos de autenticación.
export async function importSigningPrivateKey(encodedKey) {
    return crypto.subtle.importKey(
        'pkcs8',
        base64ToBytes(encodedKey),
        {
            name: 'RSA-PSS',
            hash: 'SHA-256'
        },
        false,
        ['sign']
    )
}

// Descifra e importa las dos claves privadas como claves no exportables.
export async function restorePrivateKeys(bundle, masterKey) {
    const encodedKeys = await decryptPrivateKeys(bundle, masterKey)
    const [encryption, signing] = await Promise.all([
        importEncryptionPrivateKey(encodedKeys.encryption),
        importSigningPrivateKey(encodedKeys.signing)
    ])

    return { encryption, signing }
}

// Firma un desafío recibido en Base64 con la clave privada de firma.
export async function signChallenge(signingPrivateKey, encodedChallenge) {
    const signature = await crypto.subtle.sign(
        {
            name: 'RSA-PSS',
            saltLength: 32
        },
        signingPrivateKey,
        base64ToBytes(encodedChallenge)
    )

    return arrayBufferToBase64(signature)
}

// Importa y valida la identidad pública publicada por el servidor.
export async function importServerSigningPublicKey(identity) {
    if (
        identity?.version !== 1 ||
        identity?.public_key_algorithm !== 'RSA-3072' ||
        identity?.signature_algorithm !== 'RSA-PSS-SHA256' ||
        identity?.jwt_algorithm !== 'RS256'
    ) {
        throw new Error('La identidad criptográfica del servidor no es compatible')
    }

    const encodedPublicKey = base64ToBytes(identity.public_key)
    const fingerprint = await crypto.subtle.digest('SHA-256', encodedPublicKey)
    const encodedFingerprint = Array.from(new Uint8Array(fingerprint))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')

    if (encodedFingerprint !== identity.fingerprint_sha256) {
        throw new Error('La huella de la clave pública del servidor no coincide')
    }

    const publicKey = await crypto.subtle.importKey(
        'spki',
        encodedPublicKey,
        {
            name: 'RSA-PSS',
            hash: 'SHA-256'
        },
        false,
        ['verify']
    )

    if (publicKey.algorithm.modulusLength !== 3072) {
        throw new Error('La clave pública del servidor no es RSA-3072')
    }

    return publicKey
}

// Verifica que el servidor haya certificado el correo y las claves públicas del usuario.
export async function verifyUserPublicKeysCertificate(serverPublicKey, user) {
    if (
        !user?.email ||
        !user?.public_key ||
        !user?.signing_public_key ||
        !user?.public_keys_signature
    ) {
        return false
    }

    const payload = userKeyCertificatePayload(
        user.email,
        user.public_key,
        user.signing_public_key
    )

    return crypto.subtle.verify(
        {
            name: 'RSA-PSS',
            saltLength: 32
        },
        serverPublicKey,
        base64ToBytes(user.public_keys_signature),
        payload
    )
}

// Genera una clave AES-256 aleatoria para proteger un único recurso.
export async function generateDataEncryptionKey() {
    return crypto.subtle.generateKey(
        {
            name: 'AES-GCM',
            length: 256
        },
        true,
        ['encrypt', 'decrypt']
    )
}

// Prepara los parámetros de AES-GCM con datos adicionales autenticados opcionales.
function aesGcmParameters(nonce, additionalData) {
    const parameters = {
        name: 'AES-GCM',
        iv: nonce
    }

    if (additionalData !== undefined) {
        parameters.additionalData = normalizeData(additionalData)
    }

    return parameters
}

// Cifra datos con AES-GCM y un nonce aleatorio de 12 bytes. Los datos
// adicionales (AAD) no se cifran, pero quedan protegidos por el tag GCM.
export async function encryptData(encryptionKey, data, additionalData) {
    const nonce = randomBytes(12)
    const ciphertext = await crypto.subtle.encrypt(
        aesGcmParameters(nonce, additionalData),
        encryptionKey,
        normalizeData(data)
    )

    return {
        algorithm: 'AES-256-GCM',
        nonce: arrayBufferToBase64(nonce),
        ciphertext: arrayBufferToBase64(ciphertext)
    }
}

// Descifra y verifica la integridad de datos protegidos con AES-GCM.
export async function decryptData(encryptionKey, encryptedData, additionalData) {
    const nonce = base64ToBytes(encryptedData?.nonce)
    const ciphertext = base64ToBytes(encryptedData?.ciphertext)

    if (
        encryptedData?.algorithm !== 'AES-256-GCM' ||
        nonce.length !== 12 ||
        ciphertext.length < 16
    ) {
        throw new Error('El formato de los datos cifrados no es válido')
    }

    const plaintext = await crypto.subtle.decrypt(
        aesGcmParameters(nonce, additionalData),
        encryptionKey,
        ciphertext
    )

    return new Uint8Array(plaintext)
}

// Protege una clave AES con la clave pública RSA-OAEP del usuario.
export async function encryptDataKey(encryptionKey, publicKey) {
    const rawKey = await crypto.subtle.exportKey('raw', encryptionKey)
    const encryptedKey = await crypto.subtle.encrypt(
        {
            name: 'RSA-OAEP'
        },
        publicKey,
        rawKey
    )

    return arrayBufferToBase64(encryptedKey)
}

// Recupera una clave AES y la importa de nuevo como no exportable.
export async function decryptDataKey(encodedKey, privateKey) {
    const rawKey = await crypto.subtle.decrypt(
        {
            name: 'RSA-OAEP'
        },
        privateKey,
        base64ToBytes(encodedKey)
    )

    if (rawKey.byteLength !== 32) {
        throw new Error('La clave AES recuperada no tiene 256 bits')
    }

    return crypto.subtle.importKey(
        'raw',
        rawKey,
        {
            name: 'AES-GCM',
            length: 256
        },
        false,
        ['encrypt', 'decrypt']
    )
}
