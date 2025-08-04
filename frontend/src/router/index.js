import { createRouter, createWebHistory } from 'vue-router';

const routes = [
    {
        path: '/',
        redirect: '/login' // 修改默认跳转，未登录时应先去登录页
    },
    {
        path: '/register',
        name: 'Register',
        component: () => import('../views/RegisterPage.vue'),
// ✅ 新增：路由元信息
    meta: { requiresAuth: false } // 这个页面不需要登录
},
{
    path: '/login',
        name: 'Login',
    component: () => import('../views/LoginPage.vue'),
// ✅ 新增：路由元信息
    meta: { requiresAuth: false } // 这个页面不需要登录
},
{
    path: '/app',
        name: 'MainLayOut',
    component: () => import('../views/MainLayout.vue'),
    meta: { requiresAuth: true },// 访问这个页面【需要】登录
    redirect: '/home',
    children:[
        {
            path:'/home',
            name:'Home',
            component:()=>import('../views/HomeView.vue')
        },
        {
            path:'/map',
            name:'Map',
            component:()=>import('../views/MapView.vue')
        },
        {
            path:'/ebooks',
            name:'Ebooks',
            component:()=>import('../views/EbookView.vue')
        },
        {
            path:'/quiz',
            name:'Quiz',
            component:()=>import('../views/QuizView.vue')
        },
    ]
}
];

const router = createRouter({
    history: createWebHistory(process.env.BASE_URL),
routes
});

router.beforeEach((to, from, next) => {
// 检查目标路由是否需要认证
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

// 检查浏览器中是否存在令牌
    const token = localStorage.getItem('token');

    if (requiresAuth && !token) {
// 1. 如果此页面需要登录，但用户没有令牌 -\> 强制跳转到登录页
        console.log('访问被拦截，用户未登录，跳转到 /login');
        next('/login');
    } else if ((to.name === 'Login' || to.name === 'Register') && token) {
// 2. 如果用户已经登录，但他们又想访问登录或注册页 -\> 强制跳转到主应用页
        console.log('用户已登录，访问登录/注册页被拦截，跳转到 /app');
        next('/app');
    } else {
// 3. 其他所有情况（无需登录的页面，或需要登录且用户已登录） -\> 正常放行
        next();
    }
});

export default router;