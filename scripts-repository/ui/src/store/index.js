import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    progress: {
      enabled: false,
      title: ''
    },
    statusDialog: {
      width: '500px',
      enable: false,
      color: 'error',
      icon: 'mdi-alert-circle-outline',
      title: '',
      description: ''
    }
  },
  mutations: {
  },
  actions: {
  },
  modules: {
  }
})
