// server.js
import express from 'express';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

import pkg from 'firebase-admin';
const { credential } = pkg;

const app = express();

// Increase body parsing limits to accommodate massive Roblox data string payloads
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Safely check if apps are already running using modern getApps() helper
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

// Instantiate database reference using the modular getDatabase() module hook
const db = getDatabase(); 

// ==============================================================
// PLAYER DATA ENDPOINTS (`PlayerData_v1`)
// ==============================================================

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
    return res.status(200).json(data || null);
  } catch (error) {
    console.error("Database Read Crash: ", error);
    return res.status(500).json({ error: "Internal Database retrieval failure." });
  }
});

// ==============================================================
// COMMUNITY HIVES ENDPOINTS (`BSSCommunityHives_v1`)
// ==============================================================

// Community Hives Saving Endpoint
app.post('/api/communityhives', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.ROBLOX_SECRET_KEY}`) {
    return res.status(401).json({ error: "Unauthorized endpoint request." });
  }

  const { hiveId } = req.query; // Expects a unique hive/player path indicator
  const hiveData = req.body;

  if (!hiveId || !hiveData) {
    return res.status(400).json({ error: "Missing required hiveId or hiveData body." });
  }

  try {
    await db.ref(`BSSCommunityHives_v1/${hiveId}`).set(hiveData);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Community Hive Write Crash: ", error);
    return res.status(500).json({ error: "Internal Database processing failure." });
  }
});

// Community Hives Loading Endpoint
app.get('/api/communityhives', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.ROBLOX_SECRET_KEY}`) {
    return res.status(401).json({ error: "Unauthorized endpoint request." });
  }

  const { hiveId } = req.query;
  if (!hiveId) return res.status(400).json({ error: "Missing Target Hive ID parameter." });

  try {
    const snapshot = await db.ref(`BSSCommunityHives_v1/${hiveId}`).once('value');
    const data = snapshot.val();
    return res.status(200).json(data || null);
  } catch (error) {
    console.error("Community Hive Read Crash: ", error);
    return res.status(500).json({ error: "Internal Database retrieval failure." });
  }
});

// ==============================================================
// HEALTH & MAINTENANCE
// ==============================================================

// Public Health Check Endpoint for Uptime Monitoring
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Dynamically bind to the active port designated by Render's environment
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Roblox API Wrapper online and streaming securely on port ${PORT}`);
});
