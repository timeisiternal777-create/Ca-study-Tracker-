import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Send Real OTP SMS via Twilio or Free Fallback
  app.post("/api/send-otp", async (req, res) => {
    const { phoneNumber, countryCode, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required parameters phone number or OTP." 
      });
    }

    const fullPhone = `${countryCode || '+91'}${phoneNumber.replace(/[^0-9]/g, '')}`;
    const smsMessage = `🔑 CA Inter Study Radar: Your secure activation code is ${otp}. Do not share this with anyone.`;

    console.log(`[SMS Hub] Attempting to dispatch OTP to ${fullPhone}`);

    // Option 1: Twilio Integration (Robust & Scalable)
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

    if (twilioSid && twilioAuthToken && twilioFrom) {
      try {
        console.log("[SMS Hub] Sending SMS via Twilio API...");
        const basicAuth = Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString("base64");
        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              "Authorization": `Basic ${basicAuth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              From: twilioFrom,
              To: fullPhone,
              Body: smsMessage,
            }),
          }
        );

        const data = await response.json();
        if (response.ok) {
          console.log(`[SMS Hub] Twilio dispatch succeeded: ${data.sid}`);
          return res.json({ 
            success: true, 
            provider: "Twilio", 
            message: "SMS sent successfully to your phone number!" 
          });
        } else {
          console.error("[SMS Hub] Twilio API error response:", data);
          throw new Error(data.message || "Twilio delivery failed.");
        }
      } catch (err: any) {
        console.error("[SMS Hub] Twilio service run failed:", err);
        return res.status(500).json({ 
          success: false, 
          message: `Twilio delivery failed: ${err.message}` 
        });
      }
    }

    // Option 2: Textbelt API Free Developer Fallback (Attempts 1 free text per IP per day)
    console.log("[SMS Hub] Twilio API-keys unconfigured. Falling back to Textbelt free service...");
    try {
      const textbeltResponse = await fetch("https://textbelt.com/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: fullPhone,
          message: smsMessage,
          key: "textbelt", // Free key allows 1 text per day per IP
        }),
      });

      const textbeltData = await textbeltResponse.json();
      console.log("[SMS Hub] Textbelt response details:", textbeltData);

      if (textbeltData.success) {
        return res.json({
          success: true,
          provider: "Textbelt (Free Trial Limit 1/day)",
          message: "SMS sent successfully via textbelt fallback carrier! Check your phone."
        });
      } else {
        // If free limit is exceeded, we return a failure message with custom bypass option details
        return res.status(400).json({
          success: false,
          limitExceeded: true,
          message: textbeltData.error || "Textbelt carrier free limit exceeded.",
          info: "To send unlimited real SMS messages, please add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in your settings menu env."
        });
      }
    } catch (carrierErr: any) {
      console.error("[SMS Hub] Free carrier dispatch error:", carrierErr);
      return res.status(500).json({
        success: false,
        message: `Carrier connection error: ${carrierErr.message}`
      });
    }
  });

  // Health endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // Vite middleware setup for Development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Statics serve for Production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Core desk routing online at http://localhost:${PORT}`);
  });
}

startServer();
