import React, { useState } from "react";
import { socket } from "../socket";
import AvatarPicker from "./AvatarPicker";

export default function HomeScreen({ onHostCreated, onJoinSuccess, playerId }) {
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [name, setName] = useState("");
  const [avatarId, setAvatarId] = useState("avatar-clean-politician");
  const [error, setError] = useState("");

  const handleCreateRoom = () => {
    socket.emit("host:createRoom", ({ roomCode }) => {
      onHostCreated(roomCode);
    });
  };

  const handleJoinRoom = () => {
    setError("");
    if (!joinRoomCode || !name) {
      setError("กรุณากรอกรหัสห้องและชื่อผู้เล่น");
      return;
    }

    socket.emit(
      "room:join",
      { roomCode: joinRoomCode.toUpperCase(), name, avatarId, playerId },
      (res) => {
        if (res.error) setError(res.error);
        else onJoinSuccess(res.roomCode);
      }
    );
  };

  return (
    <div className="screen home-screen">
      <div className="logo-box">
        <div className="logo-icon" />
        <div className="logo-text">
          เกมตอบคำถาม<br />ป้องกันการทุจริต
        </div>
      </div>

      <div className="card">
        <h2>สร้างหรือเข้าร่วมห้องเกม</h2>
        <button className="btn primary" onClick={handleCreateRoom}>
          Create Room
        </button>

        <div className="divider">หรือ</div>

        <div className="join-form">
          <input
            className="input"
            placeholder="Room Code"
            value={joinRoomCode}
            onChange={(e) => setJoinRoomCode(e.target.value)}
          />
          <input
            className="input"
            placeholder="ชื่อตัวละคร"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <AvatarPicker value={avatarId} onChange={setAvatarId} />
          <button className="btn secondary" onClick={handleJoinRoom}>
            Join Room
          </button>
          {error && <div className="error-text">{error}</div>}
        </div>
      </div>
    </div>
  );
}
