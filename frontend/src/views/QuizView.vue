<template>
  <div class="quiz-view">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <h1>防災知識クイズ挑戦</h1>
          <p>防災知識を試して、楽天ポイントを獲得しましょう！</p>
        </div>
      </template>

      <!-- 状态一：初始/欢迎界面 -->
      <div v-if="quizState === 'idle'" class="quiz-idle">
        <p>チャレンジを始める準備はできましたか？</p>
        <el-button type="primary" size="large" @click="fetchQuiz" :loading="isLoading">
          スタート
        </el-button>
      </div>

      <!-- 状态二：加载题目 -->
      <el-skeleton :rows="5" animated v-if="quizState === 'loading'" />

      <!-- 状态三：答题界面 -->
      <div v-if="quizState === 'answering'" class="quiz-container">
        <div v-for="(item, index) in quiz" :key="index" class="question-block">
          <p class="question-title">{{ index + 1 }}. {{ item.question }}</p>
          <el-radio-group v-model="userAnswers[index]" class="options-group">
            <el-radio v-for="(option, optIndex) in item.options" :key="optIndex" :label="String.fromCharCode(65 + optIndex)" size="large" border>
              {{ option }}
            </el-radio>
          </el-radio-group>
        </div>
        <el-button type="success" @click="submitQuiz" :loading="isSubmitting" class="submit-button">
          回答完了
        </el-button>
      </div>

      <!-- 状态四：答题结果展示 -->
      <div v-if="quizState === 'finished' && result" class="quiz-result">
        <h2>チャレンジ完了！</h2>
        <el-progress type="circle" :percentage="Math.round((result.score / result.totalQuestions) * 100)" />
        <p class="score-text">あなたの得点：{{ result.score }} / {{ result.totalQuestions }}</p>
        <p class="points-text"><strong>{{ result.pointsEarned }}</strong> 楽天ポイントを獲得おめでとうございます！</p>

        <!-- 错题回顾 -->
        <div v-if="result.score < result.totalQuestions" class="wrong-answers-container">
          <el-divider><h3>間違った問題</h3></el-divider>
          <!-- 直接遍历后端返回的批改结果 -->
          <div v-for="(item, index) in result.review" :key="index">
            <div v-if="!item.isCorrect" class="wrong-answer-block">
              <p class="question-title">{{ item.question }}</p>
              <p class="wrong-info">お答え： <el-tag type="danger" effect="light">{{ item.userAnswer }}</el-tag></p>
              <p class="correct-info">正解： <el-tag type="success" effect="light">{{ item.correctAnswer }}</el-tag></p>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="result-actions">
          <el-button @click="goBack">戻る</el-button>
          <el-button type="primary" @click="fetchQuiz" :loading="isLoading">もう一度チャレンジする</el-button>
        </div>
      </div>

    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import axios from 'axios';

const router = useRouter();
const quiz = ref([]);
const userAnswers = reactive({});
const result = ref(null);
const isLoading = ref(false);
const isSubmitting = ref(false);
const quizState = ref('idle');

const fetchQuiz = async () => {
  quizState.value = 'loading';
  isLoading.value = true;
  result.value = null;
  Object.keys(userAnswers).forEach(key => delete userAnswers[key]);

  try {
    const token = localStorage.getItem('token');
    const response = await axios.get('http://localhost:3000/api/quiz', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    quiz.value = response.data.filter(q => q && q.question && q.options);
    quizState.value = 'answering';
  } catch (error) {
    handleAuthError(error, 'クイズの取得に失敗しました');
    quizState.value = 'idle';
  } finally {
    isLoading.value = false;
  }
};

const submitQuiz = async () => {
  if (Object.keys(userAnswers).length !== quiz.value.length) {
    ElMessage.warning('すべての質問に回答してから提出してください');
    return;
  }
  isSubmitting.value = true;
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post('http://localhost:3000/api/quiz/submit',
        { answers: userAnswers },
        { headers: { 'Authorization': `Bearer ${token}` } }
    );
    // 将整个包含批改结果的 data 对象存入 result
    result.value = response.data;
    quizState.value = 'finished';
  } catch (error) {
    handleAuthError(error, '送信に失敗しました');
  } finally {
    isSubmitting.value = false;
  }
};

const goBack = () => {
  quizState.value = 'idle';
  result.value = null;
};

const handleAuthError = (error, message) => {
  console.error(`${message}:`, error);
  ElMessage.error(`${message} またはログインの有効期限が切れています、再度ログインしてください`);
  if (error.response && (error.response.status === 401 || error.response.status === 403)) {
    router.push('/login');
  }
}
</script>

<style scoped>
.quiz-view { width: 100%; }
.card-header { text-align: center; }
.card-header h1 { margin-bottom: 5px; }
.card-header p { margin: 0; color: #909399; font-size: 14px; }
.quiz-idle { text-align: center; padding: 40px 0; }
.quiz-container { text-align: left; }
.question-block { margin-bottom: 30px; }
.question-title { font-weight: bold; font-size: 1.1em; margin-bottom: 15px; }
.options-group { display: flex; flex-direction: column; gap: 10px; }
.options-group .el-radio {
  width: 100%;
  height: auto;
  min-height: 40px;
  padding: 10px 15px;
  margin-right: 0;
  justify-content: flex-start;
  white-space: normal;
}
.el-radio__label { white-space: normal; }
.submit-button { width: 100%; margin-top: 20px; }
.quiz-result { text-align: center; }
.score-text { font-size: 1.2em; font-weight: bold; }
.points-text { font-size: 1.1em; color: #67C23A; }
.points-text strong { font-size: 1.5em; }
.result-actions { margin-top: 30px; display: flex; justify-content: center; gap: 20px; }
.wrong-answers-container { margin-top: 30px; text-align: left; }
.wrong-answer-block { margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 4px; }
.wrong-info, .correct-info { margin: 5px 0; }
</style>



