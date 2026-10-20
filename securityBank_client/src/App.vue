<template>
  <header>
    <div class="wrapper">
      <div v-if="!isAuthenticated">
        <LoginScreen />
      </div>
      <div v-else>
        <SecurityBankMainView />
      </div>
    </div>
  </header>
</template>


<script>
import LoginScreen from './components/LoginScreen.vue';


export default {

  // Componentes importados
  components: {
    LoginScreen
  },

  // Datos de la propia plantilla
  data() {
    return {
      isAuthenticated: false
    }
  }





}


</script>

<style scoped>

</style>
