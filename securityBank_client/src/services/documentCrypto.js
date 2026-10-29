// Cifrado de extremo a extremo de documentos (formato versión 1).
//
// Subida:
//   1. Se genera una clave AES-256 aleatoria y exclusiva del documento.
//   2. El contenido (rellenado con Padmé) y los metadatos (nombre, tipo MIME,
//      tamaño y SHA-256 del original, rellenados a 2048 bytes) se cifran con
//      AES-256-GCM. Los datos adicionales autenticados (AAD) vinculan cada parte
//      al documento, a su propietario y a su tipo.
//   3. La clave AES se envuelve con RSA-OAEP usando la clave pública del usuario
//      y se publica un compromiso SHA-256 de esa clave.
//   4. El propietario firma con RSA-PSS un manifiesto de todo lo anterior.
//
// Descarga: se verifica la identidad del propietario (certificada por el banco),
// su firma, el compromiso de clave, los tags GCM y el SHA-256 del original.
// El servidor nunca recibe la clave AES ni datos en claro.

import {
    arrayBufferToBase64,
    base64ToBytes,
    decryptData,
    encryptData,
    importEncryptionPublicKey,
    importSigningPublicKey,
    randomBytes,
    verifyUserPublicKeysCertificate
} from './crypto.js'

export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024
export const UPLOADABLE_DOCUMENT_TYPES = ['PERSONAL', 'OWNERSHIP_CERTIFICATE']

const formatVersion = 1
const keyAlgorithm = 'RSA-OAEP-3072-SHA256'
const signatureAlgorithm = 'RSA-PSS-SHA256'
const minPaddedSize = 1024
const metadataPaddedSize = 2048
const maxFileNameLength = 200
const encryptionContext = 'securitybank-document-v1'
const manifestContext = 'securitybank-document-manifest-v1'
const keyCommitmentContext = 'securitybank-document-key-commitment-v1'
const deleteRequestContext = 'securitybank-document-delete-v1'
const documentIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

