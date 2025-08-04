<template>
  <div class="map-view">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <h1>附近避难场所地图与列表</h1>
          <p>输入你的地址，查找并筛选周边的各类设施。</p>
        </div>
      </template>

      <div class="search-bar">
        <el-input v-model="address" placeholder="请输入详细的日本地址" size="large" @keyup.enter="searchAddress">
          <template #append>
            <el-button @click="searchAddress" :loading="isLoading">搜索</el-button>
          </template>
        </el-input>
      </div>

      <div class="filter-bar" v-if="locations.length > 0">
        <el-checkbox-group v-model="selectedTypes">
          <el-checkbox-button v-for="type in availableTypes" :key="type.value" :label="type.value">
            {{ type.label }}
          </el-checkbox-button>
        </el-checkbox-group>
      </div>

      <div id="map-container">
        <l-map ref="map" v-model:zoom="zoom" :center="mapCenter" :use-global-leaflet="false">
          <l-tile-layer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" name="OpenStreetMap"></l-tile-layer>

          <l-marker v-if="userLocation" :lat-lng="[userLocation.lat, userLocation.lng]" :icon="homeIcon">
            <l-popup>你的位置: <br/> {{ userLocation.address }}</l-popup>
          </l-marker>

          <template v-for="loc in filteredLocations" :key="loc.name + loc.lat">
            <l-marker v-if="loc.lat && loc.lng" :lat-lng="[loc.lat, loc.lng]" :icon="getIcon(loc.type)">
              <l-popup>
                <div class="popup-content">
                  <strong>{{ loc.name }}</strong> ({{ translateType(loc.type) }})
                  <p v-if="loc.address">{{ loc.address }}</p>
                  <p v-if="loc.details" class="popup-details">{{ loc.details }}</p>
                  <a v-if="loc.url" :href="loc.url" target="_blank">查看详情</a>
                </div>
              </l-popup>
            </l-marker>
          </template>
        </l-map>
      </div>

      <div v-if="locations.length > 0" class="list-container">
        <div v-for="type in availableTypes" :key="type.value">
          <div v-if="groupedLocations[type.value] && groupedLocations[type.value].length > 0">
            <el-divider><h3>{{ type.label }} ({{ groupedLocations[type.value].length }}个)</h3></el-divider>
            <el-table :data="groupedLocations[type.value]" stripe border style="width: 100%" height="300">
              <el-table-column prop="name" label="名称" />
              <el-table-column prop="address" label="地址" />
              <el-table-column v-if="type.value === 'shelter'" prop="details" label="详细信息" />
              <el-table-column v-if="type.value === 'hotel'" label="链接" width="100" align="center">
                <template #default="scope">
                  <a :href="scope.row.url" target="_blank">访问主页</a>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </div>

    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import axios from 'axios';
import "leaflet/dist/leaflet.css";
import { LMap, LTileLayer, LMarker, LPopup } from "@vue-leaflet/vue-leaflet";
import L from 'leaflet';

// --- 状态定义 ---
const address = ref('愛知県名古屋市千種区千種３丁目２−５');
const isLoading = ref(false);
const mapCenter = ref([35.1685, 136.9328]);
const zoom = ref(15);
const userLocation = ref(null);
const locations = ref([]);

// 新增：筛选器相关状态
const availableTypes = ref([
  { value: 'hotel', label: '酒店' },
  { value: 'shelter', label: '指定避难所' },
  { value: 'supermarket', label: '超市' },
  { value: 'government', label: '政府/公共机构' },
]);
const selectedTypes = ref(['hotel', 'shelter', 'supermarket', 'government']); // 默认全选

// 新增：计算属性，用于动态过滤和分组
const filteredLocations = computed(() => {
  return locations.value.filter(loc => selectedTypes.value.includes(loc.type));
});
const groupedLocations = computed(() => {
  const groups = {};
  for (const loc of filteredLocations.value) {
    if (!groups[loc.type]) {
      groups[loc.type] = [];
    }
    groups[loc.type].push(loc);
  }
  return groups;
});

// --- 图标定义 ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});
const homeIcon = L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const hotelIcon = L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const shelterIcon = L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const poiIcon = L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });

// --- 方法定义 ---
const getIcon = (type) => {
  switch(type) {
    case 'hotel': return hotelIcon;
    case 'shelter': return shelterIcon;
    case 'supermarket': return poiIcon;
    case 'government': return poiIcon;
    default: return L.Icon.Default;
  }
};
const translateType = (type) => {
  switch(type) {
    case 'hotel': return '酒店(潜在避难场所)';
    case 'shelter': return '指定避难所';
    case 'supermarket': return '超市';
    case 'government': return '政府/公共机构';
    default: return '其他';
  }
};

const searchAddress = async () => {
  if (!address.value) { ElMessage.warning('请输入地址！'); return; }
  isLoading.value = true;
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post('http://localhost:3000/api/map-data', { address: address.value }, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = response.data;
    userLocation.value = data.userInput;
    locations.value = data.locations;
    mapCenter.value = [data.userInput.lat, data.userInput.lng];
    zoom.value = 15;
    ElMessage.success(`成功找到 ${data.locations.length} 个周边设施！`);
  } catch (error) {
    const message = error.response?.data?.message || '搜索失败，请检查地址或稍后再试。';
    ElMessage.error(message);
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.map-view { width: 100%; }
.search-bar { margin-bottom: 20px; }
.filter-bar {
  margin: 20px 0;
  display: flex;
  justify-content: center;
}
#map-container {
  height: 50vh;
  width: 100%;
}
.popup-content { font-size: 14px; max-width: 250px; }
.popup-content p { margin: 5px 0; }
.popup-details {
  margin-top: 10px;
  font-size: 12px;
  color: #606266;
}
.list-container { margin-top: 20px; }
</style>

