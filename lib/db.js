import mongoose from "mongoose";

const scoreSchema = new mongoose.Schema(
  {
    teamName: {
      type: String,
      required: true,
      index: true,
    },
    timeTaken: {
      type: Number,
      required: true,
      index: true,
    },
    errors: {
      type: Number,
      required: true,
    },
    completedAt: {
      type: Number,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

let Score;

// Prevent model recompilation in development
if (mongoose.models.Score) {
  Score = mongoose.models.Score;
} else {
  Score = mongoose.model("Score", scoreSchema);
}

export async function connectDB() {
  try {
    if (mongoose.connection.readyState === 1) {
      return;
    }

    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      const errorMsg =
        "MONGODB_URI environment variable is not set. Add it to your Vercel project settings.";
      console.error("❌ " + errorMsg);
      throw new Error(errorMsg);
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
    });

    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    throw new Error(`Failed to connect to MongoDB: ${error.message}`);
  }
}

export async function saveScore(teamName, timeTaken, errors) {
  await connectDB();
  const score = new Score({
    teamName,
    timeTaken,
    errors,
    completedAt: Date.now(),
  });
  return await score.save();
}

export async function getLeaderboard(limit = 50) {
  await connectDB();
  return await Score.find()
    .sort({ timeTaken: 1, errors: 1 })
    .limit(limit)
    .lean();
}

export async function getScoresByTeam(teamName) {
  await connectDB();
  return await Score.find({ teamName }).sort({ completedAt: -1 }).lean();
}

export async function getAllScores() {
  await connectDB();
  return await Score.find().sort({ createdAt: -1 }).lean();
}