// Tipos admitidos, reconocidos por los primeros bytes del contenido y no por la
// extensión. El servidor no puede comprobarlo porque solo recibe datos cifrados.
const allowedFileTypes = [
    { mime: 'application/pdf', signature: [0x25, 0x50, 0x44, 0x46, 0x2d] },
    { mime: 'image/png', signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
    { mime: 'image/jpeg', signature: [0xff, 0xd8, 0xff] },
    { mime: 'application/json', signature: [0x7b] }
]

// Indica que un documento no ha superado alguna comprobación de integridad.
export class DocumentIntegrityError extends Error {
    constructor(message) {
        super(message)
        this.name = 'DocumentIntegrityError'
    }
}

// Codifica cada campo precedido de su longitud, igual que el servidor.
function lengthPrefixed(fields) {
    const encoder = new TextEncoder()
    const encoded = fields.map((field) => (
        typeof field === 'string' ? encoder.encode(field) : field
    ))
    const payload = new Uint8Array(
        encoded.reduce((length, field) => length + 4 + field.length, 0)
    )
    const view = new DataView(payload.buffer)
    let offset = 0

    encoded.forEach((field) => {
        view.setUint32(offset, field.length)
        offset += 4
        payload.set(field, offset)
        offset += field.length
    })

    return payload
}

// Convierte bytes a hexadecimal en minúsculas.
function toHex(bytes) {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

// Calcula el SHA-256 de unos datos binarios.
async function sha256(data) {
    return new Uint8Array(await crypto.subtle.digest('SHA-256', data))
}

// Compara dos secuencias de bytes sin terminar en la primera diferencia.
function equalBytes(left, right) {
    if (left.length !== right.length) {
        return false
    }

    let difference = 0
    for (let index = 0; index < left.length; index++) {
        difference |= left[index] ^ right[index]
    }

    return difference === 0
}

// Normaliza un nonce en Base64 para que el manifiesto sea idéntico al del servidor.
function canonicalBase64(value) {
    return arrayBufferToBase64(base64ToBytes(value))
}

// Calcula el tamaño rellenado con Padmé: solo revela O(log log L) bits del tamaño
// real (Nikitin et al., PETS 2019). Los documentos pequeños ocupan 1 KiB.
export function paddedDocumentSize(size) {
    if (size <= minPaddedSize) {
        return minPaddedSize
    }

    const exponent = 31 - Math.clz32(size)
    const exponentBits = 32 - Math.clz32(exponent)
    const step = 2 ** (exponent - exponentBits)

    return Math.ceil(size / step) * step
}

// Vincula cada parte cifrada a su documento: el servidor no puede intercambiarlas.
function additionalData(part, documentId, ownerId, type) {
    return lengthPrefixed([
        encryptionContext,
        part,
        documentId,
        String(ownerId),
        type,
        String(formatVersion)
    ])
}

// Compromete la clave AES del documento para detectar claves envueltas sustituidas.
async function keyCommitment(rawKey, documentId) {
    return sha256(lengthPrefixed([keyCommitmentContext, documentId, rawKey]))
}

// Construye el manifiesto que firma el propietario (mismo formato que el servidor).
async function documentManifest(fields) {
    return lengthPrefixed([
        manifestContext,
        fields.id,
        String(fields.ownerId),
        fields.type,
        String(formatVersion),
        canonicalBase64(fields.contentNonce),
        toHex(await sha256(fields.encryptedContent)),
        canonicalBase64(fields.metadataNonce),
        toHex(await sha256(fields.encryptedMetadata)),
        toHex(fields.keyCommitment)
    ])
}

// Elimina caracteres de control y de ruta para que el nombre sea seguro al descargar.
export function sanitizeFileName(name) {
    const cleaned = String(name ?? '')
        .normalize('NFC')
        .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, '_')
        .replace(/^[\s.]+|[\s.]+$/g, '')
    const limited = Array.from(cleaned).slice(0, maxFileNameLength).join('')

    return limited || 'documento'
}

// Identifica el tipo real del archivo por su firma inicial (magic bytes).
function detectFileType(content) {
    return allowedFileTypes.find(({ signature }) => (
        signature.every((byte, index) => content[index] === byte)
    ))?.mime
}

// Acepta solo tipos MIME con formato tipo/subtipo.
function sanitizeMimeType(mimeType) {
    return /^[\w.+-]{1,50}\/[\w.+-]{1,50}$/.test(mimeType ?? '')
        ? mimeType.toLowerCase()
        : 'application/octet-stream'
}

// Codifica los metadatos en JSON y los rellena a un tamaño fijo.
function encodeMetadata(metadata) {
    const encoded = new TextEncoder().encode(JSON.stringify(metadata))
    if (encoded.length > metadataPaddedSize) {
        throw new Error('Los metadatos del documento son demasiado largos')
    }

    const padded = new Uint8Array(metadataPaddedSize).fill(0x20)
    padded.set(encoded)
    return padded
}

// Interpreta y valida los metadatos descifrados.
function decodeMetadata(bytes) {
    let metadata
    try {
        metadata = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    } catch {
        throw new DocumentIntegrityError('Los metadatos del documento no son válidos')
    }

    if (
        metadata?.v !== 1 ||
        typeof metadata.name !== 'string' ||
        typeof metadata.mime !== 'string' ||
        !Number.isSafeInteger(metadata.size) ||
        metadata.size < 0 ||
        metadata.size > MAX_DOCUMENT_SIZE ||
        !/^[0-9a-f]{64}$/.test(metadata.sha256)
    ) {
        throw new DocumentIntegrityError('Los metadatos del documento no son válidos')
    }

    return {
        name: sanitizeFileName(metadata.name),
        mime: sanitizeMimeType(metadata.mime),
        size: metadata.size,
        sha256: metadata.sha256
    }
}

// Descifra una parte del documento y convierte cualquier fallo GCM en error de integridad.
async function decryptPart(aesKey, nonce, ciphertext, aad, message) {
    try {
        return await decryptData(
            aesKey,
            { algorithm: 'AES-256-GCM', nonce, ciphertext },
            aad
        )
    } catch {
        throw new DocumentIntegrityError(message)
    }
}

// Recupera la clave AES con la clave privada RSA-OAEP y comprueba su compromiso.
async function unwrapDocumentKey(document, privateKey, documentId) {
    if (document.key_algorithm !== keyAlgorithm) {
        throw new DocumentIntegrityError('El algoritmo de protección de la clave no es compatible')
    }

    let rawKey
    try {
        rawKey = new Uint8Array(await crypto.subtle.decrypt(
            { name: 'RSA-OAEP' },
            privateKey,
            base64ToBytes(document.encrypted_key)
        ))
    } catch {
        throw new DocumentIntegrityError('No se ha podido descifrar la clave del documento con tu clave privada')
    }

    try {
        if (rawKey.length !== 32) {
            throw new DocumentIntegrityError('La clave del documento no tiene 256 bits')
        }

        const commitment = await keyCommitment(rawKey, documentId)
        if (!equalBytes(commitment, base64ToBytes(document.key_commitment))) {
            throw new DocumentIntegrityError(
                'La clave del documento no es la que comprometió su propietario: posible sustitución de clave'
            )
        }

        return await crypto.subtle.importKey(
            'raw',
            rawKey,
            { name: 'AES-GCM' },
            false,
            ['decrypt']
        )
    } finally {
        rawKey.fill(0)
    }
}

// Comprueba que la sesión tiene las claves e identidad verificadas del usuario.
function assertSession(session) {
    if (!session?.identity?.user || !session?.identity?.serverPublicKey ||
        !session?.privateKeys?.encryption || !session?.privateKeys?.signing) {
        throw new Error('La sesión no tiene las claves del usuario. Vuelve a iniciar sesión.')
    }
}

// Cifra, protege la clave y firma un documento. Devuelve el cuerpo de la petición
// de subida y la huella SHA-256 del original.
export async function encryptDocument(file, type, session) {
    assertSession(session)
    if (!UPLOADABLE_DOCUMENT_TYPES.includes(type)) {
        throw new Error('Tipo de documento no permitido')
    }
    if (!file || file.size > MAX_DOCUMENT_SIZE) {
        throw new Error('El documento supera el tamaño máximo de 10 MB')
    }

    const { identity, privateKeys } = session
    const id = crypto.randomUUID()
    const ownerId = identity.user.id
    const content = new Uint8Array(await file.arrayBuffer())
    const mime = detectFileType(content)
    if (!mime) {
        throw new Error('Tipo de archivo no permitido: solo PDF, PNG, JPEG o JSON')
    }

    const padded = new Uint8Array(paddedDocumentSize(content.length))
    padded.set(content)

    const fingerprint = toHex(await sha256(content))
    const metadata = encodeMetadata({
        v: 1,
        name: sanitizeFileName(file.name),
        mime,
        size: content.length,
        sha256: fingerprint
    })

    const rawKey = randomBytes(32)
    try {
        const aesKey = await crypto.subtle.importKey(
            'raw',
            rawKey,
            { name: 'AES-GCM' },
            false,
            ['encrypt']
        )
        const encryptedContent = await encryptData(
            aesKey,
            padded,
            additionalData('content', id, ownerId, type)
        )
        const encryptedMetadata = await encryptData(
            aesKey,
            metadata,
            additionalData('metadata', id, ownerId, type)
        )

        const ownPublicKey = await importEncryptionPublicKey(identity.user.public_key)
        const encryptedKey = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, ownPublicKey, rawKey)
        const commitment = await keyCommitment(rawKey, id)

        const manifest = await documentManifest({
            id,
            ownerId,
            type,
            contentNonce: encryptedContent.nonce,
            encryptedContent: base64ToBytes(encryptedContent.ciphertext),
            metadataNonce: encryptedMetadata.nonce,
            encryptedMetadata: base64ToBytes(encryptedMetadata.ciphertext),
            keyCommitment: commitment
        })
        const signature = await crypto.subtle.sign(
            { name: 'RSA-PSS', saltLength: 32 },
            privateKeys.signing,
            manifest
        )

        return {
            fingerprint,
            payload: {
                id,
                type,
                format_version: formatVersion,
                content_nonce: encryptedContent.nonce,
                encrypted_content: encryptedContent.ciphertext,
                metadata_nonce: encryptedMetadata.nonce,
                encrypted_metadata: encryptedMetadata.ciphertext,
                key_commitment: arrayBufferToBase64(commitment),
                key_algorithm: keyAlgorithm,
                encrypted_key: arrayBufferToBase64(encryptedKey),
                signature: arrayBufferToBase64(signature)
            }
        }
    } finally {
        // Limpieza de mejor esfuerzo: JavaScript no garantiza borrar copias en memoria.
        rawKey.fill(0)
        padded.fill(0)
        content.fill(0)
    }
}

