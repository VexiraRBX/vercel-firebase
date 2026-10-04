// server.js
import express from 'express';
// 1. Import specific modular elements from their respective sub-paths
import { initializeApp, getApps } from 'firebase-admin/app';
import { credential } from 'firebase-admin';
import { getDatabase } from 'firebase-admin/database';

const app = express();
app.use(express.json()); // Essential for handling large Roblox JSON string tables

// 2. Safely check if apps are already running using modern getApps() helper
if (getApps().length === 0) {
  initializeApp({
    credential: credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
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

// Dynamically bind to the active port designated by Render's environment
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Roblox API Wrapper online and streaming securely on port ${PORT}`);
});
