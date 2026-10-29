<template>
    <section>
        <div class="page-header">
            <div>
                <h1 class="page-title">Mis documentos</h1>
                <p class="page-subtitle">
                    Se cifran en tu navegador: el banco no puede ver ni su contenido ni su nombre.
                </p>
            </div>
        </div>

        <div class="row g-4 mb-4">
            <!-- Subida -->
            <div class="col-lg-8">
                <div class="panel h-100">
                    <div class="panel-header">
                        <h2 class="panel-title">Subir un documento</h2>
                    </div>

                    <div class="panel-body">
                        <form @submit.prevent="uploadDocument">
                            <label for="documentFile" class="dropzone"
                                :class="{ dragging, 'has-file': selectedFile, disabled: uploading }"
                                @dragover.prevent="dragging = !uploading" @dragleave="dragging = false"
                                @drop.prevent="dropFile">
                                <input id="documentFile" ref="fileInput" type="file" class="visually-hidden"
                                    accept=".pdf,.png,.jpg,.jpeg,.json" :disabled="uploading"
                                    @change="selectFile($event.target.files?.[0])" />

                                <span class="dropzone-icon">
                                    <AppIcon :name="selectedFile ? 'file-text' : 'upload'" />
                                </span>

                                <template v-if="selectedFile">
                                    <span class="dropzone-title text-break">{{ selectedFile.name }}</span>
                                    <span class="dropzone-hint">
                                        {{ formatSize(selectedFile.size) }} · Haz clic para elegir otro archivo
                                    </span>
                                </template>
                                <template v-else>
                                    <span class="dropzone-title">
                                        Arrastra un archivo aquí o <span class="dropzone-link">selecciónalo</span>
                                    </span>
                                    <span class="dropzone-hint">PDF, PNG, JPEG o JSON · máximo 10 MB</span>
                                </template>
                            </label>

                            <div class="row g-3 align-items-end mt-1">
                                <div class="col-sm-6">
                                    <label for="documentType" class="form-label">Tipo de documento</label>
                                    <select id="documentType" v-model="documentType" class="form-select"
                                        :disabled="uploading">
                                        <option v-for="type in uploadTypes" :key="type" :value="type">
                                            {{ typeLabel(type) }}
                                        </option>
                                    </select>
                                </div>

                                <div class="col-sm-6">
                                    <button type="submit" class="btn btn-primary w-100 upload-button"
                                        :disabled="uploading || !selectedFile">
                                        <span v-if="uploading" class="spinner-border spinner-border-sm me-2"
                                            aria-hidden="true"></span>
                                        <AppIcon v-else name="lock" class="me-2" />
                                        {{ uploading ? uploadStep : 'Cifrar y subir' }}
                                    </button>
                                </div>
                            </div>
                        </form>

                        <div v-if="uploadError" class="alert alert-danger d-flex gap-2 mt-3 mb-0" role="alert">
                            <AppIcon name="alert-circle" />
                            <span>{{ uploadError }}</span>
                        </div>

                        <div v-if="uploadSuccess" class="alert alert-success d-flex gap-2 mt-3 mb-0" role="status">
                            <AppIcon name="check-circle" />
                            <div class="min-w-0">
                                {{ uploadSuccess }}
                                <div class="hash">SHA-256 del original: {{ uploadFingerprint }}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Espacio y garantías -->
            <div class="col-lg-4">
                <div class="panel h-100">
                    <div class="panel-header">
                        <h2 class="panel-title">Espacio de almacenamiento</h2>
                    </div>

                    <div class="panel-body">
                        <template v-if="usage">
                            <p class="storage-used">
                                <span class="amount">{{ formatSize(usage.used_bytes) }}</span>
                                <span class="storage-total">de {{ formatSize(usage.max_bytes) }}</span>
                            </p>
                            <div class="progress mb-2" role="progressbar" aria-label="Espacio ocupado"
                                :aria-valuenow="usagePercent" aria-valuemin="0" aria-valuemax="100">
                                <div class="progress-bar" :style="{ width: usagePercent + '%' }"></div>
                            </div>
                            <p class="small text-muted">
                                {{ usage.documents }} de {{ usage.max_documents }} documentos · tamaño cifrado
                            </p>
                        </template>

                        <ul class="guarantees">
                            <li>
                                <AppIcon name="lock" />
                                Cifrado AES-256-GCM en tu navegador
                            </li>
                            <li>
                                <AppIcon name="key" />
                                Firma digital RSA-PSS del propietario
                            </li>
                            <li>
                                <AppIcon name="shield-check" />
                                Integridad verificada en cada descarga
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>

        <!-- Resultado de la última verificación -->
        <div v-if="verification" class="verification mb-4" role="status">
            <span class="verification-icon">
                <AppIcon name="shield-check" />
            </span>

            <div class="flex-grow-1 min-w-0">
                <h2 class="verification-title">Documento verificado</h2>
                <p class="mb-2">
                    «{{ verification.name }}» se ha descargado después de comprobar:
                </p>
                <ul class="check-list">
                    <li>
                        <AppIcon name="check" />
                        La identidad del propietario ({{ verification.ownerEmail }}), certificada por el banco.
                    </li>
                    <li>
                        <AppIcon name="check" />
                        Su firma digital {{ verification.signatureAlgorithm }} sobre el documento cifrado.
                    </li>
                    <li>
                        <AppIcon name="check" />
                        La clave AES, protegida con {{ verification.keyAlgorithm }}, y su compromiso.
                    </li>
                    <li>
                        <AppIcon name="check" />
                        La integridad del contenido y de los metadatos ({{ verification.cipher }}).
                    </li>
                </ul>
                <div class="hash">SHA-256: {{ verification.sha256 }}</div>
            </div>

            <button type="button" class="btn-close" aria-label="Cerrar" @click="verification = null"></button>
        </div>

        <div v-if="actionError" class="alert alert-danger d-flex gap-2" role="alert">
            <AppIcon name="alert-circle" />
            <span class="flex-grow-1">{{ actionError }}</span>
            <button type="button" class="btn-close" aria-label="Cerrar" @click="actionError = ''"></button>
        </div>

        <!-- Listado de documentos -->
        <div class="panel">
            <div class="panel-header">
                <h2 class="panel-title">Documentos guardados</h2>
                <span v-if="!loading && documents.length" class="small text-muted">
                    {{ documents.length }} {{ documents.length === 1 ? 'documento' : 'documentos' }}
                </span>
            </div>

            <!-- Cargando documentos -->
            <div v-if="loading" class="empty-state">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
                <p class="text-muted mt-3 mb-0">Descifrando tus documentos...</p>
            </div>

            <!-- Error -->
            <div v-else-if="error" class="panel-body">
                <div class="alert alert-danger d-flex flex-wrap align-items-center gap-2 mb-0" role="alert">
                    <AppIcon name="alert-circle" />
                    <span>{{ error }}</span>
                    <button class="btn btn-outline-danger btn-sm ms-auto" @click="fetchDocuments">
                        Reintentar
                    </button>
                </div>
            </div>

            <!-- Sin documentos -->
            <div v-else-if="documents.length === 0" class="empty-state">
                <span class="empty-icon">
                    <AppIcon name="folder" />
                </span>
                <h3 class="empty-title">Todavía no tienes documentos</h3>
                <p class="empty-text">Los documentos que subas aparecerán aquí, cifrados y firmados.</p>
            </div>

            <div v-else class="table-responsive">
                <table class="table documents-table align-middle mb-0">
                    <thead>
                        <tr>
                            <th scope="col">Documento</th>
                            <th scope="col" class="d-none d-md-table-cell">Tipo</th>
                            <th scope="col" class="d-none d-lg-table-cell">Tamaño</th>
                            <th scope="col" class="d-none d-md-table-cell">Fecha de subida</th>
                            <th scope="col" class="text-end">
                                <span class="visually-hidden">Acciones</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="item in documents" :key="item.summary.id">
                            <td>
                                <div class="d-flex align-items-center gap-3">
                                    <span class="file-icon" :class="{ 'file-icon-error': !item.metadata }">
                                        <AppIcon :name="fileIcon(item)" />
                                    </span>
                                    <div class="min-w-0">
                                        <span v-if="item.metadata" class="document-name">
                                            {{ item.metadata.name }}
                                        </span>
                                        <span v-else class="document-name text-danger">
                                            No verificable: {{ item.error }}
                                        </span>
                                        <span class="document-meta d-md-none">
                                            {{ typeLabel(item.summary.type) }} ·
                                            {{ formatDate(item.summary.created_at) }}
                                        </span>
                                        <span class="document-meta document-id d-none d-md-block">
                                            {{ item.summary.id }}
                                        </span>
                                    </div>
                                </div>
                            </td>
                            <td class="d-none d-md-table-cell">
                                <span class="type-badge">{{ typeLabel(item.summary.type) }}</span>
                                <span v-if="item.summary.permission !== 'OWNER'" class="type-badge shared-badge">
                                    Compartido
                                </span>
                            </td>
                            <td class="d-none d-lg-table-cell text-nowrap amount">
                                {{ item.metadata ? formatSize(item.metadata.size) : '—' }}
                            </td>
                            <td class="d-none d-md-table-cell text-nowrap">
                                {{ formatDate(item.summary.created_at) }}
                            </td>
                            <td class="text-end text-nowrap">
                                <button type="button" class="btn btn-sm btn-outline-primary" title="Descargar"
                                    :disabled="busyId !== null" @click="downloadDocument(item)">
                                    <span v-if="busyId === item.summary.id && busyAction === 'download'"
                                        class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                                    <AppIcon v-else name="download" />
                                    <span class="action-label">Descargar</span>
                                </button>
                                <button v-if="item.summary.permission === 'OWNER'" type="button"
                                    class="btn btn-sm btn-outline-danger ms-2" title="Eliminar"
                                    :disabled="busyId !== null" @click="pendingDelete = item">
                                    <span v-if="busyId === item.summary.id && busyAction === 'delete'"
                                        class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                                    <AppIcon v-else name="trash" />
                                    <span class="action-label">Eliminar</span>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <ConfirmDialog v-if="pendingDelete" title="¿Eliminar el documento?" confirm-label="Eliminar documento"
            @confirm="deleteDocument(pendingDelete)" @cancel="pendingDelete = null">
            Se eliminará <strong class="text-break">«{{ pendingDelete.metadata?.name ?? 'este documento' }}»</strong>
            de forma permanente, junto con todas las copias de su clave. Esta acción no se puede deshacer.
        </ConfirmDialog>
    </section>
