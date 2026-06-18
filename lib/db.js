import mongoose from "mongoose";
import crypto from "crypto";

const scoreSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      index: true,
    },
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
    suppressReservedKeysWarning: true,
  },
);

const teamSchema = new mongoose.Schema(
  {
    teamName: {
      type: String,
      required: true,
    },
    normalizedTeamName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    teamKey: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const colleagueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    faceDescriptor: {
      type: [Number],
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

let Score;
let Team;
let Colleague;

// Prevent model recompilation in development
if (mongoose.models.Score) {
  Score = mongoose.models.Score;
} else {
  Score = mongoose.model("Score", scoreSchema);
}

if (mongoose.models.Team) {
  Team = mongoose.models.Team;
} else {
  Team = mongoose.model("Team", teamSchema);
}

if (mongoose.models.Colleague) {
  Colleague = mongoose.models.Colleague;
} else {
  Colleague = mongoose.model("Colleague", colleagueSchema);
}

export function normalizeTeamName(teamName) {
  return String(teamName || "")
    .trim()
    .toLowerCase();
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
    const wrapped = new Error(`Failed to connect to MongoDB: ${error.message}`);

    if (
      /authentication failed|bad auth/i.test(error.message || "") ||
      error.codeName === "AtlasError"
    ) {
      wrapped.code = "MONGO_AUTH_FAILED";
    }

    throw wrapped;
  }
}

export async function ensureTeam(teamName, providedTeamKey = "") {
  await connectDB();
  const displayName = String(teamName || "").trim();
  const normalizedTeamName = normalizeTeamName(displayName);

  if (!displayName || displayName.length < 2) {
    const error = new Error("Team name must be at least 2 characters");
    error.code = "INVALID_TEAM_NAME";
    throw error;
  }

  let team = await Team.findOne({ normalizedTeamName });

  if (!team) {
    const teamKey = crypto.randomBytes(24).toString("hex");
    team = await Team.create({
      teamName: displayName,
      normalizedTeamName,
      teamKey,
    });

    return {
      team,
      teamKey,
      isNew: true,
    };
  }

  if (providedTeamKey && providedTeamKey === team.teamKey) {
    return {
      team,
      teamKey: team.teamKey,
      isNew: false,
    };
  }

  const error = new Error(
    "Team name is already claimed. Use the original device for this team.",
  );
  error.code = "TEAM_CLAIMED";
  throw error;
}

export async function getTeamBySession(teamId, teamKey) {
  await connectDB();
  if (!teamId || !teamKey) {
    return null;
  }

  const team = await Team.findById(teamId).lean();
  if (!team) {
    return null;
  }

  if (team.teamKey !== teamKey) {
    return null;
  }

  return team;
}

export async function saveColleague(name, faceDescriptor) {
  await connectDB();
  const colleague = await Colleague.findOneAndUpdate(
    { name },
    { name, faceDescriptor: Array.from(faceDescriptor) },
    { upsert: true, new: true, lean: true },
  );
  return colleague;
}

export async function getAllColleagues() {
  await connectDB();
  return await Colleague.find().lean();
}

export async function getColleagueByName(name) {
  await connectDB();
  return await Colleague.findOne({ name }).lean();
}

export async function deleteColleague(name) {
  await connectDB();
  return await Colleague.deleteOne({ name });
}

export async function saveScore(team, timeTaken, errors) {
  await connectDB();
  const score = new Score({
    teamId: team._id,
    teamName: team.teamName,
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
  return await Score.find({ teamId: teamName })
    .sort({ completedAt: -1 })
    .lean();
}

export async function getAllScores() {
  await connectDB();
  return await Score.find().sort({ createdAt: -1 }).lean();
}
