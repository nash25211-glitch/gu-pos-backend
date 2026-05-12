const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your_super_secret_key_123'; // 這是你的簽名章，別弄丟
const app = express();
// 允許 React 前端跨網域來要資料
app.use(cors());
app.use(express.json());

// 🏦 建立資料庫連線池 (拿著你的金庫鑰匙)
// 🚀 改裝二：建立資料庫連線池 (支援雲端環境變數動態讀取)
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '12345678',
  database: process.env.DB_NAME || 'gu_pos',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
// ============================================================================
// 🏆 企業級效能怪獸：商品銷量最大堆積樹 (Max Heap 完全體)
// ============================================================================
class ProductMaxHeap {
  constructor() {
    this.heap = []; // 我們用單純的一維陣列來裝這棵樹！
  }

  // 🧮 取得直屬老爸的索引位置
  getParentIndex(i) {
    return Math.floor((i - 1) / 2);
  }

  // 📥 1. 新人大空降 (新增商品銷量資料)
  insert(product) {
    this.heap.push(product); // 先把新人丟到陣列最尾端 (公司最底層)
    this.bubbleUp(this.heap.length - 1); // 啟動升遷機制！
  }

  // 🚀 2. 業績檢核與升遷 (向上浮動 Bubble Up)
  bubbleUp(index) {
    let currentIndex = index;
    while (
      currentIndex > 0 &&
      this.heap[currentIndex].qty > this.heap[this.getParentIndex(currentIndex)].qty
    ) {
      let parentIndex = this.getParentIndex(currentIndex);
      // ⚔️ 篡位！跟老爸交換位子
      let temp = this.heap[currentIndex];
      this.heap[currentIndex] = this.heap[parentIndex];
      this.heap[parentIndex] = temp;
      currentIndex = parentIndex;
    }
  }

  // 📤 3. 取出銷售冠軍 (第一名退休，最後一名遞補)
  extractMax() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();

    const max = this.heap[0]; 
    this.heap[0] = this.heap.pop(); // 把陣列最後一名強行拉到 CEO 位置
    this.sinkDown(0); // 啟動殘酷的下沉考驗

    return max;
  }
getTop5() {
    const cloneHeap = new ProductMaxHeap();
    cloneHeap.heap = [...this.heap]; 
    const result = [];
    while (result.length < 5 && cloneHeap.heap.length > 0) {
      result.push(cloneHeap.extractMax());
    }
    return result; 
  }
  // 🎯 6. 實時動態更新 (追蹤導彈升遷機制)
  updateQty(cartItem) {
    // 1. 先在公司(陣列)裡面找找看，這個商品是不是已經在排行榜裡了
    const index = this.heap.findIndex(p => p.id === cartItem.id);

    if (index !== -1) {
      // 🌟 狀況 A：老鳥加薪！
      // 把它原本的銷量，加上這次客人買的數量
      this.heap[index].qty += cartItem.qty;
      // 因為業績變強了，立刻啟動「向上浮動」，讓它去挑戰上面的長官！
      this.bubbleUp(index); 
    } else {
      // 👶 狀況 B：新人報到！
      // 排行榜上還沒有他，直接以新兵身份加入公司底層，並自動啟動升遷
      this.insert({
        id: cartItem.id,
        name: cartItem.name,
        qty: cartItem.qty
      });
    }
  }
  // ⚓ 4. 職位下沉邏輯 (跟兩個兒子比業績，誰強誰篡位 Sink Down)
  sinkDown(index) {
    let currentIndex = index;
    const length = this.heap.length;

    while (true) {
      let leftChildIndex = 2 * currentIndex + 1;
      let rightChildIndex = 2 * currentIndex + 2;
      let swapIndex = null;

      if (leftChildIndex < length) {
        if (this.heap[leftChildIndex].qty > this.heap[currentIndex].qty) {
          swapIndex = leftChildIndex; 
        }
      }

      if (rightChildIndex < length) {
        if (
          (swapIndex === null && this.heap[rightChildIndex].qty > this.heap[currentIndex].qty) ||
          (swapIndex !== null && this.heap[rightChildIndex].qty > this.heap[leftChildIndex].qty)
        ) {
          swapIndex = rightChildIndex; 
        }
      }

      if (swapIndex === null) break;

      let temp = this.heap[currentIndex];
      this.heap[currentIndex] = this.heap[swapIndex];
      this.heap[swapIndex] = temp;

      currentIndex = swapIndex;
    }
  }
}