</template>

<script>
import api from '@/api/axios'
import { getIdentity, getPrivateKeys } from '@/services/keyStore'
import {
    DocumentIntegrityError,
    MAX_DOCUMENT_SIZE,
    UPLOADABLE_DOCUMENT_TYPES,
    decryptDocumentMetadata,
    encryptDocument,
    openDocument,
    signDeleteRequest
} from '@/services/documentCrypto'
import AppIcon from './AppIcon.vue'
import ConfirmDialog from './ConfirmDialog.vue'

// Los documentos de 10 MB viajan como ~14 MB en Base64.
const documentRequestTimeout = 60000

const typeLabels = {
    PERSONAL: 'Personal',
    OWNERSHIP_CERTIFICATE: 'Certificado de titularidad',
    STATEMENT: 'Extracto',
    TRANSACTION_RECEIPT: 'Justificante'
}

export default {
    name: 'UserDocuments',

    components: { AppIcon, ConfirmDialog },

    emits: ['session-expired'],

    data() {
        return {
            documents: [],
            usage: null,
            loading: false,
            error: '',

            uploadTypes: UPLOADABLE_DOCUMENT_TYPES,
            documentType: UPLOADABLE_DOCUMENT_TYPES[0],
            selectedFile: null,
            dragging: false,
            uploading: false,
            uploadStep: '',
            uploadError: '',
            uploadSuccess: '',
            uploadFingerprint: '',

            busyId: null,
            busyAction: '',
            actionError: '',
            pendingDelete: null,
            verification: null
        }
    },

    computed: {
        usagePercent() {
            if (!this.usage?.max_bytes) {
                return 0
            }

            return Math.min(100, Math.round(this.usage.used_bytes / this.usage.max_bytes * 100))
        }
    },

    mounted() {
        this.fetchDocuments()
    },

    methods: {
        // Claves privadas e identidad verificada guardadas en memoria durante el login.
        session() {
            return {
                identity: getIdentity(),
                privateKeys: getPrivateKeys()
            }
        },

        // Obtiene un mensaje para el usuario; si la sesión ha caducado, vuelve al login.
        requestErrorMessage(error, fallback) {
            if (error.response?.status === 401) {
                this.$emit('session-expired')
                return ''
            }

            return error.response?.data?.error || error.message || fallback
        },

        // Carga el listado y descifra en el navegador el nombre de cada documento.
        async fetchDocuments() {
            this.loading = true
            this.error = ''

            try {
                const response = await api.get('/documents')
                const session = this.session()

                this.usage = response.data.usage
                this.documents = await Promise.all(
                    (response.data.documents || []).map(async (summary) => {
                        try {
                            const metadata = await decryptDocumentMetadata(summary, session)
                            return { summary, metadata, error: '' }
                        } catch (error) {
                            return { summary, metadata: null, error: error.message }
                        }
                    })
                )
            } catch (error) {
                this.error = this.requestErrorMessage(error, 'No se han podido cargar tus documentos.')
            } finally {
                this.loading = false
            }
        },

        // Valida el archivo elegido en el selector o arrastrado a la zona de subida.
        selectFile(file) {
            this.selectedFile = file ?? null
            this.uploadError = ''
            this.uploadSuccess = ''

            if (this.selectedFile && this.selectedFile.size > MAX_DOCUMENT_SIZE) {
                this.uploadError = 'El documento supera el tamaño máximo de 10 MB.'
                this.selectedFile = null
                this.$refs.fileInput.value = ''
            }
        },

        dropFile(event) {
            this.dragging = false
            if (!this.uploading) {
                this.selectFile(event.dataTransfer.files?.[0])
            }
        },

        // Cifra y firma el documento en el navegador y envía solo datos cifrados.
        async uploadDocument() {
            if (this.uploading || !this.selectedFile) {
                return
            }

            this.uploading = true
            this.uploadError = ''
            this.uploadSuccess = ''

            try {
                this.uploadStep = 'Cifrando y firmando...'
                const { payload, fingerprint } = await encryptDocument(
                    this.selectedFile,
                    this.documentType,
                    this.session()
                )

                this.uploadStep = 'Subiendo...'
                await api.post('/documents', payload, { timeout: documentRequestTimeout })

                this.uploadSuccess = `«${this.selectedFile.name}» se ha cifrado y guardado.`
                this.uploadFingerprint = fingerprint
                this.selectedFile = null
                this.$refs.fileInput.value = ''

                await this.fetchDocuments()
            } catch (error) {
                this.uploadError = this.requestErrorMessage(error, 'No se ha podido subir el documento.')
            } finally {
                this.uploading = false
                this.uploadStep = ''
            }
        },

        // Descarga, verifica y descifra el documento antes de entregarlo al usuario.
        async downloadDocument(item) {
            if (this.busyId !== null) {
                return
            }

            this.busyId = item.summary.id
            this.busyAction = 'download'
            this.actionError = ''
            this.verification = null

            try {
                const response = await api.get(`/documents/${item.summary.id}`, {
                    timeout: documentRequestTimeout
                })
                const { content, metadata, verification } = await openDocument(
                    item.summary.id,
                    response.data.document,
                    this.session()
                )

                this.saveFile(content, metadata.name)
                content.fill(0)
                this.verification = { name: metadata.name, ...verification }
            } catch (error) {
                this.actionError = error instanceof DocumentIntegrityError
                    ? `Verificación fallida: ${error.message}. El documento no se ha descargado.`
                    : this.requestErrorMessage(error, 'No se ha podido descargar el documento.')
            } finally {
                this.busyId = null
                this.busyAction = ''
            }
        },

        // Entrega el archivo como descarga. application/octet-stream impide que el
        // navegador interprete un HTML o SVG malicioso con el origen de la aplicación.
        saveFile(content, name) {
            const url = URL.createObjectURL(new Blob([content], { type: 'application/octet-stream' }))
            const link = document.createElement('a')

            link.href = url
            link.download = name
            link.rel = 'noopener'
            document.body.appendChild(link)
            link.click()
            link.remove()
            setTimeout(() => URL.revokeObjectURL(url), 1000)
        },

        // Elimina el documento (ya confirmado) y, con él, todas las copias envueltas de su clave.
        async deleteDocument(item) {
            this.pendingDelete = null
            if (this.busyId !== null) {
                return
            }

            this.busyId = item.summary.id
            this.busyAction = 'delete'
            this.actionError = ''
            this.verification = null

            try {
                await api.delete(`/documents/${item.summary.id}`, {
                    headers: await signDeleteRequest(item.summary.id, this.session())
                })
                await this.fetchDocuments()
            } catch (error) {
                this.actionError = this.requestErrorMessage(error, 'No se ha podido eliminar el documento.')
            } finally {
                this.busyId = null
                this.busyAction = ''
            }
        },

        typeLabel(type) {
            return typeLabels[type] || type
        },

        fileIcon(item) {
            if (!item.metadata) {
                return 'alert'
            }

            return item.metadata.mime.startsWith('image/') ? 'image' : 'file-text'
        },

        formatSize(bytes) {
            if (!Number.isFinite(bytes)) {
                return '—'
            }

            const units = ['B', 'KB', 'MB', 'GB']
            let value = bytes
            let unit = 0
            while (value >= 1024 && unit < units.length - 1) {
                value /= 1024
                unit++
            }

            return `${value.toLocaleString('es-ES', { maximumFractionDigits: unit === 0 ? 0 : 1 })} ${units[unit]}`
        },

        formatDate(date) {
            const parsedDate = new Date(date)
            if (Number.isNaN(parsedDate.getTime())) {
                return 'No disponible'
            }

            return parsedDate.toLocaleString('es-ES', {
                dateStyle: 'medium',
                timeStyle: 'short'
            })
        }
    }
}
</script>

