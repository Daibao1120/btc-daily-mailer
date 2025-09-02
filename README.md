# BTC Daily Mailer

🪙 **Automated Bitcoin daily report service** that sends BTC price updates, network fees, and market insights to your email every morning. Built with Node.js + Express, scheduled with node-cron, deployed on Zeabur.

自動化比特幣每日報告服務，每天台北時間 09:00 發送 BTC 重點資訊到指定 Gmail 信箱。

## 📋 功能特色

- **自動排程**：每日台北時間 09:00 自動發送
- **即時數據**：整合 CoinGecko 價格 API 和 mempool.space 手續費 API
- **雙重寄信**：支援 Gmail SMTP 和 Resend API
- **手動觸發**：提供測試用手動發送端點
- **健康檢查**：服務狀態監控端點

## 🚀 快速部署到 Zeabur

### 1. 準備 GitHub Repository

```bash
# Clone 或建立新的 GitHub repository
git init
git add .
git commit -m "Initial BTC Daily Mailer setup"
git branch -M main
git remote add origin https://github.com/your-username/btc-daily-mailer.git
git push -u origin main
```

### 2. Zeabur 部署步驟

1. 前往 [Zeabur](https://zeabur.com/) 並使用 GitHub 帳戶登入
2. 建立新專案 → **Add Service** → 選擇 **Git Service**
3. 選擇您的 GitHub repository
4. Zeabur 會自動識別 Node.js 專案並開始建置

### 3. 環境變數設定

在 Zeabur 專案設定中新增以下環境變數：

#### 基本設定
```
TZ=Asia/Taipei
MAIL_TO=sss851120tw@gmail.com
```

#### Gmail 寄信設定（推薦）
```
MAIL_PROVIDER=gmail
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-16-digit-app-password
```

#### 或使用 Resend API
```
MAIL_PROVIDER=resend
RESEND_API_KEY=your-resend-api-key
MAIL_FROM=BTC Bot <no-reply@your-domain.com>
```

## 🔐 Gmail 應用程式密碼設定

使用 Gmail SMTP 需要設定應用程式密碼：

1. 前往 [Google 帳戶設定](https://myaccount.google.com/)
2. 點選「安全性」→「兩步驟驗證」（必須先啟用）
3. 點選「應用程式密碼」
4. 選擇「郵件」和「其他裝置」
5. 輸入「BTC Daily Mailer」作為應用程式名稱
6. 複製產生的 16 位密碼到 `GMAIL_APP_PASSWORD`

⚠️ **注意**：如果變更 Google 帳戶密碼，應用程式密碼會失效，需重新產生。

## 🔗 API 端點

部署完成後可用的端點：

- `GET /` - 服務資訊
- `GET /health` - 健康檢查
- `GET /run-once` - 手動觸發發送（測試用）

## 🧪 測試部署

1. 部署完成後，前往 Zeabur 提供的網域
2. 訪問 `https://your-domain/run-once` 手動觸發測試
3. 檢查指定信箱是否收到測試郵件
4. 確認每日 09:00 會自動發送

## 📊 郵件內容

每日報告包含：

- **BTC 即時價格**和 24 小時漲跌幅
- **網路手續費建議**（快速/半小時/一小時）
- **ETF 淨流參考連結**（Farside 面板）
- **FOMC 會議日程**（Fed 官方日曆）
- **相關追蹤連結**

## ⚙️ 技術細節

- **Node.js** + Express 框架
- **node-cron** 處理排程（支援時區）
- **nodemailer** Gmail SMTP 寄信
- **fetch API** 整合第三方 API

### 主要依賴

```json
{
  "express": "^4.19.2",
  "node-cron": "^3.0.3", 
  "nodemailer": "^6.9.13"
}
```

### API 資料源

- **價格數據**：[CoinGecko Simple Price API](https://api.coingecko.com/api/v3/simple/price)
- **手續費數據**：[mempool.space Recommended Fees](https://mempool.space/api/v1/fees/recommended)

## 🛠️ 本地開發

```bash
# 安裝依賴
npm install

# 設定環境變數（建立 .env 檔案）
TZ=Asia/Taipei
MAIL_TO=test@example.com
MAIL_PROVIDER=gmail
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# 啟動開發伺服器
npm start

# 測試手動發送
curl http://localhost:3000/run-once
```

## 🔧 自訂設定

### 變更發送時間

修改 `server.js` 中的 cron 表達式：

```javascript
// 每日 08:30 發送
cron.schedule("30 8 * * *", async () => {
  // ...
}, { timezone: TZ });

// 每週一 09:00 發送
cron.schedule("0 9 * * 1", async () => {
  // ...
}, { timezone: TZ });
```

### 新增更多數據源

可在 `buildReport()` 函數中加入更多 API：

```javascript
const [cg, fee, newData] = await Promise.all([
  // 現有 API
  fetch("...").then(r => r.json()),
  fetch("...").then(r => r.json()),
  // 新增的 API
  fetch("https://api.example.com/data").then(r => r.json())
]);
```

## 📝 常見問題

**Q: 郵件沒有按時發送？**
A: 檢查 `TZ` 環境變數是否設為 `Asia/Taipei`，確認 Zeabur 服務正常運行。

**Q: Gmail 驗證失敗？**
A: 確認已啟用兩步驟驗證並使用應用程式密碼，不是 Google 帳戶密碼。

**Q: API 數據異常？**
A: CoinGecko 和 mempool.space 偶有限流，程式已內建錯誤處理機制。

**Q: 想要更改郵件格式？**
A: 修改 `buildReport()` 函數中的 `lines` 和 `html` 變數。

## 📈 擴展建議

- 新增技術指標（MA、RSI）
- 整合 ETF 淨流實際數據
- 支援多個收件人
- 加入 Telegram 通知
- 新增週報/月報功能

## 📄 授權

MIT License - 可自由使用和修改

---

🎯 **由 Index Asia David 開發** | 📧 **收件人**: sss851120tw@gmail.com