// 🌟 實體化這棵樹，準備給 POS 系統使用
const salesRankingHeap = new ProductMaxHeap();
// ============================================================================

// 🔍 測試路由：檢查理財專員有沒有上班
app.get('/', (req, res) => {
  res.send('GU POS 後端 API 伺服器正常運作中！');
});

// 🌟 核心 API：根據「條碼」去金庫尋找商品
// 🌟 核心 API：根據「條碼」去金庫尋找商品 (GET)
app.get('/api/products/:barcode', (req, res) => {
  const barcode = req.params.barcode;
  
  db.query('SELECT * FROM products WHERE id = ?', [barcode], (err, results) => {
    if (err) {
      console.error('資料庫查詢失敗:', err);
      return res.status(500).json({ error: '資料庫發生錯誤' });
    }
    
    if (results.length > 0) {
      res.json(results[0]);
    } else {
      res.status(404).json({ message: '找不到此商品' });
    }
  });
}); // 👈 剛剛就是少了這三行把 GET 關起來！
// 📈 店長報表 API：取得熱銷排行榜 Top 5
app.get('/api/top-sales', (req, res) => {
  try {
    const topProducts = salesRankingHeap.getTop5();
    res.status(200).json(topProducts);
  } catch (error) {
    res.status(500).json({ error: '排行榜讀取失敗' });
  }
});
// 🌟 Week 4 Day 1 核心 API：接收前端購物車清單，並扣除資料庫庫存 (POST)
app.post('/api/checkout', (req, res) => {
  const cart = req.body.cart;
  const paymentMethod = req.body.paymentMethod || 'credit';
  if (!cart || cart.length === 0) {
    return res.status(400).json({ error: '購物車是空的！' });
  }

  let completedCount = 0;
  let hasError = false;

  cart.forEach(item => {
    
  // 👇 加上這行追蹤器
  console.log(`🚀 執行結帳防呆檢查！準備扣除商品 ${item.id}，數量: ${item.qty}`);
  
 // 🛡️ 防呆機制：只有大於 0 的數量才處理 (Day 28 任務)
      if (item.qty > 0) {
        // 📝 1. 寫入歷史訂單紀錄 (這就是 Heap 未來的記憶來源！)
        // 📝 1. 寫入歷史訂單紀錄 (連同付款方式一起存！)
        db.query('INSERT INTO order_items (product_id, product_name, quantity, payment_method) VALUES (?, ?, ?, ?)', [item.id, item.name, item.qty, paymentMethod]);
        
        // 🏆 2. 實時更新排行榜的 Heap
        salesRankingHeap.updateQty(item);
      }
    // 🛡️ 加上 AND stock >= ? 嚴格把關，不夠就不給扣！
    db.query('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?', [item.qty, item.id, item.qty], (err, results) => {
      if (err) {
        console.error(`扣除商品 ${item.id} 庫存失敗:`, err);
        hasError = true;
      }
      
      if (results && results.affectedRows === 0) {
        console.warn(`⚠️ 警告：商品 ${item.id} 庫存不足，扣除失敗！`);
        hasError = true; 
      }
      
      completedCount++;
      
      if (completedCount === cart.length) {
        if (hasError) {
          res.status(500).json({ error: '部分庫存更新失敗，請聯絡 IT 部門' });
        } else {
          cart.forEach(item => {
        salesRankingHeap.updateQty(item);
      });
          res.json({ message: '✅ 結帳成功，MySQL 庫存已同步更新！' });
        }
      }
    });
  });
});
// 啟動伺服器，監聽 5000 port
const PORT = 5001;
// ==========================================
// 💾 Day 26 系統啟動初始化：從資料庫同步歷史銷售數據到 Heap
// ==========================================
const initRankingHeap = async () => {
  try {
    console.log('⏳ 正在從資料庫同步歷史熱銷數據...');
    
    // 向 MySQL 撈取所有訂單中，各個商品的「總銷售量 (SUM)」
    // 假設你的訂單明細表叫做 order_items
    const [rows] = await db.promise().query(`
      SELECT product_id as id, product_name as name, SUM(quantity) as qty 
      FROM order_items 
      GROUP BY product_id, product_name
    `);

    // 把撈出來的數據，一個一個塞進我們的 Max Heap 效能怪獸裡
    rows.forEach(item => {
      salesRankingHeap.insert({
        id: item.id,
        name: item.name,
        qty: parseInt(item.qty)
      });
    });
    
    console.log(`✅ 排行榜同步完成！已成功載入 ${rows.length} 項歷史熱銷商品。`);
  } catch (error) {
    console.error('❌ 排行榜初始化失敗 (請確認資料庫是否有 order_items 表):', error);
  }
};