<style scoped>
.min-w-0 {
    min-width: 0;
}

/* Zona de subida */
.dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 1.75rem 1rem;
    border: 2px dashed var(--sb-border-strong);
    border-radius: var(--sb-radius);
    text-align: center;
    background-color: var(--sb-surface-muted);
    cursor: pointer;
    transition: border-color 0.15s ease, background-color 0.15s ease;
}

/* Los hijos no reciben eventos: así dragleave solo salta al salir de la zona. */
.dropzone > * {
    pointer-events: none;
}

.dropzone:hover,
.dropzone.dragging {
    border-color: var(--sb-blue-600);
    background-color: #eef4fb;
}

.dropzone:focus-within {
    outline: 2px solid var(--sb-blue-600);
    outline-offset: 2px;
}

.dropzone.has-file {
    border-style: solid;
    border-color: var(--sb-navy-700);
    background-color: #eef4fb;
}

.dropzone.disabled {
    opacity: 0.65;
    cursor: not-allowed;
}

.dropzone-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    margin-bottom: 0.5rem;
    border-radius: 50%;
    font-size: 1.25rem;
    color: var(--sb-navy-800);
    background-color: #e1e9f3;
}

.dropzone-title {
    font-weight: 600;
    color: var(--sb-navy-900);
}

.dropzone-link {
    color: var(--sb-blue-600);
    text-decoration: underline;
}

