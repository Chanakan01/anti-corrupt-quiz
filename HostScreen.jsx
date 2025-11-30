import React, { useEffect, useState } from "react";
import { socket } from "../socket";
import Leaderboard from "./Leaderboard";

export default function HostScreen({ roomCode, roomState }) {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [results, setResults] = useState(null);

  useEffect(() => {
    socket.on("room:question:start", (payload) => {
      setCurrentQuestion(payload);
      setResults(null);
    });

    socket.on("room:question:results", (payload) => {
      setResults(payload);
    });

    return () => {
      socket.off("room:question:start");
      socket.off("room:question:results");
    };
  }, []);

  const handleStartGame = () => {
    socket.emit("host:startGame", { roomCode });
  };

  return (
    <div className="screen host-screen">
      <div className="top-bar">
        <div className="room-code-badge">
          ROOM CODE: <span>{roomCode}</span>
        </div>
        <div className="host-label">HOST PANEL</div>
      </div>

      <div className="host-layout">
        <div className="host-main">
          {!currentQuestion && (
            <div className="card center">
              <h2>รอผู้เล่นเข้าร่วม...</h2>
              <p>แสดงรหัสห้องนี้ให้ผู้เล่นเข้าร่วม</p>
              <button className="btn primary" onClick={handleStartGame}>
                เริ่มเกม
              </button>
            </div>
          )}

          {currentQuestion && (
            <div className="question-card">
              <div className="question-header">
                <span>ข้อที่ {currentQuestion.questionIndex + 1}</span>
                <span>
                  คะแนน: {currentQuestion.question.effectiveScore}
                  {currentQuestion.question.isLast && " (x4 ข้อสุดท้าย)"}
                </span>
              </div>
              <div className="question-text">
                {currentQuestion.question.text}
              </div>
              <div className="options-grid">
                {currentQuestion.question.options.map((opt, idx) => (
                  <div key={idx} className="option host-view">
                    {String.fromCharCode(65 + idx)}. {opt}
                  </div>
                ))}
              </div>
              <Timer endsAt={currentQuestion.endsAt} />
            </div>
          )}

          {roomState?.state === "ended" && roomState.leaderboard && (
            <div className="card">
              <h2>ผลสรุปเกม</h2>
              <Leaderboard leaderboard={roomState.leaderboard} animate />
            </div>
          )}
        </div>

        <div className="host-sidebar">
          <h3>ผู้เล่น</h3>
          <ul className="player-list">
            {roomState?.players?.map((p) => (
              <li key={p.playerId}>
                <span>{p.name}</span>
                <span className="score">{p.score} pts</span>
              </li>
            ))}
          </ul>

          {results && (
            <>
              <h3>Leaderboard</h3>
              <Leaderboard leaderboard={results.leaderboard} animate />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Timer({ endsAt }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!endsAt) return;
    const end = new Date(endsAt).getTime();
    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, end - now);
      setRemaining(diff);
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [endsAt]);

  const seconds = Math.ceil(remaining / 1000);

  return (
    <div className="timer-bar">
      <div className="timer-label">เหลือเวลา {seconds} วินาที</div>
      <div className="timer-track">
        <div
          className="timer-fill"
          style={{ width: `${(remaining / 30000) * 100}%` }}
        />
      </div>
    </div>
  );
}
