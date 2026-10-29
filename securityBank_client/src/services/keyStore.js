let activePrivateKeys = null
let activeIdentity = null

// Conserva las claves privadas no exportables mientras dure la sesión.
export function storePrivateKeys(privateKeys) {
    if (!privateKeys?.encryption || !privateKeys?.signing) {
        throw new Error('Las claves privadas de la sesión no son válidas')
    }

    activePrivateKeys = privateKeys
}

// Devuelve las claves privadas disponibles en la sesión actual.
export function getPrivateKeys() {
    return activePrivateKeys
}

// Elimina las referencias a las claves privadas al finalizar la sesión.
export function clearPrivateKeys() {
    activePrivateKeys = null
}

// Conserva la identidad verificada durante el login: el usuario con sus claves
// públicas certificadas y la clave pública del servidor que las certifica.
export function storeIdentity(user, serverPublicKey) {
    if (!user?.id || !user?.public_key || !user?.signing_public_key || !serverPublicKey) {
        throw new Error('La identidad de la sesión no es válida')
    }

    activeIdentity = Object.freeze({
        user: Object.freeze({
            id: user.id,
            email: user.email,
            name: user.name,
            public_key: user.public_key,
            signing_public_key: user.signing_public_key,
            public_keys_signature: user.public_keys_signature
        }),
        serverPublicKey
    })
}

// Devuelve la identidad verificada de la sesión actual.
export function getIdentity() {
    return activeIdentity
}

// Elimina claves e identidad al cerrar la sesión.
export function clearSession() {
    activePrivateKeys = null
    activeIdentity = null
}
