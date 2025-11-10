import express from "express";
import cors from "cors";
import { DataTypes, Op } from "sequelize";
import db from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/users", userRoutes);

// =================== MODELS ===================

// Mood Tracker
const Mood = db.define("mood", {
  date: { type: DataTypes.DATE, allowNull: false },
  mood: { type: DataTypes.STRING, allowNull: false },
  note: { type: DataTypes.TEXT },
});

// Journal Entries
const Journal = db.define("journal", {
  title: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

// Affirmations
const Affirmation = db.define("affirmation", {
  text: { type: DataTypes.STRING, allowNull: false },
  category: { type: DataTypes.STRING },
});

// Breathing Sessions
const BreathingSession = db.define("breathing_session", {
  duration: { type: DataTypes.INTEGER, allowNull: false }, // seconds or minutes
  type: { type: DataTypes.STRING },
  date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

// Motivational Quotes
const Quote = db.define("quote", {
  text: { type: DataTypes.TEXT, allowNull: false },
  author: { type: DataTypes.STRING },
  category: { type: DataTypes.STRING },
});

// Chat (AI / Therapy)
const Chat = db.define("chat", {
  sender: { type: DataTypes.STRING, allowNull: false }, // "user" or "ai"
  message: { type: DataTypes.TEXT, allowNull: false },
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

// =================== SYNC DATABASE ===================
await db.sync({ alter: true });
console.log("✅ Database synced successfully!");

// =================== GENERIC CRUD ROUTES ===================
const createCrudRoutes = (model, route) => {
  const base = `/api/${route}`;

  // CREATE
  app.post(base, async (req, res) => {
    try {
      const data = await model.create(req.body);
      res.status(201).json({ success: true, message: `${route} created`, data });
    } catch (error) {
      console.error(`❌ Error creating ${route}:`, error);
      res.status(500).json({ success: false, message: `Error creating ${route}` });
    }
  });

  // READ ALL
  app.get(base, async (req, res) => {
    try {
      const data = await model.findAll({ order: [["id", "DESC"]] });
      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error(`❌ Error fetching ${route}:`, error);
      res.status(500).json({ success: false, message: `Error fetching ${route}` });
    }
  });

  // READ SINGLE
  app.get(`${base}/:id`, async (req, res) => {
    try {
      const data = await model.findByPk(req.params.id);
      if (!data) return res.status(404).json({ success: false, message: `${route} not found` });
      res.json({ success: true, data });
    } catch (error) {
      console.error(`❌ Error fetching ${route}:`, error);
      res.status(500).json({ success: false, message: `Error fetching ${route}` });
    }
  });

  // UPDATE (PUT)
  app.put(`${base}/:id`, async (req, res) => {
    try {
      const item = await model.findByPk(req.params.id);
      if (!item) return res.status(404).json({ success: false, message: `${route} not found` });
      await item.update(req.body);
      res.json({ success: true, message: `${route} updated`, data: item });
    } catch (error) {
      console.error(`❌ Error updating ${route}:`, error);
      res.status(500).json({ success: false, message: `Error updating ${route}` });
    }
  });

  // PARTIAL UPDATE (PATCH)
  app.patch(`${base}/:id`, async (req, res) => {
    try {
      const item = await model.findByPk(req.params.id);
      if (!item) return res.status(404).json({ success: false, message: `${route} not found` });
      await item.update(req.body);
      res.json({ success: true, message: `${route} partially updated`, data: item });
    } catch (error) {
      console.error(`❌ Error patching ${route}:`, error);
      res.status(500).json({ success: false, message: `Error patching ${route}` });
    }
  });

  // DELETE
  app.delete(`${base}/:id`, async (req, res) => {
    try {
      const item = await model.findByPk(req.params.id);
      if (!item) return res.status(404).json({ success: false, message: `${route} not found` });
      await item.destroy();
      res.json({ success: true, message: `${route} deleted successfully` });
    } catch (error) {
      console.error(`❌ Error deleting ${route}:`, error);
      res.status(500).json({ success: false, message: `Error deleting ${route}` });
    }
  });
};

// Register CRUD routes
createCrudRoutes(Mood, "moods");
createCrudRoutes(Journal, "journals");
createCrudRoutes(Affirmation, "affirmations");
createCrudRoutes(BreathingSession, "breathing_sessions");
createCrudRoutes(Quote, "quotes");
createCrudRoutes(Chat, "chats");

// =================== ANALYTICS ROUTES (for Graphs) ===================

// Weekly Mood Report
app.get("/api/reports/weekly", async (req, res) => {
  try {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);

    const results = await Mood.findAll({
      where: { date: { [Op.between]: [lastWeek, today] } },
      attributes: ["mood", [db.fn("COUNT", db.col("mood")), "count"]],
      group: ["mood"],
    });

    res.json({ success: true, results });
  } catch (error) {
    console.error("❌ Error fetching weekly report:", error);
    res.status(500).json({ success: false, message: "Error fetching weekly report" });
  }
});

// Monthly Mood Report
app.get("/api/reports/monthly", async (req, res) => {
  try {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    const results = await Mood.findAll({
      where: { date: { [Op.between]: [startOfMonth, endOfMonth] } },
      attributes: ["mood", [db.fn("COUNT", db.col("mood")), "count"]],
      group: ["mood"],
    });

    res.json({ success: true, results });
  } catch (error) {
    console.error("❌ Error fetching monthly report:", error);
    res.status(500).json({ success: false, message: "Error fetching monthly report" });
  }
});

// =================== HEALTH CHECK ===================
app.get("/", (req, res) => {
  res.send("✅ MindMate Backend is fully running with all CRUD + Analytics APIs!");
});

// =================== START SERVER ===================
const startServer = async () => {
  try {
    await db.authenticate();
    console.log("✅ MySQL connected successfully!");
    const PORT = 5001;
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
};

startServer();
