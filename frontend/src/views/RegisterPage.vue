<template>
  <el-card class="form-container" shadow="hover">
    <template #header>
      <div class="card-header">
        <h1>新規登録</h1>
      </div>
    </template>

    <!-- 步骤条 -->
    <el-steps :active="activeStep" finish-status="success" simple>
      <el-step title="アカウント情報" />
      <el-step title="家族情報" />
    </el-steps>

    <!-- 表单内容 -->
    <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        class="step-form"
    >
      <!-- 步骤一：账号信息 -->
      <div v-show="activeStep === 0">
        <el-form-item label="ユーザー" prop="username">
          <el-input v-model="form.username" placeholder="ユーザー名を入力してください" size="large" />
        </el-form-item>
        <el-form-item label="パスワード" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="パスワードを入力してください" size="large" />
        </el-form-item>
        <el-form-item label="パスワード確認" prop="checkPass">
          <el-input v-model="form.checkPass" type="password" show-password placeholder="もう一度パスワードを入力してください" size="large" />
        </el-form-item>
      </div>

      <!-- 步骤二：家庭信息 -->
      <div v-show="activeStep === 1">
        <el-form-item label="ご家庭には大人が何人何人いますか？" prop="adults">
          <el-input-number v-model="form.adults" :min="0" size="large" />
        </el-form-item>
        <el-form-item label="2～12歳の子どもは何人いますか？" prop="children">
          <el-input-number v-model="form.children" :min="0" size="large" />
        </el-form-item>
        <el-form-item label="0～2歳の赤ちゃんは何人いますか？" prop="infants">
          <el-input-number v-model="form.infants" :min="0" size="large" />
        </el-form-item>
        <el-form-item label="65歳以上の高齢者は何人いますか？" prop="elderly">
          <el-input-number v-model="form.elderly" :min="0" size="large" />
        </el-form-item>
        <el-form-item label="ペットを飼っていますか？" prop="hasPet">
          <el-switch v-model="form.hasPet" size="large" />
        </el-form-item>
      </div>

      <!-- 操作按钮 -->
      <el-form-item class="action-buttons">
        <el-button @click="prevStep" v-if="activeStep === 1">戻る</el-button>
        <el-button type="primary" @click="nextStep" v-if="activeStep === 0">次へ</el-button>
        <el-button type="primary" @click="submitForm" v-if="activeStep === 1" :loading="isLoading">
          登録完了
        </el-button>
      </el-form-item>
    </el-form>

    <div class="footer-link">
      すでに登録された方はこちらで <router-link to="/login">ログイン</router-link>
    </div>
  </el-card>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import axios from 'axios';

const router = useRouter();
const formRef = ref(null);
const isLoading = ref(false);
const activeStep = ref(0); // 当前激活的步骤

// 包含所有字段的表单数据
const form = reactive({
  username: '',
  password: '',
  checkPass: '',
  adults: 2,
  children: 0,
  infants: 0,
  elderly: 0,
  hasPet: false,
});

const validatePass2 = (rule, value, callback) => {
  if (value === '') callback(new Error('もう一度パスワードを入力してください'));
  else if (value !== form.password) callback(new Error("入力したパスワードが一致しません"));
  else callback();
};

// 所有验证规则
const rules = reactive({
  username: [{ required: true, message: 'ユーザー名を入力してください', trigger: 'blur' }],
  password: [{ required: true, message: 'パスワードを入力してください', trigger: 'blur' }],
  checkPass: [{ validator: validatePass2, trigger: 'blur' }],
  adults: [{ required: true, message: '大人の人数を入力してください', trigger: 'blur' }],
});

// 下一步
const nextStep = async () => {
  if (!formRef.value) return;
  // 只验证第一步的字段
  await formRef.value.validateField(['username', 'password', 'checkPass'], (valid) => {
    if (valid) {
      activeStep.value++;
    } else {
      console.log('ステップ1の検証に失敗しました');
    }
  });
};

// 上一步
const prevStep = () => {
  if (activeStep.value > 0) {
    activeStep.value--;
  }
};

// 最终提交
const submitForm = async () => {
  if (!formRef.value) return;
  // 验证所有字段
  await formRef.value.validate(async (valid) => {
    if (valid) {
      isLoading.value = true;
      try {
        await axios.post('http://localhost:3000/api/register', form);
        ElMessage({ message: '登録が成功しました、ログインしてください', type: 'success' });
        router.push('/login');
      } catch (error) {
        if (error.response && error.response.status === 409) ElMessage.error('このユーザー名はすでに登録されています、別のものに変更してください');
        else ElMessage.error('登録に失敗しました、しばらくしてから再度お試しください');
      } finally {
        isLoading.value = false;
      }
    } else {
      console.log('フォームの検証に失敗しました');
    }
  });
};
</script>

<style scoped>
.form-container { width: 100%; max-width: 500px; }
.card-header { text-align: center; }
.step-form { margin-top: 20px; }
.el-input-number, .el-switch { width: 100%; }
.action-buttons { margin-top: 20px; }
.action-buttons .el-form-item__content { justify-content: center; }
.footer-link { margin-top: 15px; text-align: center; font-size: 14px; }
</style>

