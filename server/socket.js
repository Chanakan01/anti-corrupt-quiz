import { Room } from "./models/Room.js";
import questions from "./data/questions.json" assert { type: "json" };

const activeTimers = new Map(); // roomCode -> timeoutId

// กำหนดชื่อพลัง
export const POWERS = {
  PLUS: "PLUS",
  MINUS: "MINUS",
  SWAP_LOW: "SWAP_LOW",
  SWAP_HIGH: "SWAP_HIGH",
  X2_SCORE: "X2_SCORE",
  STUN: "STUN",
  FINAL_X4: "FINAL_X4"
};

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function getQuestionWithMultiplier(index) {
  const q = questions[index];
  const isLast = index === questions.length - 1;
  return {
    ...q,
    effectiveScore: isLast ? q.baseScore * 4 : q.baseScore,
    isLast
  };
}

function getRandomPower(questionIndex) {
  const isLast = questionIndex === questions.length - 1;
  const pool = [
    POWERS.PLUS,
    POWERS.MINUS,
    POWERS.SWAP_LOW,
    POWERS.SWAP_HIGH,
    POWERS.X2_SCORE,
    POWERS.STUN
  ];
  if (isLast) pool.push(POWERS.FINAL_X4);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function initSocket(io) {
  io.on("connection", (socket) => {
    console.log("Client connected", socket.id);

    socket.on("host:createRoom", async (cb) => {
      const code = await createUniqueRoomCode();
      const room = await Room.create({
        code,
        hostSocketId: socket.id,
        state: "lobby",
        currentQuestionIndex: 0,
        players: [],
        usedAvatars: []
      });
      socket.join(code);
      cb({ roomCode: code });
      io.to(socket.id).emit("room:update", room);
    });

    socket.on("room:join", async ({ roomCode, name, avatarId, playerId }, cb) => {
      const room = await Room.findOne({ code: roomCode });
      if (!room) return cb({ error: "Room not found" });

      // reuse player if reload
      let player =
        room.players.find((p) => p.playerId === playerId) || null;

      if (!player) {
        if (room.usedAvatars.includes(avatarId)) {
          return cb({ error: "Avatar already taken" });
        }
        player = {
          playerId,
          socketId: socket.id,
          name,
          avatarId,
          score: 0,
          stunnedUntilIndex: -1,
          powers: [],
          answeredQuestions: []
        };
        room.players.push(player);
        room.usedAvatars.push(avatarId);
      } else {
        player.socketId = socket.id; // update connection
      }

      await room.save();
      socket.join(room.code);
      io.to(room.code).emit("room:update", room);
      cb({ ok: true, roomCode: room.code, playerId });
    });

    socket.on("host:startGame", async ({ roomCode }) => {
      const room = await Room.findOne({ code: roomCode });
      if (!room) return;
      room.state = "question";
      room.currentQuestionIndex = 0;
      await room.save();
      startQuestion(io, roomCode);
    });

    socket.on("player:submitAnswer", async ({ roomCode, playerId, answerIndex }, cb) => {
      const room = await Room.findOne({ code: roomCode });
      if (!room) return cb({ error: "Room not found" });

      const now = Date.now();
      if (room.questionEndsAt && now > room.questionEndsAt.getTime()) {
        return cb({ error: "Time is up" });
      }

      const player = room.players.find((p) => p.playerId === playerId);
      if (!player) return cb({ error: "Player not found" });

      const qIndex = room.currentQuestionIndex;

      if (player.stunnedUntilIndex >= qIndex) {
        return cb({ error: "You are stunned for this question" });
      }

      const already = player.answeredQuestions.find(
        (a) => a.questionIndex === qIndex
      );
      if (already) {
        return cb({ error: "Already answered" });
      }

      const q = getQuestionWithMultiplier(qIndex);
      const correct = answerIndex === q.correctIndex;
      player.answeredQuestions.push({ questionIndex: qIndex, answerIndex, correct });

      if (correct) {
        player.score += q.effectiveScore;
      }

      await room.save();
      io.to(room.code).emit("room:answers:update", {
        players: room.players.map((p) => ({
          name: p.name,
          score: p.score
        }))
      });

      cb({ ok: true, correct });
    });

    socket.on("player:usePower", async ({ roomCode, playerId, targetPlayerId, powerIndex }, cb) => {
      const room = await Room.findOne({ code: roomCode });
      if (!room) return cb({ error: "Room not found" });

      const actor = room.players.find((p) => p.playerId === playerId);
      const target = room.players.find((p) => p.playerId === targetPlayerId);
      if (!actor || !target) return cb({ error: "Player not found" });

      const power = actor.powers[powerIndex];
      if (!power || power.used) return cb({ error: "Invalid power" });

      // ใช้พลัง
      applyPower(power.type, actor, target, room);

      power.used = true;
      await room.save();

      io.to(room.code).emit("room:power:used", {
        powerType: power.type,
        actor: {
          playerId: actor.playerId,
          name: actor.name
        },
        target: {
          playerId: target.playerId,
          name: target.name
        },
        players: room.players.map((p) => ({
          playerId: p.playerId,
          name: p.name,
          score: p.score,
          stunnedUntilIndex: p.stunnedUntilIndex
        }))
      });

      cb({ ok: true });
    });

    socket.on("disconnect", async () => {
      console.log("Disconnected", socket.id);
      // (MVP) ยังไม่ลบ player ทิ้ง เผื่อ reconnect
    });
  });
}

async function createUniqueRoomCode() {
  while (true) {
    const code = generateRoomCode();
    const exists = await Room.findOne({ code });
    if (!exists) return code;
  }
}

function startQuestion(io, roomCode) {
  clearRoomTimer(roomCode);
  Room.findOne({ code: roomCode }).then(async (room) => {
    if (!room) return;

    const qIndex = room.currentQuestionIndex;
    if (qIndex >= questions.length) {
      endGame(io, room);
      return;
    }

    const question = getQuestionWithMultiplier(qIndex);
    const endsAt = new Date(Date.now() + 30000); // 30 วิ
    room.questionEndsAt = endsAt;
    room.state = "question";
    await room.save();

    io.to(room.code).emit("room:question:start", {
      questionIndex: qIndex,
      question: {
        id: question.id,
        text: question.text,
        options: question.options,
        effectiveScore: question.effectiveScore,
        isLast: question.isLast,
        remainingMs: 30000
      },
      endsAt
    });

    const timeoutId = setTimeout(() => finalizeQuestion(io, room.code), 31000);
    activeTimers.set(room.code, timeoutId);
  });
}

function clearRoomTimer(roomCode) {
  const t = activeTimers.get(roomCode);
  if (t) {
    clearTimeout(t);
    activeTimers.delete(roomCode);
  }
}

function finalizeQuestion(io, roomCode) {
  clearRoomTimer(roomCode);
  Room.findOne({ code: roomCode }).then(async (room) => {
    if (!room) return;
    const qIndex = room.currentQuestionIndex;
    const question = getQuestionWithMultiplier(qIndex);

    // ปล่อยพลังให้คนที่ตอบถูก
    room.players.forEach((p) => {
      const ans = p.answeredQuestions.find((a) => a.questionIndex === qIndex);
      if (ans && ans.correct) {
        const powerType = getRandomPower(qIndex);
        p.powers.push({ type: powerType, used: false });
      }
    });

    room.state = "results";
    await room.save();

    const leaderboard = [...room.players]
      .sort((a, b) => b.score - a.score)
      .map((p, idx) => ({
        rank: idx + 1,
        name: p.name,
        score: p.score,
        playerId: p.playerId
      }));

    io.to(room.code).emit("room:question:results", {
      questionIndex: qIndex,
      correctIndex: question.correctIndex,
      leaderboard,
      playersPowers: room.players.map((p) => ({
        playerId: p.playerId,
        powers: p.powers
      }))
    });

    // ดีเลย์ 4 วิ ก่อนข้อถัดไป
    setTimeout(async () => {
      room.currentQuestionIndex += 1;
      await room.save();
      if (room.currentQuestionIndex >= questions.length) {
        endGame(io, room);
      } else {
        startQuestion(io, room.code);
      }
    }, 4000);
  });
}

function endGame(io, room) {
  room.state = "ended";
  room.save().then(() => {
    const leaderboard = [...room.players]
      .sort((a, b) => b.score - a.score)
      .map((p, idx) => ({
        rank: idx + 1,
        name: p.name,
        score: p.score,
        playerId: p.playerId
      }));
    io.to(room.code).emit("room:game:ended", { leaderboard });
  });
}

function applyPower(type, actor, target, room) {
  switch (type) {
    case POWERS.PLUS: {
      const delta = randomInt(1000, 7000);
      actor.score += delta;
      break;
    }
    case POWERS.MINUS: {
      const delta = randomInt(1000, 7000);
      target.score -= delta;
      if (target.score < 0) target.score = 0;
      break;
    }
    case POWERS.SWAP_LOW: {
      const lowest = [...room.players].sort((a, b) => a.score - b.score)[0];
      if (lowest) {
        const tmp = actor.score;
        actor.score = lowest.score;
        lowest.score = tmp;
      }
      break;
    }
    case POWERS.SWAP_HIGH: {
      const highest = [...room.players].sort((a, b) => b.score - a.score)[0];
      if (highest) {
        const tmp = actor.score;
        actor.score = highest.score;
        highest.score = tmp;
      }
      break;
    }
    case POWERS.X2_SCORE: {
      actor.score *= 2;
      break;
    }
    case POWERS.STUN: {
      target.stunnedUntilIndex = room.currentQuestionIndex + 1;
      break;
    }
    case POWERS.FINAL_X4: {
      // พลังเสริมข้อสุดท้าย (อาจจะคูณเพิ่มหลังจากตอบข้อสุดท้ายแล้ว)
      actor.score *= 4;
      break;
    }
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
