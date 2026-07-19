<script setup lang="ts">
import {onMounted} from "vue";
import {useAuthStore} from "@/store";

const authStore = useAuthStore()

</script>

<template>
  <el-card class="box-card">
    <el-avatar v-if="authStore.user?.avatar" :size="256" :src="authStore.user.avatar" />
  </el-card>

</template>

<style scoped>

</style>