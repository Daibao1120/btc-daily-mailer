import express from "express";
import cron from "node-cron";

const app = express();
const PORT = process.env.PORT || 3000;
const TZ = process.env.TZ || "Asia/Taipei";

// ===== Core Function: Build Daily BTC Report =====
async function buildReport() {
  try {
    console.log("Building daily BTC report...");
    
    // Fetch data from APIs in parallel
    const [cg, fee] = await Promise.all([
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true")
        .then(r => r.json()),
      fetch("https://mempool.space/api/v1/fees/recommended")
        .then(r => r.json())
    ]);

    const price = cg?.bitcoin?.usd;
    const chg = cg?.bitcoin?.usd_24h_change;
    const dateFmt = new Intl.DateTimeFormat("zh-Hant", { 
      timeZone: TZ, 
      dateStyle: "medium" 
    });
    const dateStr = dateFmt.format(new Date());

    // Build report content
    const lines = [
      `📊 市場總結（${dateStr}）`,
      `• 價格：$${Number(price).toLocaleString("en-US", { maximumFractionDigits: 2 })}（24h ${(chg >= 0 ? "+" : "")}${chg?.toFixed(2)}%）`,
      `• 手續費建議：fast ${fee?.fastestFee} / halfHour ${fee?.halfHourFee} / hour ${fee?.hourFee} sats/vB`,
      `• ETF 淨流：請見 Farside 面板（下方連結）`,
      `• 重要事件：下次 FOMC 會議請見官方日曆`
    ];

    // Generate HTML content
    const html =
      lines.map(s => `<div>${s}</div>`).join("") +
      `<hr>
       <div>🔗 追蹤連結：
         <ul>
           <li><a href="https://farside.co.uk/btc/">Farside：美國現貨 BTC ETF 淨流面板</a></li>
           <li><a href="https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm">Fed 官方 FOMC 日曆</a></li>
           <li><a href="https://www.coingecko.com/en/coins/bitcoin">CoinGecko：BTC 詳情</a></li>
           <li><a href="https://mempool.space/">mempool.space：鏈上狀態</a></li>
         </ul>
       </div>`;

    // Generate text content
    const text = lines.join("\n") + "\n\n🔗 追蹤連結：\n" +
      "• Farside ETF 面板: https://farside.co.uk/btc/\n" +
      "• Fed FOMC 日曆: https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm\n" +
      "• CoinGecko BTC: https://www.coingecko.com/en/coins/bitcoin\n" +
      "• mempool.space: https://mempool.space/";

    const subject = `BTC 每日重點 – ${dateStr}`;
    
    console.log("Report built successfully:", subject);
    return { subject, html, text };
    
  } catch (error) {
    console.error("Error building report:", error);
    throw error;
  }
}

// ===== Email Function: Support Gmail SMTP or Resend API =====
async function sendEmail({ subject, html, text }) {
  const to = process.env.MAIL_TO;
  if (!to) {
    throw new Error("請設定環境變數 MAIL_TO 收件人");
  }

  console.log(`Sending email to: ${to}`);
  console.log(`Subject: ${subject}`);

  if (process.env.MAIL_PROVIDER === "resend") {
    // Use Resend API
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const from = process.env.MAIL_FROM || "btc-notify@example.com";
    
    if (!RESEND_API_KEY) {
      throw new Error("請設定 RESEND_API_KEY");
    }

    console.log("Using Resend API for email delivery");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from, to, subject, html })
    });

    if (!res.ok) {
      throw new Error(`Resend 發送失敗：${res.status} ${await res.text()}`);
    }
    
    console.log("Email sent successfully via Resend");
    
  } else {
    // Use Gmail SMTP (default)
    const { default: nodemailer } = await import("nodemailer");
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    
    if (!user || !pass) {
      throw new Error("請設定 GMAIL_USER / GMAIL_APP_PASSWORD");
    }

    console.log("Using Gmail SMTP for email delivery");
    const transporter = nodemailer.createTransporter({
      service: "gmail",
      auth: { user, pass }
    });

    await transporter.sendMail({ 
      from: user, 
      to, 
      subject, 
      html, 
      text 
    });
    
    console.log("Email sent successfully via Gmail");
  }
}

// ===== Express Server Setup =====
app.use(express.json());

// Health check endpoint
app.get("/health", (_, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    timezone: TZ
  });
});

// Manual trigger endpoint for testing
app.get("/run-once", async (_, res) => {
  try {
    console.log("Manual trigger activated");
    const report = await buildReport();
    await sendEmail(report);
    res.json({ 
      success: true, 
      message: "Email sent successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Manual trigger failed:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Status endpoint
app.get("/", (_, res) => {
  res.json({
    service: "BTC Daily Mailer",
    status: "running",
    timezone: TZ,
    endpoints: {
      health: "/health",
      manual_trigger: "/run-once"
    }
  });
});

// ===== Cron Job: Daily 09:00 Taiwan Time =====
cron.schedule("0 9 * * *", async () => {
  try {
    console.log(`[${new Date().toISOString()}] Starting daily BTC report job`);
    const report = await buildReport();
    await sendEmail(report);
    console.log("Daily mail sent successfully");
  } catch (error) {
    console.error("Daily mail job failed:", error);
  }
}, { 
  timezone: TZ,
  name: "daily-btc-report"
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 BTC Daily Mailer running on port ${PORT}`);
  console.log(`⏰ Daily emails scheduled for 09:00 ${TZ}`);
  console.log(`📧 Recipient: ${process.env.MAIL_TO || 'Not configured'}`);
  console.log(`📬 Provider: ${process.env.MAIL_PROVIDER || 'gmail'}`);
});