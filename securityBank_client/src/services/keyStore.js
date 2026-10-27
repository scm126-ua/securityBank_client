let activePrivateKeys = null

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
