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

  // Las claves privadas solo viven en memoria: tras recargar la página, el token
  // de la sesión anterior ya no sirve para descifrar nada y se descarta.
  created() {
    localStorage.removeItem('token')
  },

  methods: {
    // Cierra la sesión y elimina de memoria las claves privadas y el token.
    handleLogout() {
      clearSession()
      localStorage.removeItem('token')
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
