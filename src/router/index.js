import { createRouter, createWebHashHistory } from 'vue-router'
import a_start from '../modules/onboard/a_start.vue'
import b_name from '../modules/onboard/b_name.vue'
import c_workspace from '../modules/onboard/c_workspace.vue'

const routes = [
  {
    path: '/',
    name: 'astart',
    component: a_start,
  },
  {
    path: '/b_name',
    name: 'bname',
    component: b_name,
  },
  {
    path: '/c_workspace',
    name: 'cworkspace',
    component: c_workspace,
  },
  {
    path: '/c_workspace',
    name: 'cworkspace',
    component: c_workspace,
  },
  {
    path: '/apikeys',
    name: 'ApiKeys',
    component: () => import('../views/ApiKeys.vue'), // Ensure this path is correct
  },
  {
    path: '/workspace',
    name: 'Workspace',
    component: () => import('../views/Workspace.vue'),
  },
  {
    path: '/workspaces',
    name: 'Workspaces',
    component: () => import('../views/AllWorkspaces.vue'), // Ensure this path is correct
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/Profile.vue'), // Ensure this path is correct
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
