// backend/server.js (最终修正完整版)

// 1. 引入所有需要的模块
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const axios = require('axios');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const setupDatabase = require('./database');
const iconv = require('iconv-lite'); // 引入编码转换库

// 2. 初始化和常量定义
const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-super-secret-key-for-hackathon';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest"});
const quizAnswerCache = new Map();
// 3. 辅助函数
const delay = ms => new Promise(res => setTimeout(res, ms));

function getDistance(lat1, lng1, lat2, lng2) {
    if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return Infinity;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// 4. 中间件和认证
app.use(cors());
app.use(express.json());
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: '未提供访问令牌' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: '令牌无效或已过期' });
        req.user = user;
        next();
    });
}

(async () => {
    const db = await setupDatabase();

    // API路由定义
    app.get('/', (req, res) => res.send('The backend server is running successfully'));

    // 用户注册API
    app.post('/api/register', async (req, res) => {
        try {
            const { username, password, adults, children, infants, elderly, hasPet } = req.body;
            if (!username || !password) return res.status(400).json({ message: 'Username and password cannot be empty' });
            const existingUser = await db.get('SELECT * FROM users WHERE username = ?', username);
            if (existingUser) return res.status(409).json({ message: 'This username has already been registered' });

            const hashedPassword = await bcrypt.hash(password, 10);
            const result = await db.run('INSERT INTO users (username, password, adults, children, infants, elderly, has_pet) VALUES (?, ?, ?, ?, ?, ?, ?)',
                username, hashedPassword, adults, children, infants, elderly, hasPet);
            res.status(201).json({ message: 'User registration successful', userId: result.lastID });
        } catch (error) {
            console.error('Registration error', error);
            res.status(500).json({ message: 'Server Error' });
        }
    });

    app.post('/api/login', async (req, res) => {
        try {
            const { username, password } = req.body;
            const user = await db.get('SELECT * FROM users WHERE username = ?', username);
            if (!user) return res.status(401).json({ message: 'Incorrect username or password' });

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(401).json({ message: 'Incorrect username or password' });

            const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
            res.json({ message: 'Login successful', token: token });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ message: 'Server Error' });
        }
    });
    // 避难地图数据 API
    app.post('/api/map-data', verifyToken, async (req, res) => {
        try {
            const { address } = req.body;
            if (!address) return res.status(400).json({ message: '地址不能为空' });

            const geoResponse = await axios.get(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(address)}`);
            if (!geoResponse.data || geoResponse.data.length === 0) {
                return res.status(404).json({ message: '无法解析该地址。' });
            }

            const geoResult = geoResponse.data[0];
            const [longitude, latitude] = geoResult.geometry.coordinates;
            console.log(`✅ 地址解析成功: 经度=${longitude}, 纬度=${latitude}`);

            const RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID;
            const SEARCH_RADIUS = 3;

            // Promise 1: 乐天酒店
            const hotelSearchPromise = RAKUTEN_APP_ID ? axios.get('https://app.rakuten.co.jp/services/api/Travel/SimpleHotelSearch/20170426', {
                params: { applicationId: RAKUTEN_APP_ID, latitude, longitude, datumType: 1, searchRadius: SEARCH_RADIUS, format: 'json' }
            }).then(response => response.data.hotels.map(h => ({ type: 'hotel', name: h.hotel[0].hotelBasicInfo.hotelName, lat: h.hotel[0].hotelBasicInfo.latitude, lng: h.hotel[0].hotelBasicInfo.longitude, url: h.hotel[0].hotelBasicInfo.hotelInformationUrl }))).catch(err => {
                console.error("❌ 乐天酒店API出错:", err.response ? err.response.data : err.message);
                return [];
            }) : Promise.resolve([]);

            // Promise 2: 本地所有POI (超市, 政府, 避难所)
            const localDataPromise = new Promise((resolve) => {
                // ✅ 核心修改：只读取一个JSON文件
                const poiFilePath = path.join(__dirname, 'poi_nagoya.json');
                fs.readFile(poiFilePath, 'utf8', (err, data) => {
                    if (err) { console.warn(`[警告] 未找到POI文件: ${poiFilePath}`); return resolve([]); }
                    const allPois = JSON.parse(data);
                    // ✅ 核心修改：现在我们对所有本地数据都按距离筛选
                    const nearbyPois = allPois.filter(poi => getDistance(latitude, longitude, poi.lat, poi.lng) <= SEARCH_RADIUS);
                    resolve(nearbyPois);
                });
            });

            // ✅ 核心修改：并行任务减少，不再需要处理CSV
            const [hotels, localData] = await Promise.all([hotelSearchPromise, localDataPromise]);
            console.log(`✅ 成功获取到 ${hotels.length}家酒店, ${localData.length}个本地POI/避难所。`);

            res.json({
                userInput: { address, lat: latitude, lng: longitude },
                locations: [...hotels, ...localData] // 合并所有结果
            });

        } catch (error) {
            console.error('获取地图数据时出错:', error);
            res.status(500).json({ message: '获取地图数据失败' });
        }
    });

    app.get('/api/user/profile', verifyToken, async (req, res) => {
        try {
            const userProfile = await db.get('SELECT id, username, adults, children, infants, elderly, has_pet FROM users WHERE id = ?', req.user.id);
            if (!userProfile) return res.status(404).json({ message: 'User information not found' });
            res.json(userProfile);
        } catch (error) {
            console.error('Error in obtaining user information:', error);
            res.status(500).json({ message: 'Server Error' });
        }
    });

    app.put('/api/user/family-info', verifyToken, async (req, res) => {
        try {
            const { adults, children, infants, elderly, hasPet } = req.body;
            await db.run(`UPDATE users SET adults = ?, children = ?, infants = ?, elderly = ?, has_pet = ? WHERE id = ?`, adults, children, infants, elderly, hasPet, req.user.id);
            res.json({ message: 'Family information updated successfully' });
        } catch (error) {
            console.error('Error updating family information:', error);
            res.status(500).json({ message: 'Server Error' });
        }
    });

    app.get('/api/generate-list', verifyToken, async (req, res) => {
        try {
            const userId = req.user.id;
            const userInfo = await db.get('SELECT * FROM users WHERE id = ?', userId);
            if (!userInfo) return res.status(404).json({ message: 'User information not found' });

            const compositionHash = JSON.stringify({
                adults: userInfo.adults,
                children: userInfo.children,
                infants: userInfo.infants,
                elderly: userInfo.elderly,
                has_pet: userInfo.has_pet
            });

            const cachedList = await db.get(
                'SELECT product_data FROM product_lists WHERE user_id = ? AND composition_hash = ? ORDER BY created_at DESC LIMIT 1',
                userId,
                compositionHash
            );

            if (cachedList) {
                console.log(`Find the product list for user [${userInfo.username}] from the database cache!`);
                const groupedResults = JSON.parse(cachedList.product_data);
                return res.json({
                    message: "Successfully retrieved the grouped product list from the cache",
                    groupedResults: groupedResults
                });
            }

            console.log(`Database cache miss for user [${userInfo.username}], starting real-time generation`);

            const keywords = await getKeywordsFromAI(userInfo);
            if (!keywords || keywords.length === 0) return res.status(400).json({ message: 'Failure to generate effective keywords from AI' });

            const groupedResults = await searchRakutenProducts(keywords);

            await db.run(
                'INSERT INTO product_lists (user_id, composition_hash, product_data) VALUES (?, ?, ?)',
                userId,
                compositionHash,
                JSON.stringify(groupedResults) // 存入时需要将对象转换回JSON字符串
            );
            console.log(`Saved the newly generated list to the database for user [${userInfo.username}].`);

            res.json({ message: "Successfully obtained the grouped product list", groupedResults: groupedResults });
        } catch (error) {
            console.error('Error generating product list:', error);
            res.status(500).json({ message: 'Server Error' });
        }
    });

    app.get('/api/ebooks', verifyToken, async (req, res) => {
        try {
            console.log(`User [${req.user.username}] requested a list of disaster prevention books`);

            const RAKUTEN_API_ENDPOINT = 'https://app.rakuten.co.jp/services/api/Kobo/EbookSearch/20170426';
            const RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID;

            const titleBlacklist = ['裁判', 'ミステリー', '事件簿', '恋愛', 'ファンタジー'];

            const response = await axios.get(RAKUTEN_API_ENDPOINT, {
                params: {
                    applicationId: RAKUTEN_APP_ID,
                    keyword: '防災',
                    format: 'json',
                    sort: 'sales',
                    hits: 30
                }
            });

            const ebooks = response.data.Items.map(itemInfo => {
                const item = itemInfo.Item;
                return {
                    id: item.itemNumber,
                    title: item.title,
                    author: item.author,
                    url: item.itemUrl,
                    imageUrl: item.largeImageUrl,
                    caption: item.itemCaption,
                    publisher: item.publisherName
                };
            });

            const filteredEbooks = ebooks.filter(book =>{
                return !titleBlacklist.some(badKeyword => book.title.includes(badKeyword));
            });

            console.log(`Successfully retrieved ${ebooks.length} books from Rakuten Kobo`);
            res.json(filteredEbooks);

        } catch (error) {
            console.error('Error getting e-book list:', error);
            res.status(500).json({ message: 'Server Error' });
        }
    });

    app.get('/api/quiz', verifyToken, async (req, res) => {
        try {
            const userId = req.user.id;
            console.log(`User [${req.user.username}] requested a new quiz`);

            const quizData = await getQuizFromAI();

            quizAnswerCache.set(userId, quizData);

            const quizForUser = quizData.map(q => ({
                question: q.question,
                options: q.options
            }));

            res.json(quizForUser);

        } catch (error) {
            console.error('生Error generating quiz:', error);
            res.status(500).json({ message: 'Server Error' });
        }
    });

    app.post('/api/quiz/submit', verifyToken, async (req, res) => {
        try {
            const userId = req.user.id;
            const userAnswers = req.body.answers;

            const correctQuizData = quizAnswerCache.get(userId);
            if (!correctQuizData) {
                return res.status(404).json({message: 'The quiz session for this user was not found'});
            }

            let score = 0;
            const totalQuestions = correctQuizData.length;

            const reviewData = correctQuizData.map((question, index) => {
                const userAnswerKey = userAnswers[index] || 'No answer'; // 处理未作答的情况
                const correctAnswerKey = question.answer;
                const isCorrect = userAnswerKey === correctAnswerKey;

                if (isCorrect) {
                    score++;
                }

                const userAnswerIndex = userAnswerKey.charCodeAt(0) - 65;
                const correctAnswerIndex = correctAnswerKey.charCodeAt(0) - 65;

                return {
                    question: question.question,
                    userAnswer: question.options[userAnswerIndex] || userAnswerKey,
                    correctAnswer: question.options[correctAnswerIndex],
                    isCorrect: isCorrect
                };
            });

            const pointsEarned = score * 10;

            await db.run('INSERT INTO quiz_results (user_id, score, total_questions) VALUES (?, ?, ?)', userId, score, totalQuestions);
            await db.run('UPDATE users SET rakuten_points = rakuten_points + ? WHERE id = ?', pointsEarned, userId);

            quizAnswerCache.delete(userId);

            console.log(`User [${req.user.username}] completed the quiz with a score of ${score}/${totalQuestions} and earned ${pointsEarned} points`);

            res.json({
                score: score,
                totalQuestions: totalQuestions,
                pointsEarned: pointsEarned,
                review: reviewData // 返回详细批改数据
            });
        } catch (error) {
            console.error('Error submitting quiz', error);
            res.status(500).json({message: 'Server Error'});
        }


    });

    app.listen(PORT, () => {
        console.log(`The backend server is running`);
    });

})();

async function getKeywordsFromAI(userInfo) {
    const prompt = `
    You are an expert e-commerce shopping assistant for Rakuten Ichiba, specializing in disaster preparedness products.
    Your SOLE mission is to generate a list of keywords for physical products that can be added to a shopping cart and purchased from an online store.
    # Family Composition:
    - Adults: ${userInfo.adults}
    - Children: ${userInfo.children}
    - Infants: ${userInfo.infants}
    - Elderly: ${userInfo.elderly}
    - Has Pets: ${userInfo.has_pet ? 'Yes' : 'No'}
    # CRITICAL INSTRUCTIONS:
    1. ONLY list keywords for tangible, purchasable products (具体的な物品).
    2. CRUCIALLY, you MUST EXCLUDE items that are personally prepared and are NOT typically sold as products online. This includes '現金' (cash), '身分証明書のコピー' (copies of ID cards), etc.
    3. Also, continue to EXCLUDE all abstract concepts, actions, or places.
    4. Your response MUST be ONLY a JSON array of Japanese strings.
    # Examples:
    - GOOD (Can be bought on Rakuten): ["防災セット 4人用", "ポータブル電源", "非常食 7日分"]
    - BAD (Cannot be bought on Rakuten): ["現金", "身分証明書", "避難経路の確認"]
  `;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const match = text.match(/\[.*]/s);
    if (!match) { throw new Error("Invalid AI return format"); }
    return JSON.parse(match[0]);
}

async function searchRakutenProducts(keywords) {
    const BATCH_SIZE = 3;
    const RAKUTEN_API_ENDPOINT = 'https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706';
    const RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID;
    const allGroupedResults = [];

    for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
        const batchKeywords = keywords.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}, keywords:`, batchKeywords);

        const searchPromises = batchKeywords.map(keyword =>
            axios.get(RAKUTEN_API_ENDPOINT, { params: { applicationId: RAKUTEN_APP_ID, keyword, format: 'json', hits: 3 } })
        );
        const batchResponses = await Promise.all(searchPromises);

        const batchGroupedResults = batchKeywords.map((keyword, index) => {
            const products = batchResponses[index].data.Items.map(itemInfo => {
                const item = itemInfo.Item;
                return {
                    id: item.itemCode, name: item.itemName, price: item.itemPrice, url: item.itemUrl,
                    imageUrl: item.mediumImageUrls[0].imageUrl.replace('?_ex=128x128', ''),
                    shop: item.shopName, reviewAverage: parseFloat(item.reviewAverage), reviewCount: item.reviewCount
                };
            });
            return { keyword, products };
        });

        allGroupedResults.push(...batchGroupedResults);

        if (i + BATCH_SIZE < keywords.length) {
            console.log(`Batch processing completed, pausing for 1 second`);
            await delay(1000);
        }
    }
    return allGroupedResults;
}

