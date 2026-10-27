const rsaAlgorithm = {
    modulusLength: 3072,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256'
}
const pbkdf2Iterations = 600000
const privateKeyBundleContext = new TextEncoder().encode(
    'securitybank-private-key-bundle-v1'
)

// Convierte datos binarios a Base64 para poder transportarlos como texto.
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer)
    let binary = ''

    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte)
    })

    return btoa(binary)
}

// Convierte texto en Base64 a los datos binarios originales.
function base64ToBytes(value) {
    const binary = atob(value)
    return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

// Obtiene bytes aleatorios usando el generador seguro del navegador.
function randomBytes(length) {
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

// Deriva una clave AES no exportable a partir de la contraseña y la sal.
async function derivePrivateKeyEncryptionKey(password, salt) {
    const passwordKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    )

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            hash: 'SHA-256',
            salt,
            iterations: pbkdf2Iterations
        },
        passwordKey,
        {
            name: 'AES-GCM',
            length: 256
        },
        false,
        ['encrypt', 'decrypt']
    )
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

// Protege las dos claves privadas con una clave derivada de la contraseña.
export async function encryptPrivateKeys(keyPairs, password) {
    if (!password) {
        throw new Error('La contraseña es obligatoria para proteger las claves')
    }

    const privateKeys = {
        encryption: await exportPrivateKey(keyPairs.encryption.privateKey),
        signing: await exportPrivateKey(keyPairs.signing.privateKey)
    }
    const plaintext = new TextEncoder().encode(JSON.stringify(privateKeys))
    const salt = randomBytes(16)
    const nonce = randomBytes(12)
    const encryptionKey = await derivePrivateKeyEncryptionKey(password, salt)
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
        version: 1,
        algorithm: 'AES-256-GCM',
        kdf: 'PBKDF2-HMAC-SHA256',
        iterations: pbkdf2Iterations,
        salt: arrayBufferToBase64(salt),
        nonce: arrayBufferToBase64(nonce),
        ciphertext: arrayBufferToBase64(ciphertext)
    }
}

// Recupera las claves privadas cuando la contraseña y el paquete son válidos.
export async function decryptPrivateKeys(bundle, password) {
    if (bundle?.version !== 1 || bundle?.iterations !== pbkdf2Iterations) {
        throw new Error('El formato de las claves privadas no es compatible')
    }

    const salt = base64ToBytes(bundle.salt)
    const nonce = base64ToBytes(bundle.nonce)
    const ciphertext = base64ToBytes(bundle.ciphertext)
    const encryptionKey = await derivePrivateKeyEncryptionKey(password, salt)
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
export async function restorePrivateKeys(bundle, password) {
    const encodedKeys = await decryptPrivateKeys(bundle, password)
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

// Cifra datos con AES-GCM y un nonce aleatorio de 12 bytes.
export async function encryptData(encryptionKey, data) {
    const nonce = randomBytes(12)
    const ciphertext = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: nonce
        },
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
export async function decryptData(encryptionKey, encryptedData) {
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
        {
            name: 'AES-GCM',
            iv: nonce
        },
        encryptionKey,
        ciphertext
    )

    return new Uint8Array(plaintext)
}