// Firma la orden de borrado con la clave privada: el servidor no acepta solo la sesión.
// Devuelve las cabeceras que acompañan a la petición.
export async function signDeleteRequest(documentId, session) {
    assertSession(session)

    const timestamp = String(Math.floor(Date.now() / 1000))
    const signature = await crypto.subtle.sign(
        { name: 'RSA-PSS', saltLength: 32 },
        session.privateKeys.signing,
        lengthPrefixed([deleteRequestContext, documentId, timestamp])
    )

    return {
        'X-Request-Timestamp': timestamp,
        'X-Request-Signature': arrayBufferToBase64(signature)
    }
}

// Descifra los metadatos de un documento del listado (nombre, tipo, tamaño y huella).
export async function decryptDocumentMetadata(summary, session) {
    assertSession(session)
    if (!documentIdPattern.test(summary?.id ?? '')) {
        throw new DocumentIntegrityError('El identificador del documento no es válido')
    }

    const aesKey = await unwrapDocumentKey(summary, session.privateKeys.encryption, summary.id)
    const metadata = await decryptPart(
        aesKey,
        summary.metadata_nonce,
        summary.encrypted_metadata,
        additionalData('metadata', summary.id, summary.owner_id, summary.type),
        'Los metadatos del documento han sido manipulados'
    )

    return decodeMetadata(metadata)
}

