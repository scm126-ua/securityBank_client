<template>
  <LoginScreen v-if="!isAuthenticated" :notice="logoutNotice" @login-success="handleLoginSuccess" />

  <div v-else class="app-shell">
    <header class="app-header">
      <div class="container header-content">
        <a href="#" class="brand" @click.prevent="openAccounts">
          <span class="brand-mark">
            <AppIcon name="shield-check" />
          </span>
          <span class="brand-name">SecurityBank</span>
        </a>

        <nav class="app-nav" aria-label="Navegación principal">
          <button v-for="item in sections" :key="item.id" type="button" class="nav-item"
            :class="{ active: section === item.id }" :aria-current="section === item.id ? 'page' : null"
            @click="openSection(item.id)">
            {{ item.label }}
          </button>
        </nav>

        <div class="user-area">
          <div class="user-info">
            <span class="user-name">{{ user.name }}</span>
            <span class="user-email">{{ user.email }}</span>
          </div>
          <span class="avatar" aria-hidden="true">{{ userInitials }}</span>
          <button type="button" class="btn btn-logout" title="Cerrar sesión" @click="handleLogout()">
            <AppIcon name="logout" />
            <span class="logout-label">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </header>

    <main class="container app-main">
      <UserDocuments v-if="section === 'documents'" @session-expired="handleLogout('expired')" />

      <UserSecurity v-else-if="section === 'security'" />

      <UserAccounts v-else-if="!selectedAccount" @select-account="handleSelectAccount" />

      <SecurityBankMainView v-else :selectedAccount="selectedAccount"
        @back-to-accounts="handleReturnToAccounts" @account-closed="handleReturnToAccounts" />
    </main>

    <footer class="app-footer">
      <div class="container footer-content">
        <span>
          <AppIcon name="lock" class="me-1" />
          Conexión cifrada. Tus claves privadas solo existen en este navegador.
        </span>
        <span>Por seguridad, la sesión se cierra tras 15 minutos de inactividad.</span>
      </div>
    </footer>
  </div>
</template>


<script>
import AppIcon from './components/AppIcon.vue';
import LoginScreen from './components/LoginScreen.vue';
import SecurityBankMainView from './components/SecurityBankMainView.vue';
import UserAccounts from './components/UserAccounts.vue';
import UserDocuments from './components/UserDocuments.vue';
import UserSecurity from './components/UserSecurity.vue';
import api from './api/axios';
import { clearSession } from './services/keyStore';

// Tras 15 minutos sin actividad se cierra la sesión y se borran las claves de memoria.
const inactivityTimeout = 15 * 60 * 1000
const activityEvents = ['pointerdown', 'pointermove', 'keydown', 'wheel']

// Aviso que se muestra en la pantalla de acceso según el motivo del cierre de sesión.
const logoutNotices = {
  manual: 'Has cerrado la sesión de forma segura.',
  inactivity: 'Por seguridad, la sesión se ha cerrado tras 15 minutos de inactividad.',
  expired: 'Tu sesión ha caducado. Vuelve a iniciar sesión para continuar.'
}

// Secciones de la navegación principal.
const sections = [
  { id: 'accounts', label: 'Cuentas' },
  { id: 'documents', label: 'Documentos' },
  { id: 'security', label: 'Seguridad' }
]

