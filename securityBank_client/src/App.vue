<template>
  <header>
    <div class="wrapper">
      <div v-if="!isAuthenticated">
        <LoginScreen @login-success="handleLoginSuccess" />
      </div>
      <div v-else>
        <UserAccounts v-if="!selectedAccount" @select-account="handleSelectAccount" />

        <SecurityBankMainView v-else :selectedAccount="selectedAccount"></SecurityBankMainView>
      </div>
    </div>
  </header>
</template>


<script>
import LoginScreen from './components/LoginScreen.vue';
import SecurityBankMainView from './components/SecurityBankMainView.vue';
import UserAccounts from './components/UserAccounts.vue';


export default {

  // Componentes importados
  components: {
    LoginScreen,
    UserAccounts,
    SecurityBankMainView
  },

  // Datos de la propia plantilla
  data() {
    return {
      isAuthenticated: false,
      selectedAccount: null
    }
  },

  methods: {
    handleLoginSuccess() {
      this.isAuthenticated = true;
    },

    handleSelectAccount(account){
      console.log("EN handle", account)
      this.selectedAccount = account
    }
  }






}


</script>

<style scoped></style>
