<template>
  <div class="hero flex flex-col justify-center">
    <div class="back absolute top-[50px] left-1/2 transform -translate-x-1/2">
      <div class="cursor-pointer" @click="nav('/')">
        <img :src="arrowBack" alt="arrow-back" class="h-[30px] hover-scale" />
      </div>
    </div>

    <div class="instruct mt-[300px] text-xl opacity-70">
      Hi there, what's your name?
    </div>


  <div class="enter-username mt-14 w-full flex justify-center">
    <div class="animated-border">
      <input
        type="text"
        v-model="username"
        class="my-cool-input input border border-primary focus:outline-none text-4xl text-center playwrite font-thin p-10 pb-10"
        placeholder=""
        @input="onInput"
        @keydown.enter.prevent="handleNavigation"
        autofocus
      />
    </div>
    </div>


    <div class="cta absolute bottom-[80px]">
      <div
        v-if="username && username.length >= 2"
        class="cursor-pointer"
        @click="handleNavigation"
      >
        <img :src="arrowRight" alt="arrow-right" class="h-[50px] hover-scale" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import arrowBack from '@/assets/img/ar-back.svg';
import arrowRight from '@/assets/img/ar-next.svg';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'vue3-toastify';
import { db } from '@/db/db';
import { UserModel } from '@/models/UserModel';

const router = useRouter();
const username = ref('');

const nav = (path) => {
  router.push(path);
};

onMounted(async () => {
  const savedUsername = localStorage.getItem('username');
  const savedUUID = localStorage.getItem('userUUID');


  if (savedUsername && savedUUID) {
    // Verify user exists in DexieDB
    const existingUser = await db.users
      .where('name')
      .equals(savedUsername)
      .first();

    if (existingUser && existingUser.id.toString() === savedUUID) {
      username.value = savedUsername;
      // User verified, redirect to workspace name
      router.push('/c_workspace');
    } else {
      // Clear invalid storage data
      localStorage.removeItem('username');
      localStorage.removeItem('userUUID');
    }
  }
});

const onInput = () => {
  username.value = username.value.trim();
};

const saveUsername = async (name) => {
  try {
    // Create user object
    const userData = {
      name,
      role: 'user',
      email: '', // Will be collected later
      createdAt: new Date(),
    };

    // Save to DexieDB
    const userId = await db.users.add(userData);

    // Save to localStorage for session management
    localStorage.setItem('username', name);
    localStorage.setItem('userUUID', userId.toString());

    return true;
  } catch (error) {
    toast('Error saving username: ' + error.message, {
      theme: 'auto',
      type: 'error',
      position: 'top-center',
      autoClose: 800,
      transition: 'slide',
    });
    return false;
  }
};

const handleNavigation = async () => {
  if (!username.value || username.value.length < 2) {
    toast('Please enter a valid name (minimum 2 characters)', {
      theme: 'auto',
      type: 'error',
      position: 'top-center',
      autoClose: 2000,
      transition: 'slide',
    });
    return;
  }

  // Check if username already exists
  const existingUser = await db.users
    .where('name')
    .equals(username.value)
    .first();
  if (existingUser) {
    toast('This username is already taken', {
      theme: 'auto',
      type: 'error',
      position: 'bottom-center',
      autoClose: 2000,
      transition: 'slide',
    });
    return;
  }

  const saved = await saveUsername(username.value);
  if (saved) {
    toast('Welcome ' + username.value + '!', {
      theme: 'auto',
      type: 'success',
      position: 'bottom-center',
      autoClose: 800,
      transition: 'slide',
    });
    setTimeout(() => {
      nav('/c_workspace');
    }, 1000);
  }
};
</script>

<style scoped>
.dice-image {
  transition: transform 0.5s cubic-bezier(0.6, 0.04, 0.98, 0.335);
}

.spinning {
  animation: spin 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg) scale(1);
  }
  50% {
    transform: rotate(180deg) scale(1.3);
  }
  100% {
    transform: rotate(360deg) scale(1);
  }
}
</style>
