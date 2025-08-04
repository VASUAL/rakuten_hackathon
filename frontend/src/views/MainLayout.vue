<template>
  <el-container class="main-layout">
    <el-header class="main-header">
      <div class="logo">防災GO！</div>
      <el-menu :default-active="activeIndex" mode="horizontal" :router="true" class="main-nav">
        <el-menu-item index="/home">商品のおすすめ</el-menu-item>
        <el-menu-item index="/map">避難マップ</el-menu-item>
        <el-menu-item index="/ebooks">防災の本</el-menu-item>
        <el-menu-item index="/quiz">知識クイズ</el-menu-item>
      </el-menu>
      <div class="user-actions">
        <span class="username">こんにちは、{{ username }}さん</span>
        <el-button type="danger" plain size="small" @click="handleLogout">ログアウト</el-button>
      </div>
    </el-header>
    <el-main class="main-content">
      <router-view/>
    </el-main>
  </el-container>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';

const router = useRouter();
const route = useRoute(); // useRoute()可以访问当前路由信息，如路径
const username = ref('用户');
const activeIndex = ref('/home'); // 用于控制菜单高亮

// 组件加载时执行
onMounted(() => {
  // 尝试从localStorage获取用户名，如果用户直接刷新页面的话
  const token = localStorage.getItem('token');
  if (token) {
    try {
      // JWT的第二部分是payload，经过base64编码，我们解码它来获取用户信息
      const payload = JSON.parse(atob(token.split('.')[1]));
      username.value = payload.username;
    } catch (e) {
      console.error("トークンの解析に失敗しました：", e);
      handleLogout(); // 解析失败则强制登出
    }
  }
  // 根据当前页面的实际路径，来设置菜单的激活项
  activeIndex.value = route.path;
});

// 监听路由变化，以便在用户点击前进后退或菜单项时，更新激活的菜单项
watch(route, (newRoute) => {
  activeIndex.value = newRoute.path;
});

const handleLogout = () => {
  localStorage.removeItem('token');
  ElMessage.success('ログアウトに成功しました');
  router.push('/login');
};
</script>

<style scoped>
.main-layout {
  height: 100vh;
  width: 100vw; /* 撑满整个视口宽度 */
  margin: 0;
  padding: 0;
}
.main-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #dcdfe6;
  background-color: #fff;
  padding: 0 20px;
}
.logo {
  font-size: 20px;
  font-weight: bold;
  color: #303133;
}
.main-nav {
  border-bottom: none;
  flex-grow: 1; /* 让菜单占据更多空间 */
  margin: 0 50px; /* 和logo以及右侧用户区保持一些距离 */
}
.user-actions {
  display: flex;
  align-items: center;
}
.username {
  margin-right: 15px;
  color: #606266;
}
.main-content {
  background-color: #f4f4f5;
  padding: 20px;
  /* 允许内容滚动 */
  overflow-y: auto;
}
</style>