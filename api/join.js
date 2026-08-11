// Vercel serverless function: stores a waitlist email in MongoDB.
// The connection string lives in the MONGODB_URI environment variable
// (set it in Vercel → Project → Settings → Environment Variables).
// It is NEVER exposed to the browser.

const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "glyph";
const COLLECTION = "waitlist";

// Reuse the connection across warm invocations (important for serverless).
let clientPromise;
function getClient() {
  if (!clientPromise) {
    if (!uri) throw new Error("MONGODB_URI is not set");
    clientPromise = new MongoClient(uri).connect();
  }
  return clientPromise;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const email = (body.email || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      res.status(400).json({ error: "Invalid email" });
      return;
    }
    const client = await getClient();
    const col = client.db(DB_NAME).collection(COLLECTION);
    // Upsert so the same email can't create duplicates.
    await col.updateOne(
      { email },
      { $setOnInsert: { email, createdAt: new Date() } },
      { upsert: true }
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
