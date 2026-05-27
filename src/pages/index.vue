<script setup lang="ts">
import { ref, onMounted } from 'vue';
import TypeIt from 'typeit';
import { ElCard, ElMessage } from 'element-plus';

const typeitElement = ref(null);
const modpackUrl = `${window.location.origin}/files/mcmtrdy.zip`;
const mcServerUrl = 'mcmtrdy.codegang.top';

onMounted(() => {
  new TypeIt(typeitElement.value!, {
    strings: ['欢迎你', '这里是珲日青MC服务器'],
    speed: 100,
    loop: true,
    breakLines: false,
  }).pause(200).go();
});

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success('链接已复制到剪贴板');
  } catch {
    ElMessage.error('复制失败，请手动复制');
  }
};
</script>

<template>
  <h1 ref="typeitElement" style="text-align: center; height: 100px;"></h1>
  <ElCard class="custom-card">
    <span>整合包下载：</span>
    <el-link :href="modpackUrl" target="_blank" type="primary">{{ modpackUrl }}</el-link>
  </ElCard>
  <el-card class="custom-card">
    <span>服务器地址：</span>
    <el-link type="primary" @click="copyToClipboard(mcServerUrl)">{{ mcServerUrl }}</el-link>
  </el-card>
  <el-card class="custom-card">
    <h2>使用教程</h2>
3
  </el-card>
</template>

<style scoped>
.custom-card {
  margin-top: 20px;
  border-radius: 12px; /* 圆角大小 */
  overflow: hidden;   /* 可选，确保内容也跟随圆角裁剪，如图片等 */
}
</style>