.dropzone-hint {
    font-size: 0.8125rem;
    color: var(--sb-muted);
}

.upload-button {
    min-height: 2.75rem;
}

.hash {
    margin-top: 0.25rem;
    font-family: var(--bs-font-monospace);
    font-size: 0.75rem;
    overflow-wrap: anywhere;
}

/* Espacio y garantías */
.storage-used {
    margin-bottom: 0.5rem;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--sb-navy-900);
}

.storage-total {
    margin-left: 0.375rem;
    font-size: 0.9375rem;
    font-weight: 400;
    color: var(--sb-muted);
}

.guarantees {
    display: grid;
    gap: 0.75rem;
    margin: 1.25rem 0 0;
    padding: 1.25rem 0 0;
    border-top: 1px solid var(--sb-border);
    list-style: none;
    font-size: 0.875rem;
}

.guarantees li {
    display: flex;
    align-items: center;
    gap: 0.625rem;
}

.guarantees :deep(.app-icon) {
    color: var(--sb-navy-700);
}

/* Verificación */
.verification {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1.25rem;
    border: 1px solid #b7dfc8;
    border-left: 4px solid var(--sb-success);
    border-radius: var(--sb-radius);
    background-color: #f2faf5;
}

.verification-icon {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    font-size: 1.25rem;
    color: var(--sb-success);
    background-color: var(--sb-success-bg);
}