// ==========================================
// 🛡️ 第 4 步：建立驗證攔截器 (守門員)
// ==========================================
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(403).json({ message: '拒絕訪問：請先登入' });
  }

  try {
    const decoded = jwt.verify(token.split(' ')[1], JWT_SECRET);
    req.user = decoded;
    next(); // 驗證成功，放行！
  } catch (err) {
    res.status(401).json({ message: '通行證無效或已過期' });
  }
};

// ==========================================
// 🔑 第 3 步：建立登入 API (發證中心)
// ==========================================
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  // 為了教學方便，我們先用寫死的帳密：帳號 admin / 密碼 8888
  if (username === 'admin' && password === '8888') {
    // 簽發一張有效期 1 小時的通行證
    const token = jwt.sign({ role: 'manager' }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, message: '帳號或密碼錯誤' });
  }
});
// ==========================================
// 📊 Day 29 戰情室 API：計算總營業額與交易數據
// ==========================================
app.get('/api/dashboard-stats', verifyToken, async (req, res) => {
  try {
    // 1. 撈取總交易筆數 (以訂單明細的筆數計算) 與 總賣出件數
    // 1. 撈取總交易筆數、總件數，並且統計「現金結帳」的次數
    const [orderRows] = await db.promise().query(`
      SELECT 
        COUNT(*) as txCount, 
        SUM(quantity) as totalQty,
        SUM(CASE WHEN payment_method = 'cash' THEN 1 ELSE 0 END) as cashCount
      FROM order_items
    `);
    
    // 2. 跨表連線 (JOIN)：把訂單明細跟商品表接起來，計算「數量 * 單價」的總營業額！
    const [revenueRows] = await db.promise().query(`
      SELECT 
        SUM(oi.quantity * p.price) as totalRevenue,
        SUM(oi.quantity * p.cost) as totalCost
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
    `);

    // 將資料庫撈出來的結果整理好
    const txCount = orderRows[0].txCount || 0;
    const totalQty = parseInt(orderRows[0].totalQty) || 0;
    const totalRevenue = parseInt(revenueRows[0].totalRevenue) || 0;
    const totalCost = parseInt(revenueRows[0].totalCost) || 0;
    // 🟢 裝上監視器：把後端算出來的數字印在終端機給我們看！
    console.log(`📊 [戰情室監視器] 大腦拿到的營收: ${totalRevenue}, 成本: ${totalCost}`);
    
    // 計算客單價 (總營業額 / 交易筆數，若無交易則為 0)
    const avgOrderValue = txCount > 0 ? Math.round(totalRevenue / txCount) : 0;
    const cashCount = parseInt(orderRows[0].cashCount) || 0;
    // 計算比例：(現金筆數 / 總筆數) * 100，四捨五入。若沒訂單則為 0。
    const cashRatio = txCount > 0 ? Math.round((cashCount / txCount) * 100) : 0;
    const creditRatio = txCount > 0 ? 100 - cashRatio : 0; // 剩下的就是刷卡
    // 💡 計算毛利率 ((營業額 - 成本) / 營業額) * 100，取到小數第一位
    const margin = totalRevenue > 0 ? (((totalRevenue - totalCost) / totalRevenue) * 100).toFixed(1) : "0.0";
    // 將算好的熱騰騰報表打包成 JSON 送給前端！
    res.json({
      revenue: totalRevenue,
      transactions: txCount,
      averageValue: avgOrderValue,
      totalItems: totalQty,
      cashRatio: cashRatio,
      creditRatio: creditRatio,
      margin: margin,
    });

  } catch (error) {
    console.error('❌ 算帳 API 發生錯誤:', error);
    res.status(500).json({ error: '無法計算戰情室數據' });
  }
});
// 伺服器啟動時，立刻執行這支函數
initRankingHeap();
// ==========================================
// 🚀 雲端動態 Port 設定：優先使用雲端分配的 Port，沒有的話才用 5001
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 伺服器已成功啟動！目前跑在 Port: ${PORT}`);
});