async function getQuizFromAI() {
    const MAX_RETRIES = 3;
    const INITIAL_DELAY_MS = 2000;

    const DEFAULT_QUIZ_DATA = [
        {
            "question": "大地震発生時、エレベーターに乗っていた場合、どうすべきですか？",
            "options": ["A. すぐに一番近い階のボタンを押し、ドアが開いたらすぐに降りる", "B. そのまま最上階まで行く", "C. 非常ボタンを押し続けて助けを待つ", "D. ドアをこじ開けて脱出する"],
            "answer": "A"
        },
        {
            "question": "津波警報が発表された際、最も適切な避難場所はどこですか？",
            "options": ["A. 海岸近くの頑丈な建物の1階", "B. 自宅の地下室", "C. できるだけ海岸から遠い高台", "D. 車に乗って素早く遠くへ移動する"],
            "answer": "C"
        },
        {
            "question": "災害時の情報収集で、最も信頼性が高いとされる情報源はどれですか？",
            "options": ["A. SNSで拡散されている個人の投稿", "B. 気象庁や自治体などの公的機関からの発表", "C. 知人からのLINEメッセージ", "D. テレビのワイドショー"],
            "answer": "B"
        },
        {
            "question": "怪我人の応急手当で、出血がひどい場合、まず何をすべきですか？",
            "options": ["A. 傷口を心臓より低い位置に保つ", "B. すぐに水をかけて傷口を洗う", "C. 清潔な布などで傷口を直接強く圧迫する", "D. 何もせず救急車の到着を待つ"],
            "answer": "C"
        },
        {
            "question": "家庭用の消火器の一般的な使用期限はどのくらいですか？",
            "options": ["A. 1年", "B. 3年", "C. 5年", "D. 10年"],
            "answer": "C"
        }
    ];

    const prompt = `
    You are an expert in Japanese disaster prevention. 
    Your task is to generate a quiz with 5 multiple-choice questions about disaster preparedness, earthquake safety, or first aid in Japan.

    # CRITICAL INSTRUCTIONS:
    1.  Your response MUST be ONLY a JSON array of objects, with no other text or markdown.
    2.  Each object in the array MUST contain exactly three keys: "question", "options", and "answer". DO NOT omit any keys.
    3.  The "question" value must be a string.
    4.  The "options" value must be an array of exactly 4 strings.
    5.  The "answer" value must be a string containing the letter of the correct option ("A", "B", "C", or "D").

    # Example of the required JSON object structure:
    {
      "question": "地震発生時、屋内にいる場合、まず取るべき最も安全な行動はどれですか？",
      "options": [
        "A. すぐに外に飛び出す",
        "B. 丈夫な机の下など、安全な場所で身を守る",
        "C. 窓を開けて出口を確保する",
        "D. エレベーターで避難する"
      ],
      "answer": "B"
    }
  `;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`Sending Quiz Prompt to Gemini... (Attempt ${attempt})`);
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            const match = text.match(/\[.*]/s);

            return JSON.parse(match[0]);

        } catch (error) {
            const is503Error = error.status === 503 || (error.message && error.message.includes('503'));

            if (is503Error && attempt < MAX_RETRIES) {
                const delayTime = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
                console.warn(`[WARNING] Gemini service is temporarily unavailable (503).`);
                await delay(delayTime);
            } else {
                console.error(`[Error] The AI request failed.`);
                console.warn(`Enable the backup topic`);
                return DEFAULT_QUIZ_DATA;
            }
        }
    }
}