.verification-title {
    margin-bottom: 0.25rem;
    font-size: 1rem;
    font-weight: 600;
    color: var(--sb-success);
}

.check-list {
    display: grid;
    gap: 0.375rem;
    margin: 0 0 0.75rem;
    padding: 0;
    list-style: none;
    font-size: 0.875rem;
}

.check-list li {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
}

.check-list :deep(.app-icon) {
    margin-top: 0.125rem;
    color: var(--sb-success);
}

/* Listado */
.documents-table {
    --bs-table-hover-bg: var(--sb-surface-muted);
}

.documents-table thead th {
    padding: 0.75rem 1.25rem;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--sb-muted);
    background-color: var(--sb-surface-muted);
}

.documents-table td {
    padding: 0.875rem 1.25rem;
}

.documents-table tbody tr:last-child td {
    border-bottom: 0;
}

.file-icon {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.5rem;
    font-size: 1.125rem;
    color: var(--sb-navy-800);
    background-color: #e8eef5;
}

.file-icon-error {
    color: var(--sb-danger);
    background-color: var(--sb-danger-bg);
}

.document-name {
    display: block;
    font-weight: 600;
    color: var(--sb-navy-900);
    overflow-wrap: anywhere;
}

.document-meta {
    display: block;
    font-size: 0.8125rem;
    color: var(--sb-muted);
}

.document-id {
    font-family: var(--bs-font-monospace);
    font-size: 0.75rem;
}

.type-badge {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    border: 1px solid var(--sb-border);
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--sb-navy-800);
    background-color: var(--sb-surface-muted);
}

.shared-badge {
    margin-left: 0.25rem;
    color: var(--sb-blue-600);
    background-color: #eaf1fb;
}

.action-label {
    display: none;
    margin-left: 0.375rem;
}

@media (min-width: 576px) {
    .action-label {
        display: inline;
    }
}
</style>