export default {

  // Componentes importados
  components: {
    AppIcon,
    LoginScreen,
    UserAccounts,
    SecurityBankMainView,
    UserDocuments,
    UserSecurity
  },

  // Datos de la propia plantilla
  data() {
    return {
      sections,
      isAuthenticated: false,
      selectedAccount: null,
      section: 'accounts',
      user: { name: '', email: '' },
      logoutNotice: ''
    }
  },

  computed: {
    // Iniciales del nombre y del primer apellido para el avatar.
    userInitials() {
      return this.user.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0].toUpperCase())
        .join('')
    }
  },

  // Las claves privadas solo viven en memoria: tras recargar la página, la sesión
  // anterior ya no sirve para descifrar nada y se revoca en el servidor.
  created() {
    this.revokeSession()
  },

  mounted() {
    activityEvents.forEach((event) => {
      window.addEventListener(event, this.resetInactivityTimer, { passive: true })
    })
  },

  unmounted() {
    clearTimeout(this.inactivityTimer)
    activityEvents.forEach((event) => {
      window.removeEventListener(event, this.resetInactivityTimer)
    })
  },

  methods: {
    // Revoca el token en el servidor y borra la cookie de sesión.
    revokeSession() {
      api.post('/logout').catch(() => {})
    },

    // Reinicia la cuenta atrás de inactividad mientras haya una sesión abierta.
    resetInactivityTimer() {
      clearTimeout(this.inactivityTimer)
      if (this.isAuthenticated) {
        this.inactivityTimer = setTimeout(() => this.handleLogout('inactivity'), inactivityTimeout)
      }
    },

    // Cierra la sesión y elimina de memoria las claves privadas.
    handleLogout(reason = 'manual') {
      clearTimeout(this.inactivityTimer)
      clearSession()
      this.revokeSession()
      this.selectedAccount = null
      this.section = 'accounts'
      this.user = { name: '', email: '' }
      this.logoutNotice = logoutNotices[reason]
      this.isAuthenticated = false
    },

    handleLoginSuccess(data) {
      this.user = { name: data.user?.name ?? '', email: data.user?.email ?? '' }
      this.logoutNotice = ''
      this.isAuthenticated = true;
      this.resetInactivityTimer()
    },

    handleSelectAccount(account) {
      this.selectedAccount = account
    },

    // Vuelve al listado para cargar de nuevo las cuentas del usuario.
    handleReturnToAccounts() {
      this.selectedAccount = null
    },

    openAccounts() {
      this.openSection('accounts')
    },

    // Cambia de sección y, si se vuelve a Cuentas, muestra el listado.
    openSection(section) {
      this.section = section
      this.selectedAccount = null
    }
  }
}
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* Cabecera */
.app-header {
  color: #ffffff;
  background-color: var(--sb-navy-900);
  border-bottom: 3px solid var(--sb-gold-500);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 4rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  color: #ffffff;
  text-decoration: none;
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid rgb(201 165 76 / 55%);
  border-radius: 0.5rem;
  font-size: 1.25rem;
  color: var(--sb-gold-500);
  background-color: var(--sb-navy-800);
}

.brand-name {
  display: none;
  font-size: 1.125rem;
  font-weight: 600;
}

.app-nav {
  display: flex;
  align-self: stretch;
  gap: 0.25rem;
}

.nav-item {
  padding: 0 0.375rem;
  font-size: 0.875rem;
  border: 0;
  border-bottom: 3px solid transparent;
  margin-bottom: -3px;
  font-weight: 500;
  color: rgb(255 255 255 / 72%);
  background: none;
}

.nav-item:hover {
  color: #ffffff;
}

.nav-item.active {
  color: #ffffff;
  border-bottom-color: #ffffff;
}

.nav-item:focus-visible {
  outline: 2px solid var(--sb-gold-500);
  outline-offset: -4px;
}

.user-area {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: auto;
}

.user-info {
  display: none;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.25;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 600;
}

.user-email {
  max-width: 16rem;
  overflow: hidden;
  font-size: 0.75rem;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: rgb(255 255 255 / 65%);
}

.avatar {
  display: none;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--sb-navy-900);
  background-color: #dfe7f1;
}

.btn-logout {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.625rem;
  font-size: 0.875rem;
  color: #ffffff;
  border: 1px solid rgb(255 255 255 / 30%);
}

.btn-logout:hover {
  color: #ffffff;
  background-color: rgb(255 255 255 / 10%);
  border-color: rgb(255 255 255 / 50%);
}

.logout-label {
  display: none;
}

/* Cada elemento de la cabecera aparece cuando cabe junto a las tres secciones. */
@media (min-width: 576px) {
  .header-content {
    gap: 1rem;
  }

  .nav-item {
    padding: 0 0.5rem;
    font-size: 0.9375rem;
  }

  .logout-label {
    display: inline;
  }
}

@media (min-width: 768px) {
  .brand-name {
    display: inline;
  }

  .app-nav {
    margin-left: 1.5rem;
  }
}

@media (min-width: 992px) {
  .avatar {
    display: inline-flex;
  }

  .nav-item {
    padding: 0 0.875rem;
    font-size: 1rem;
  }
}

@media (min-width: 1200px) {
  .user-info {
    display: flex;
  }
}

/* Contenido y pie */
.app-main {
  flex: 1;
  padding-top: 2rem;
  padding-bottom: 3rem;
}

.app-footer {
  padding: 1.25rem 0;
  font-size: 0.8125rem;
  color: var(--sb-muted);
  border-top: 1px solid var(--sb-border);
  background-color: var(--sb-surface);
}

.footer-content {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.5rem 1.5rem;
}
</style>
