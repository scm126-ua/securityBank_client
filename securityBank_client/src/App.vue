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

  methods: {
    // Revoca el token en el servidor y borra la cookie de sesión.
    revokeSession() {
      api.post('/logout').catch(() => {})
    },

    // Cierra la sesión y elimina de memoria las claves privadas.
    handleLogout() {
      clearSession()
      this.revokeSession()
      this.selectedAccount = null
      this.showDocuments = false
      this.isAuthenticated = false
    },

    handleLoginSuccess() {
      this.isAuthenticated = true;
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
