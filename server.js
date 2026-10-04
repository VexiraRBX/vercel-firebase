// server.js
import express from 'express';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

import pkg from 'firebase-admin';
const { credential } = pkg;

const app = express();

// FIX: Increase body parsing limits to accommodate massive Roblox data string payloads
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 2. Safely check if apps are already running using modern getApps() helper
if (getApps().length === 0) {
  initializeApp({
    credential: credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL.replace(/"/g, '') 
  });
}

// 3. Instantiate database reference using the modular getDatabase() module hook
const db = getDatabase(); 

// Roblox Saving Endpoint
app.post('/api/playerdata', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.ROBLOX_SECRET_KEY}`) {
    return res.status(401).json({ error: "Unauthorized endpoint request." });
  }

  const { userId } = req.query;
  const playerData = req.body;

  if (!userId || !playerData) {
    return res.status(400).json({ error: "Missing required payload parameters." });
  }

  try {
    // Write straight to your existing RTDB structural node
    await db.ref(`PlayerData_v1/Player_${userId}`).set(playerData);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Database Write Crash: ", error);
    return res.status(500).json({ error: "Internal Database processing failure." });
  }
});

// Roblox Loading Endpoint
app.get('/api/playerdata', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.ROBLOX_SECRET_KEY}`) {
    return res.status(401).json({ error: "Unauthorized endpoint request." });
  }

  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "Missing Target User ID parameter." });

  try {
    const snapshot = await db.ref(`PlayerData_v1/Player_${userId}`).once('value');
    const data = snapshot.val();
    return res.status(200).json(data || null); // Return null if no data matches path
  } catch (error) {
    console.error("Database Read Crash: ", error);
    return res.status(500).json({ error: "Internal Database retrieval failure." });
  }
});

// Public Health Check Endpoint for Uptime Monitoring
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Dynamically bind to the active port designated by Render's environment
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Roblox API Wrapper online and streaming securely on port ${PORT}`);
});
