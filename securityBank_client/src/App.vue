<template>
  <header>
    <div class="wrapper">
      <div v-if="!isAuthenticated">
        <LoginScreen @login-success="handleLoginSuccess" />
      </div>
      <div v-else>
        <UserDocuments v-if="showDocuments" @back="showDocuments = false" @session-expired="handleLogout" />

        <UserAccounts v-else-if="!selectedAccount" @select-account="handleSelectAccount"
          @open-documents="showDocuments = true" @logout="handleLogout" />

        <SecurityBankMainView v-else :selectedAccount="selectedAccount"
          @back-to-accounts="handleReturnToAccounts" @account-closed="handleReturnToAccounts" />
      </div>
    </div>
  </header>
</template>


<script>
import LoginScreen from './components/LoginScreen.vue';
import SecurityBankMainView from './components/SecurityBankMainView.vue';
import UserAccounts from './components/UserAccounts.vue';
import UserDocuments from './components/UserDocuments.vue';
import api from './api/axios';
import { clearSession } from './services/keyStore';

// Tras 15 minutos sin actividad se cierra la sesión y se borran las claves de memoria.
const inactivityTimeout = 15 * 60 * 1000
const activityEvents = ['pointerdown', 'pointermove', 'keydown', 'wheel']

export default {

  // Componentes importados
  components: {
    LoginScreen,
    UserAccounts,
    SecurityBankMainView,
    UserDocuments
  },

  // Datos de la propia plantilla
  data() {
    return {
      isAuthenticated: false,
      selectedAccount: null,
      showDocuments: false
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
        this.inactivityTimer = setTimeout(this.handleLogout, inactivityTimeout)
      }
    },

    // Cierra la sesión y elimina de memoria las claves privadas.
    handleLogout() {
      clearTimeout(this.inactivityTimer)
      clearSession()
      this.revokeSession()
      this.selectedAccount = null
      this.showDocuments = false
      this.isAuthenticated = false
    },

    handleLoginSuccess() {
      this.isAuthenticated = true;
      this.resetInactivityTimer()
    },

    handleSelectAccount(account) {
      console.log("EN handle", account)
      this.selectedAccount = account
    },

    // Vuelve al listado para cargar de nuevo las cuentas del usuario.
    handleReturnToAccounts() {
      this.selectedAccount = null
    }
  }






}


</script>

<style scoped></style>
