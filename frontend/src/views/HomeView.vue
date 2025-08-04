<template>
  <div v-if="!isFetchingProfile" class="main-app-container">
    <el-card class="form-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <h1>{{ username }}さんの防災チェックリスト</h1>
          <el-button type="danger" plain @click="handleLogout" class="logout-button">ログアウト</el-button>
        </div>
      </template>

      <el-form :model="form" label-position="top">
        <el-row :gutter="20">
          <el-col :span="12"><el-form-item label="大人数"><el-input-number v-model="form.adults" :min="0" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="子ども数"><el-input-number v-model="form.children" :min="0" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="赤ちゃん数"><el-input-number v-model="form.infants" :min="0" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="高齢者数"><el-input-number v-model="form.elderly" :min="0" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="ペットを飼っていますか？">
          <el-switch v-model="form.hasPet" />
        </el-form-item>
        <el-form-item>
          <el-button type="success" @click="handleProfileUpdate" :loading="isUpdating">家庭情報を保存する</el-button>
          <el-button type="primary" @click="handleGenerate" :loading="isLoading">
            {{ groupedProducts.length > 0 ? 'おすすめを再作成' : '商品おすすめ生成' }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 结果展示区域 -->
    <div v-if="isLoading && groupedProducts.length === 0" class="loading-container">
      <el-skeleton :rows="10" animated />
    </div>
    <div v-else-if="groupedProducts.length > 0" class="results-container">
      <div v-for="group in groupedProducts" :key="group.keyword" class="keyword-group">
        <el-divider content-position="left"><h2 class="keyword-title">{{ group.keyword }}</h2></el-divider>
        <el-row :gutter="20">
          <el-col v-for="product in group.products" :key="product.id" :xs="24" :sm="12" :md="8" class="product-col">
            <a :href="product.url" target="_blank" rel="noopener noreferrer" class="product-link">
              <el-card class="product-card" shadow="hover">
                <el-image :src="product.imageUrl" :alt="product.name" class="product-image" lazy />
                <div class="product-info">
                  <p class="product-name" :title="product.name">{{ product.name }}</p>
                  <div class="product-details">
                    <p class="product-price">¥ {{ product.price.toLocaleString() }}</p>
                  </div>
                </div>
              </el-card>
            </a>
          </el-col>
        </el-row>
      </div>
    </div>
  </div>
  <el-skeleton :rows="10" animated v-else />
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import axios from 'axios';

const router = useRouter();
const username = ref('');
const form = reactive({ adults: 0, children: 0, infants: 0, elderly: 0, hasPet: false });
const isFetchingProfile = ref(true);
const isUpdating = ref(false);
const isLoading = ref(false);
const groupedProducts = ref([]);

onMounted(() => {
  fetchUserProfile().then(() => {
    handleGenerate();
  });
});

const fetchUserProfile = async () => {
  isFetchingProfile.value = true;
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get('http://localhost:3000/api/user/profile', { headers: { 'Authorization': `Bearer ${token}` } });
    const profile = response.data;
    username.value = profile.username;
    form.adults = profile.adults || 0;
    form.children = profile.children || 0;
    form.infants = profile.infants || 0;
    form.elderly = profile.elderly || 0;
    form.hasPet = !!profile.has_pet;
  } catch (error) {
    ElMessage.error('ユーザー情報の取得に失敗しました、またはログインが期限切れです。再ログインしてください。');
    router.push('/login');
  } finally {
    isFetchingProfile.value = false;
  }
};

const handleProfileUpdate = async () => {
  isUpdating.value = true;
  try {
    const token = localStorage.getItem('token');
    await axios.put('http://localhost:3000/api/user/family-info', form, { headers: { 'Authorization': `Bearer ${token}` } });
    ElMessage.success('家庭情報が更新されました。次回のリスト生成に新しい情報が反映されます。');
  } catch (error) { ElMessage.error('更新失敗。後で再試行してください。'); }
  finally { isUpdating.value = false; }
};

const handleGenerate = async () => {
  isLoading.value = true;
  groupedProducts.value = [];
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get('http://localhost:3000/api/generate-list', { headers: { 'Authorization': `Bearer ${token}` } });
    groupedProducts.value = response.data.groupedResults;
  } catch (error) {
    ElMessage.error('おすすめリストの取得失敗。後で再試行してください。');
  } finally {
    isLoading.value = false;
  }
};

const handleLogout = () => {
  localStorage.removeItem('token');
  ElMessage.success('正常にログアウトされました。');
  router.push('/login');
};
</script>

<style scoped>
.main-app-container { width: 100%; max-width: 900px; }
.card-header { position: relative; text-align: center; }
.logout-button { position: absolute; top: 50%; right: 0; transform: translateY(-50%); }
.el-form-item { margin-bottom: 18px; }
.el-input-number, .el-switch { width: 100%; }
.results-container, .keyword-group, .product-col { margin-top: 20px; }
.keyword-title { font-size: 22px; color: #303133; margin: 0; }
.el-divider__text { background-color: #f4f4f5; }
.product-link { text-decoration: none; }
.product-card { display: flex; flex-direction: column; height: 100%; }
.product-card .el-card__body { padding: 0; display: flex; flex-direction: column; flex-grow: 1; }
.product-image { width: 100%; height: 200px; }
.product-info { padding: 14px; flex-grow: 1; }
.product-name { font-size: 14px; color: #303133; margin: 0 0 10px 0; min-height: 42px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.product-price { font-size: 18px; font-weight: bold; color: #bf0000; }
.loading-container { margin-top: 20px; }
</style>

