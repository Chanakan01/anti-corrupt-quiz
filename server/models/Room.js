import mongoose from "mongoose";

const PlayerSchema = new mongoose.Schema({
  playerId: String,        // token เก็บใน localStorage
  socketId: String,
  name: String,
  avatarId: String,
  score: { type: Number, default: 0 },
  stunnedUntilIndex: { type: Number, default: -1 },
  powers: [
    {
      type: { type: String }, // e.g. "PLUS", "MINUS", "SWAP_LOW", ...
      used: { type: Boolean, default: false }
    }
  ],
  answeredQuestions: [
    {
      questionIndex: Number,
      answerIndex: Number,
      correct: Boolean
    }
  ]
});

const RoomSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  hostSocketId: String,
  state: {
    type: String,
    enum: ["lobby", "question", "results", "ended"],
    default: "lobby"
  },
  currentQuestionIndex: { type: Number, default: 0 },
  questionEndsAt: Date,
  players: [PlayerSchema],
  usedAvatars: [String],
  createdAt: { type: Date, default: Date.now }
});

export const Room = mongoose.model("Room", RoomSchema);
