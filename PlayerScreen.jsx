import React, { useEffect, useState } from "react";
import { socket } from "../socket";
import WheelModal from "./WheelModal";
import AttackOverlay from "./AttackOverlay";

export default function PlayerScreen({ roomCode, playerId, roomState }) {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [answerError, setAnswerError] = useState("");
  const [results, setResults] = useState(null);
  const [myPowers, setMyPowers] = useState([]);
  const [attackEvent, setAttackEvent] = useState(null);

  useEffect(() => {
    socket.on("room:question:start", (payload) => {
      setCurrentQuestion(payload);
      setSelectedIndex(null);
      setAnswerError("");
      setResults(null);
    });

    socket.on("room:question:results", (payload) => {
      setResults(payload);
      const mine = payload.playersPowers.find(
        (p) => p.playerId === playerId
      );
      if (mine) {
        setMyPowers(mine.powers);
      }
    });

    socket.on("room:power:used", (payload) => {
      setAttackEvent(payload);
      setTimeout(() => setAttackEvent(null), 2500);
    });

    return () => {
      socket.off("room:question:start");
      socket.off("room:question:results");
      socket.off("room:power:used");
    };
  }, [playerId]);

  const handleAnswer = (idx) => {
    if (!currentQuestion) return;
    if (selectedIndex !== null) return;
    setAnswerError("");

    socket.emit(
      "player:submitAnswer",
      { roomCode, playerId, answerIndex: idx },
      (res) => {
        if (res.error) {
          setAnswerError(res.error);
        } else {
          setSelectedIndex(idx);
        }
      }
    );
  };

  const handleUsePower = (powerIndex, targetPlayerId) => {
    socket.emit(
      "player:usePower",
      { roomCode, playerId, targetPlayerId, powerIndex },
      (res) => {
        if (res.error) {
          alert(res.error);
        }
      }
    );
  };

  const myScore = roomState?.players?.find((p) => p.playerId === playerId)?.score || 0;

  return (
    <div className="screen player-screen">
      {attackEvent && <AttackOverlay event={attackEvent} meId={playerId} />}

      <div className="top-bar">
        <div className="room-code-badge">ROOM: {roomCode}</div>
        <div className="host-label">คะแนนของคุณ: {myScore} pts</div>
      </div>

      {currentQuestion ? (
        <div className="question-card">
          <div className="question-header">
            <span>ข้อที่ {currentQuestion.questionIndex + 1}</span>
            <span>คะแนน: {currentQuestion.question.effectiveScore}</span>
          </div>
          <div className="question-text">
            {currentQuestion.question.text}
          </div>
          <div className="options-grid">
            {currentQuestion.question.options.map((opt, idx) => {
              const selected = selectedIndex === idx;
              return (
                <button
                  key={idx}
                  className={
                    "option answer-option" + (selected ? " selected" : "")
                  }
                  onClick={() => handleAnswer(idx)}
                  disabled={selectedIndex !== null}
                >
                  {String.fromCharCode(65 + idx)}. {opt}
                </button>
              );
            })}
          </div>
          {answerError && <div className="error-text">{answerError}</div>}
        </div>
      ) : (
        <div className="card center">
          <p>รอ Host เริ่มเกมหรือขึ้นคำถามถัดไป...</p>
        </div>
      )}

      {results && (
        <WheelModal
          questionIndex={results.questionIndex}
          powers={myPowers}
          players={roomState.players}
          onUsePower={handleUsePower}
        />
      )}
    </div>
  );
}
