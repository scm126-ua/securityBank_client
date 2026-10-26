<template>
  <header>
    <div class="wrapper">
      <div v-if="!isAuthenticated">
        <LoginScreen @login-success="handleLoginSuccess" />
      </div>
      <div v-else>
        <UserAccounts />
      </div>
    </div>
  </header>
</template>


<script>
import LoginScreen from './components/LoginScreen.vue';
import UserAccounts from './components/UserAccounts.vue';


export default {

  // Componentes importados
  components: {
    LoginScreen,
    UserAccounts
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
