<template>
  <div id="nav-container">
    <!--
      这个 <router-view/> 组件是Vue Router的“出口”。
      它会根据浏览器当前的URL，自动将我们在 router/index.js 中配置的对应组件，
      渲染到这个位置。
    -->
    <router-view/>
  </div>
</template>

<script setup>
// 在这个“外壳”组件中，我们不需要任何特定的JavaScript逻辑，
// 因为所有的页面逻辑都将在各自的视图组件（如 RegisterPage.vue, LoginPage.vue）中处理。
</script>

<style>
/* 这里的样式是全局的，会应用到应用中的所有页面。
  非常适合用来设置整个应用的背景色、布局等基础样式。
*/
body {
  background-color: #f4f4f5;
  margin: 0;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}

#nav-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
  box-sizing: border-box; /* 确保内边距不会让元素超出视窗 */
}
</style>

