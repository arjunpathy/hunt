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

    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    await mongoose.connect(process.env.MONGODB_URI);
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
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
