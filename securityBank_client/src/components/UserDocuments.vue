<template>
    <div class="container mt-4 mb-5">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
            <div>
                <h4 class="fw-bold mb-1">Mis documentos</h4>
                <p class="text-muted mb-0">
                    Se cifran en tu navegador: el banco no puede ver ni su contenido ni su nombre.
                </p>
            </div>

            <button type="button" class="btn btn-outline-secondary" @click="$emit('back')">
                &larr; Volver a mis cuentas
            </button>
        </div>

        <!-- Subida -->
        <div class="card border-0 shadow-sm mb-4">
            <div class="card-body p-4">
                <h5 class="fw-bold mb-3">Subir un documento</h5>

                <form class="row g-3 align-items-end" @submit.prevent="uploadDocument">
                    <div class="col-12 col-lg-6">
                        <label for="documentFile" class="form-label fw-semibold">
                            Archivo PDF, PNG, JPEG o JSON (máximo 10 MB)
                        </label>
                        <input id="documentFile" ref="fileInput" type="file" class="form-control"
                            accept=".pdf,.png,.jpg,.jpeg,.json" :disabled="uploading" @change="selectFile" />
                    </div>

                    <div class="col-12 col-md-6 col-lg-3">
                        <label for="documentType" class="form-label fw-semibold">Tipo</label>
                        <select id="documentType" v-model="documentType" class="form-select" :disabled="uploading">
                            <option v-for="type in uploadTypes" :key="type" :value="type">
                                {{ typeLabel(type) }}
                            </option>
                        </select>
                    </div>

                    <div class="col-12 col-md-6 col-lg-3">
                        <button type="submit" class="btn btn-primary w-100" :disabled="uploading || !selectedFile">
                            <span v-if="uploading" class="spinner-border spinner-border-sm me-2"
                                aria-hidden="true"></span>
                            {{ uploading ? uploadStep : 'Cifrar y subir' }}
                        </button>
                    </div>
                </form>

                <div v-if="uploadError" class="alert alert-danger mt-3 mb-0" role="alert">
                    {{ uploadError }}
                </div>

                <div v-if="uploadSuccess" class="alert alert-success mt-3 mb-0" role="status">
                    {{ uploadSuccess }}
                    <div class="small font-monospace text-break mt-1">
                        SHA-256 del original: {{ uploadFingerprint }}
                    </div>
                </div>

                <div v-if="usage" class="mt-4">
                    <div class="d-flex flex-wrap justify-content-between small text-muted mb-1">
                        <span>{{ usage.documents }} de {{ usage.max_documents }} documentos</span>
                        <span>{{ formatSize(usage.used_bytes) }} de {{ formatSize(usage.max_bytes) }} (cifrados)</span>
                    </div>
                    <div class="progress" role="progressbar" aria-label="Espacio ocupado"
                        :aria-valuenow="usagePercent" aria-valuemin="0" aria-valuemax="100">
                        <div class="progress-bar" :style="{ width: usagePercent + '%' }"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Resultado de la última verificación -->
        <div v-if="verification" class="alert alert-success d-flex justify-content-between gap-3" role="status">
            <div>
                <p class="fw-semibold mb-2">
                    «{{ verification.name }}» se ha descargado después de comprobar:
                </p>
                <ul class="small mb-2">
                    <li>La identidad del propietario ({{ verification.ownerEmail }}), certificada por el banco.</li>
                    <li>Su firma digital {{ verification.signatureAlgorithm }} sobre el documento cifrado.</li>
                    <li>La clave AES, protegida con {{ verification.keyAlgorithm }}, y su compromiso.</li>
                    <li>La integridad del contenido y de los metadatos ({{ verification.cipher }}).</li>
                </ul>
                <div class="small font-monospace text-break">SHA-256: {{ verification.sha256 }}</div>
            </div>
            <button type="button" class="btn-close" aria-label="Cerrar" @click="verification = null"></button>
        </div>

        <div v-if="actionError" class="alert alert-danger d-flex justify-content-between gap-3" role="alert">
            <span>{{ actionError }}</span>
            <button type="button" class="btn-close" aria-label="Cerrar" @click="actionError = ''"></button>
        </div>

        <!-- Cargando documentos -->
        <div v-if="loading" class="text-center py-5">
            <div class="spinner-border" style="color: #163b65" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
            <p class="text-muted mt-3">Descifrando tus documentos...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="alert alert-danger" role="alert">
            {{ error }}

            <button class="btn btn-outline-danger btn-sm ms-2" @click="fetchDocuments">
                Reintentar
            </button>
        </div>

        <!-- Sin documentos -->
        <div v-else-if="documents.length === 0" class="card border-0 shadow-sm">
            <div class="card-body text-center py-5">
                <h5 class="fw-bold">Todavía no tienes documentos</h5>
                <p class="text-muted mb-0">
                    Los documentos que subas aparecerán aquí.
                </p>
            </div>
        </div>

        <!-- Listado de documentos -->
        <div v-else class="card border-0 shadow-sm">
            <div class="table-responsive">
                <table class="table align-middle mb-0">
                    <thead class="table-light">
                        <tr>
                            <th scope="col">Documento</th>
                            <th scope="col">Tipo</th>
                            <th scope="col">Tamaño</th>
                            <th scope="col">Subido</th>
                            <th scope="col" class="text-end">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="item in documents" :key="item.summary.id">
                            <td>
                                <span v-if="item.metadata" class="fw-semibold text-break">
                                    {{ item.metadata.name }}
                                </span>
                                <span v-else class="fw-semibold text-danger">
                                    No verificable: {{ item.error }}
                                </span>
                                <div class="small text-muted font-monospace">{{ item.summary.id }}</div>
                            </td>
                            <td>
                                <span class="badge text-bg-light border">{{ typeLabel(item.summary.type) }}</span>
                                <span v-if="item.summary.permission !== 'OWNER'" class="badge text-bg-info ms-1">
                                    Compartido
                                </span>
                            </td>
                            <td class="text-nowrap">
                                {{ item.metadata ? formatSize(item.metadata.size) : '—' }}
                            </td>
                            <td class="text-nowrap">{{ formatDate(item.summary.created_at) }}</td>
                            <td class="text-end text-nowrap">
                                <button type="button" class="btn btn-sm btn-outline-primary me-2"
                                    :disabled="busyId !== null" @click="downloadDocument(item)">
                                    <span v-if="busyId === item.summary.id && busyAction === 'download'"
                                        class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
                                    Descargar
                                </button>
                                <button v-if="item.summary.permission === 'OWNER'" type="button"
                                    class="btn btn-sm btn-outline-danger" :disabled="busyId !== null"
                                    @click="deleteDocument(item)">
                                    <span v-if="busyId === item.summary.id && busyAction === 'delete'"
                                        class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
                                    Eliminar
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
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

    emits: ['back', 'session-expired'],

    data() {
        return {
            documents: [],
            usage: null,
            loading: false,
            error: '',

            uploadTypes: UPLOADABLE_DOCUMENT_TYPES,
            documentType: UPLOADABLE_DOCUMENT_TYPES[0],
            selectedFile: null,
            uploading: false,
            uploadStep: '',
            uploadError: '',
            uploadSuccess: '',
            uploadFingerprint: '',

            busyId: null,
            busyAction: '',
            actionError: '',
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

        selectFile(event) {
            this.selectedFile = event.target.files?.[0] ?? null
            this.uploadError = ''
            this.uploadSuccess = ''

            if (this.selectedFile && this.selectedFile.size > MAX_DOCUMENT_SIZE) {
                this.uploadError = 'El documento supera el tamaño máximo de 10 MB.'
                this.selectedFile = null
                event.target.value = ''
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

        // Elimina el documento y, con él, todas las copias envueltas de su clave.
        async deleteDocument(item) {
            const name = item.metadata?.name ?? 'este documento'
            if (this.busyId !== null ||
                !window.confirm(`Se eliminará «${name}» de forma permanente. ¿Deseas continuar?`)) {
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
.btn-primary {
    background-color: #163b65;
    border-color: #163b65;
}

.btn-primary:hover {
    background-color: #0f2d4d;
    border-color: #0f2d4d;
}

.btn-outline-primary {
    color: #163b65;
    border-color: #163b65;
}

.btn-outline-primary:hover {
    background-color: #163b65;
    border-color: #163b65;
    color: white;
}

.progress-bar {
    background-color: #2878c8;
}

.card {
    border-radius: 12px;
    overflow: hidden;
}
</style>
