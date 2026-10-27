const rsaAlgorithm = {
    modulusLength: 3072,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256'
}

// Convierte datos binarios a Base64 para poder transportarlos como texto.
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer)
    let binary = ''

    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte)
    })

    return btoa(binary)
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
