// Etiquetas en español de los estados de una cuenta.
const accountStatusLabels = {
    ACTIVE: 'Activa',
    CLOSED: 'Cerrada'
}

// Importe en euros con el formato español (1.234,56 €).
export function formatCurrency(amount) {
    const value = Number(amount)
    if (!Number.isFinite(value)) {
        return '—'
    }

    return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}

// IBAN agrupado en bloques de cuatro caracteres.
export function formatIBAN(iban) {
    return String(iban ?? '')
        .replace(/\s/g, '')
        .replace(/(.{4})/g, '$1 ')
        .trim()
}

// Fecha con el formato indicado o, si no es válida, «No disponible».
export function formatDate(date, options = { day: 'numeric', month: 'long', year: 'numeric' }) {
    const parsedDate = new Date(date)
    if (!date || Number.isNaN(parsedDate.getTime())) {
        return 'No disponible'
    }

    return parsedDate.toLocaleString('es-ES', options)
}

export function accountStatusLabel(status) {
    return accountStatusLabels[status] || status
}
