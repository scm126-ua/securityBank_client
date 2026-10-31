<template>
    <svg class="app-icon" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
        <path v-for="(d, index) in icons[name]" :key="index" :d="d" />
    </svg>
</template>

<script>
// Trazos de un círculo y de un rectángulo redondeado como datos de <path>.
const circle = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`
const rect = (x, y, w, h, r) =>
    `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}` +
    `h${2 * r - w}a${r} ${r} 0 0 1 ${-r} ${-r}v${2 * r - h}a${r} ${r} 0 0 1 ${r} ${-r}z`

const shield = 'M12 3l7.5 3v5.5c0 4.6-3.2 8.4-7.5 9.5-4.3-1.1-7.5-4.9-7.5-9.5V6z'
const file = 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z'

// Iconos de trazo dibujados con <path>: no se usa v-html porque la CSP exige Trusted Types.
const icons = {
    'alert': ['M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z', 'M12 9v4', 'M12 17h.01'],
    'alert-circle': [circle(12, 12, 9), 'M12 8v4', 'M12 16h.01'],
    'arrow-left': ['M19 12H5', 'M12 19l-7-7 7-7'],
    'bank': ['M3 10l9-6 9 6z', 'M5.5 10v7.5', 'M10 10v7.5', 'M14 10v7.5', 'M18.5 10v7.5', 'M3.5 17.5h17', 'M2.5 21h19'],
    'check': ['M20 6L9 17l-5-5'],
    'check-circle': [circle(12, 12, 9), 'M8.5 12.5l2.5 2.5 4.5-5'],
    'chevron-right': ['M9 6l6 6-6 6'],
    'circle': [circle(12, 12, 9)],
    'copy': [rect(9, 9, 12, 12, 2), 'M5 15h-.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5'],
    'download': ['M12 3v12', 'M7 10l5 5 5-5', 'M5 21h14'],
    'eye': ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z', circle(12, 12, 3)],
    'eye-off': ['M3 3l18 18', 'M10.6 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.2 3.2',
        'M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7c1.9 0 3.6-.6 5-1.5', 'M9.9 9.9a3 3 0 0 0 4.2 4.2'],
    'file-check': [file, 'M14 3v5h5', 'M9 15l2 2 4-4'],
    'file-text': [file, 'M14 3v5h5', 'M9 13h6', 'M9 17h6'],
    'folder': ['M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'],
    'image': [rect(3, 3, 18, 18, 2), circle(9, 9, 2), 'M21 15l-5-5L5 21'],
    'info': [circle(12, 12, 9), 'M12 16v-4', 'M12 8h.01'],
    'key': [circle(7.5, 15.5, 5.5), 'M21 2l-9.6 9.6', 'M15.5 7.5l3 3L22 7l-3-3'],
    'lock': [rect(5, 11, 14, 10, 2), 'M8 11V7a4 4 0 0 1 8 0v4'],
    'logout': ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
    'plus': ['M12 5v14', 'M5 12h14'],
    'shield': [shield],
    'shield-check': [shield, 'M9 12l2 2 4-4'],
    'transfer': ['M4 8h15', 'M15 4l4 4-4 4', 'M20 16H5', 'M9 12l-4 4 4 4'],
    'trash': ['M3 6h18', 'M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6',
        'M18.5 6l-.9 13.1a2 2 0 0 1-2 1.9H8.4a2 2 0 0 1-2-1.9L5.5 6', 'M10 11v6', 'M14 11v6'],
    'upload': ['M12 15V3', 'M7 8l5-5 5 5', 'M5 21h14'],
    'x-circle': [circle(12, 12, 9), 'M15 9l-6 6', 'M9 9l6 6']
}

export default {
    name: 'AppIcon',

    props: {
        name: {
            type: String,
            required: true
        },
        size: {
            type: String,
            default: '1.25em'
        }
    },

    data() {
        return { icons }
    }
}
</script>

<style scoped>
.app-icon {
    flex-shrink: 0;
    vertical-align: -0.25em;
}
</style>