// Verifica por completo un documento descargado y devuelve su contenido original.
export async function openDocument(requestedId, document, session) {
    assertSession(session)
    const { identity, privateKeys } = session

    if (document?.id !== requestedId || !documentIdPattern.test(requestedId)) {
        throw new DocumentIntegrityError('El servidor ha devuelto un documento distinto del solicitado')
    }
    if (document.format_version !== formatVersion || document.signature_algorithm !== signatureAlgorithm) {
        throw new DocumentIntegrityError('El formato del documento no es compatible')
    }

    // 1. El banco certifica la identidad y las claves públicas del propietario.
    const owner = document.owner
    if (owner?.id !== document.owner_id ||
        !(await verifyUserPublicKeysCertificate(identity.serverPublicKey, owner))) {
        throw new DocumentIntegrityError('La identidad del propietario no está certificada por el banco')
    }
    if (owner.id === identity.user.id && owner.signing_public_key !== identity.user.signing_public_key) {
        throw new DocumentIntegrityError('Tus claves públicas no coinciden con las verificadas al iniciar sesión')
    }

    // 2. La firma del propietario cubre el contenido, los metadatos y el compromiso de clave.
    const manifest = await documentManifest({
        id: requestedId,
        ownerId: document.owner_id,
        type: document.type,
        contentNonce: document.content_nonce,
        encryptedContent: base64ToBytes(document.encrypted_content),
        metadataNonce: document.metadata_nonce,
        encryptedMetadata: base64ToBytes(document.encrypted_metadata),
        keyCommitment: base64ToBytes(document.key_commitment)
    })
    const ownerSigningKey = await importSigningPublicKey(owner.signing_public_key)
    const signatureIsValid = await crypto.subtle.verify(
        { name: 'RSA-PSS', saltLength: 32 },
        ownerSigningKey,
        base64ToBytes(document.signature),
        manifest
    )
    if (!signatureIsValid) {
        throw new DocumentIntegrityError('La firma digital del propietario no es válida: el documento ha sido alterado')
    }

    // 3. La clave AES desenvuelta debe ser la comprometida en el manifiesto.
    const aesKey = await unwrapDocumentKey(document, privateKeys.encryption, requestedId)

    // 4. AES-GCM autentica los metadatos y el contenido junto con sus AAD.
    const metadata = decodeMetadata(await decryptPart(
        aesKey,
        document.metadata_nonce,
        document.encrypted_metadata,
        additionalData('metadata', requestedId, document.owner_id, document.type),
        'Los metadatos del documento han sido manipulados'
    ))
    const padded = await decryptPart(
        aesKey,
        document.content_nonce,
        document.encrypted_content,
        additionalData('content', requestedId, document.owner_id, document.type),
        'El contenido del documento ha sido manipulado'
    )
    if (padded.length !== paddedDocumentSize(metadata.size)) {
        padded.fill(0)
        throw new DocumentIntegrityError('El tamaño del documento no coincide con sus metadatos')
    }

    // 5. La huella SHA-256 del original permite compararlo fuera de la aplicación.
    const content = padded.slice(0, metadata.size)
    padded.fill(0)
    const digest = toHex(await sha256(content))
    if (digest !== metadata.sha256) {
        content.fill(0)
        throw new DocumentIntegrityError('La huella SHA-256 del documento no coincide')
    }

    return {
        content,
        metadata,
        verification: {
            ownerEmail: owner.email,
            signatureAlgorithm,
            keyAlgorithm,
            cipher: 'AES-256-GCM',
            sha256: digest
        }
    }
}
