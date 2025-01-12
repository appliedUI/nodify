import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '@/db/db'
import { UserModel } from '@/models/UserModel'

export const useUserStore = defineStore('user', () => {
  const user = ref(null)

  const fetchUser = async () => {
    try {
      const userData = await db.users.get(1)
      if (userData) {
        user.value = new UserModel({
          ...userData,
          history: userData.history || []
        })
      }
      return user.value
    } catch (error) {
      console.error('Error fetching user:', error)
      throw error
    }
  }

  const updateUser = async ({ name, email }) => {
    try {
      const updates = {}
      if (name) updates.name = name
      if (email) updates.email = email

      const userData = await db.users.get(1)
      if (!userData) throw new Error('User not found')

      const updatedUser = { ...userData, ...updates }
      
      const validationErrors = UserModel.validate(updatedUser)
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '))
      }

      await db.users.update(1, updates)
      user.value = new UserModel(updatedUser)
      return user.value
    } catch (error) {
      console.error('Error updating user:', error)
      throw error
    }
  }

  const addHistoryItem = async (historyItem) => {
    try {
      const userData = await db.users.get(1)
      if (!userData) throw new Error('User not found')
      
      const history = userData.history || []
      history.push({
        ...historyItem,
        timestamp: new Date().toISOString()
      })

      await db.users.update(1, { history })
      user.value = new UserModel({ ...userData, history })
      return user.value
    } catch (error) {
      console.error('Error adding history item:', error)
      throw error
    }
  }

  return {
    user,
    fetchUser,
    updateUser,
    addHistoryItem
  }
})
