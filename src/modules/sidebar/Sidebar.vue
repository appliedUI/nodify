<template>
  <div :class="['sidebar', { 'w-16': collapsed, 'w-56': !collapsed }]">
    <div class="flex flex-col h-[calc(100vh-90px)] bg-base-100 z-50 mt-[20px]">
      <!-- Subject List -->

      <!-- Tabs -->
      <div
        role="tablist"
        class="tabs tabs-bordered px-2 mt-3 flex justify-center"
      >
        <div class="tooltip tooltip-top" data-tip="Record Audio">
          <a
            role="tab"
            class="tab text-white w-12 p-0 flex items-center justify-center"
            :class="{ 'tab-active': activeTab === 'audio' }"
            @click="activeTab = 'audio'"
          >
            <MicrophoneIcon class="w-5 h-5" />
          </a>
        </div>

        <div class="tooltip tooltip-top" data-tip="YouTube Video">
          <a
            role="tab"
            class="tab text-white w-12 p-0 flex items-center justify-center"
            :class="{ 'tab-active': activeTab === 'video' }"
            @click="activeTab = 'video'"
          >
            <VideoCameraIcon class="w-5 h-5" />
          </a>
        </div>

        <div class="tooltip tooltip-top" data-tip="Meeting Recorder">
          <a
            role="tab"
            class="tab text-white w-12 p-0 flex items-center justify-center"
            :class="{ 'tab-active': activeTab === 'meeting' }"
            @click="activeTab = 'meeting'"
          >
            <UserGroupIcon class="w-5 h-5" />
          </a>
        </div>

        <div class="tooltip tooltip-top" data-tip="Import PDF">
          <a
            role="tab"
            class="tab text-white w-12 p-0 flex items-center justify-center"
            :class="{ 'tab-active': activeTab === 'pdf' }"
            @click="activeTab = 'pdf'"
          >
            <DocumentIcon class="w-5 h-5" />
          </a>
        </div>
      </div>

      <!-- Content Area -->
      <div v-if="activeTab === 'audio'" class="h-[125px]">
        <div class="h-[125px]">
          <Record />
        </div>
      </div>

      <div v-if="activeTab === 'pdf'">
        <div class="h-[125px] justify-center text-gray-500 flex items-center">
          <PDFupload />
        </div>
      </div>

      <div v-if="activeTab === 'video'">
        <div class="h-[125px]">
          <YouTubeParser />
        </div>
      </div>

      <div v-if="activeTab === 'meeting'">
        <div class="w-full">
          <Meeting />
        </div>
      </div>

      <SubjectList />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  ArrowLeftOnRectangleIcon,
  ArrowRightOnRectangleIcon,
  MicrophoneIcon,
  VideoCameraIcon,
  UserGroupIcon,
  DocumentIcon,
} from '@heroicons/vue/24/outline'
import Record from './record/Record.vue'
import Meeting from './meeting/Meeting.vue'
import SubjectList from './subjects/SubjectList.vue'
import YouTubeParser from './video/YouTubeParser.vue'
import PDFupload from './pdf/PDFupload.vue'

const collapsed = ref(false)
const activeTab = ref('audio')
const isRecording = ref(false)

const toggleSidebar = () => {
  collapsed.value = !collapsed.value
}

const toggleRecording = () => {
  isRecording.value = !isRecording.value
  console.log(isRecording.value ? 'Recording started' : 'Recording stopped')
}
</script>

<style scoped>
.sidebar {
  transition: width 0.3s ease;
  position: relative;
  z-index: 50;
}

.tab {
  border-color: rgba(244, 222, 53, 0.1) !important;
  color: rgb(148, 148, 148);
}

.tab-active {
  border-bottom: 1px solid #f48c06 !important;
  color: white;
}

.tab:hover {
  color: White;
}
</style>
