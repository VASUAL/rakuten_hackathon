<template>
  <div class="ebook-view">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <h1>防災に役立つ書籍の推薦</h1>
          <p>楽天Koboの書籍コレクションから選りすぐった防災書籍</p>
        </div>
      </template>

      <el-skeleton :rows="5" animated v-if="isLoading" />

      <el-row :gutter="20" v-else>
        <el-col
            v-for="book in books"
            :key="book.id"
            :xs="24" :sm="12" :md="8" :lg="6"
            class="book-col"
        >
          <a :href="book.url" target="_blank" rel="noopener noreferrer" class="book-link">
            <el-card class="book-card" shadow="hover">
              <el-image :src="book.imageUrl" :alt="book.title" class="book-cover" lazy>
                <template #placeholder>
                  <div class="image-slot">加载中...</div>
                </template>
              </el-image>
              <div class="book-info">
                <p class="book-title" :title="book.title">{{ book.title }}</p>
                <p class="book-author">{{ book.author }}</p>
              </div>
            </el-card>
          </a>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import axios from 'axios';

const router = useRouter();
const books = ref([]);
const isLoading = ref(true);

onMounted(() => {
  fetchEbooks();
});

const fetchEbooks = async () => {
  isLoading.value = true;
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get('http://localhost:3000/api/ebooks', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    books.value = response.data;
  } catch (error) {
    console.error("書籍リストを取得できませんでした:", error);
    ElMessage.error('書籍リストの取得に失敗したか、ログインの有効期限が切れています。再度ログインしてください。');
    // 如果认证失败，跳转回登录页
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      router.push('/login');
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.ebook-view { width: 100%; }
.card-header { text-align: center; }
.card-header h1 { margin-bottom: 5px; }
.card-header p { margin: 0; color: #909399; font-size: 14px; }
.book-col { margin-bottom: 20px; }
.book-link { text-decoration: none; }
.book-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.book-cover {
  width: 100%;
  height: 250px;
  display: block;
}
.image-slot {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background: #f5f7fa;
  color: #909399;
}
.book-info {
  padding: 14px;
}
.book-title {
  font-size: 15px;
  font-weight: bold;
  color: #303133;
  margin: 0 0 5px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  min-height: 45px;
}
.book-author {
  font-size: 13px;
  color: #909399;
  margin: 0;
}
</style>
