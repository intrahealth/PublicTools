import Vue from 'vue'
import VueRouter from 'vue-router'
import DeletePractitioner from '../views/deletePractitioner'
import SinglePhoneMultiplePract from '../views/singlePhoneMultiplePract'

Vue.use(VueRouter)

const routes = [
  {
    path: '/deletePractitioner',
    name: 'DeletePractitioner',
    component: DeletePractitioner
  },
  {
    path: '/singlePhoneMultiplePract',
    name: 'SinglePhoneMultiplePract',
    component: SinglePhoneMultiplePract
  }
]

const router = new VueRouter({
  routes
})

export default router
