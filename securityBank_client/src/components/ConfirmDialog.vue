<template>
    <Teleport to="body">
        <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="confirmDialogTitle"
            @click.self="$emit('cancel')" @keydown.esc="$emit('cancel')">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-body d-flex gap-3 p-4">
                        <span class="dialog-icon">
                            <AppIcon name="alert" />
                        </span>

                        <div>
                            <h2 id="confirmDialogTitle" class="dialog-title">{{ title }}</h2>
                            <div class="dialog-text">
                                <slot />
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button ref="cancelButton" type="button" class="btn btn-outline-secondary"
                            @click="$emit('cancel')">
                            Cancelar
                        </button>
                        <button type="button" class="btn btn-danger" @click="$emit('confirm')">
                            {{ confirmLabel }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-backdrop show"></div>
    </Teleport>
</template>

<script>
import AppIcon from './AppIcon.vue'

// Confirmación de acciones irreversibles. El foco empieza en "Cancelar" para que
// pulsar Intro por descuido no confirme la acción.
export default {
    name: 'ConfirmDialog',

    components: { AppIcon },

    props: {
        title: {
            type: String,
            required: true
        },
        confirmLabel: {
            type: String,
            required: true
        }
    },

    emits: ['confirm', 'cancel'],

    mounted() {
        this.$refs.cancelButton.focus()
    }
}
</script>

<style scoped>
.modal-content {
    border: 0;
    border-radius: var(--sb-radius);
    box-shadow: 0 20px 40px rgb(8 23 41 / 25%);
}

.dialog-icon {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 50%;
    font-size: 1.25rem;
    color: var(--sb-danger);
    background-color: var(--sb-danger-bg);
}

.dialog-title {
    margin: 0.5rem 0 0.5rem;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--sb-navy-900);
}

.dialog-text {
    color: var(--sb-muted);
}

.modal-footer {
    padding: 0.875rem 1.5rem;
    background-color: var(--sb-surface-muted);
    border-top-color: var(--sb-border);
}
</style>
