<template>
  <header>
    <div class="wrapper">
      <div v-if="!isAuthenticated">
        <LoginScreen @login-success="handleLoginSuccess" />
      </div>
      <div v-else>
        <SecurityBankMainView />
      </div>
    </div>
  </header>
</template>


<script>
import LoginScreen from './components/LoginScreen.vue';
import SecurityBankMainView from './components/SecurityBankMainView.vue';


export default {

  // Componentes importados
  components: {
    LoginScreen,
    SecurityBankMainView
  },

  // Datos de la propia plantilla
  data() {
    return {
      isAuthenticated: false
    }
  },

  methods: {
    handleLoginSuccess() {
      this.isAuthenticated = true;
    }
  }






}


</script>

<style scoped></style>
