<template>
  <el-card class="form-container" shadow="hover">
    <template #header>
      <div class="card-header">
        <h1>お帰りなさい</h1>
        <p>ログインして、防災準備を続けましょう</p>
      </div>
    </template>

    <el-form
        ref="ruleFormRef"
        :model="ruleForm"
        :rules="rules"
        label-position="top"
    >
      <el-form-item label="ユーザー名" prop="username">
        <el-input v-model="ruleForm.username" placeholder="ユーザー名を入力してください" size="large" />
      </el-form-item>

      <el-form-item label="パスワード" prop="password">
        <el-input v-model="ruleForm.password" type="password" show-password placeholder="パスワードを入力してください" size="large" />
      </el-form-item>

      <el-form-item>
        <el-button
            type="primary"
            @click="submitForm(ruleFormRef)"
            :loading="isLoading"
            class="submit-button"
            size="large"
        >
          ログイン
        </el-button>
      </el-form-item>
    </el-form>

    <div class="footer-link">
      まだ登録されでいない方？ <router-link to="/register">新規登録</router-link>
    </div>
  </el-card>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import axios from 'axios';

// --- 状态与引用 ---
const router = useRouter();
const ruleFormRef = ref(null);
const isLoading = ref(false);

// --- 表单数据 ---
const ruleForm = reactive({
  username: '',
  password: '',
});

// --- 表单验证逻辑 ---
const rules = reactive({
  username: [{ required: true, message: 'ユーザー名を入力してください', trigger: 'blur' }],
  password: [{ required: true, message: 'パスワードを入力してください', trigger: 'blur' }],
});

// --- 表单提交方法 ---
const submitForm = async (formEl) => {
  if (!formEl) return;
  await formEl.validate(async (valid) => {
    if (valid) {
      isLoading.value = true;
      try {
        // 1. 调用后端的登录接口
        const response = await axios.post('http://localhost:3000/api/login', ruleForm);

        // 2. 从响应中获取令牌
        const token = response.data.token;

        // 3. ✅ 核心步骤：将令牌存入浏览器的 localStorage
        // localStorage 是一种持久化存储，即使用户关闭浏览器再打开，数据依然存在。
        localStorage.setItem('token', token);

        ElMessage({
          message: 'ログインに成功しました',
          type: 'success',
        });

        // 4. 跳转到主应用页面
        router.push('/app');

      } catch (error) {
        if (error.response && error.response.status === 401) {
          ElMessage.error('ユーザー名またはパスワードが間違っています');
        } else {
          ElMessage.error('ログインに失敗しました，しばらくしてから再度お試しください。');
        }
        console.error("ログイン失敗：", error);
      } finally {
        isLoading.value = false;
      }
    } else {
      console.log('フォームの検証に失敗しました');
      return false;
    }
  });
};
</script>

<style scoped>
/* 样式与注册页面保持一致 */
.form-container {
  width: 100%;
  max-width: 450px;
}
.card-header {
  text-align: center;
}
.card-header h1 {
  margin: 0;
}
.card-header p {
  margin: 5px 0 0;
  color: #909399;
  font-size: 14px;
}
.submit-button {
  width: 100%;
}
.footer-link {
  margin-top: 15px;
  text-align: center;
  font-size: 14px;
}
</style>
