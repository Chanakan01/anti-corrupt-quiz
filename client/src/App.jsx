import React, { useEffect, useState } from "react";
import { socket } from "./socket";
import HomeScreen from "./components/HomeScreen";
import HostScreen from "./components/HostScreen";
import PlayerScreen from "./components/PlayerScreen";

function getOrCreatePlayerId() {
  let id = localStorage.getItem("playerId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("playerId", id);
  }
  return id;
}

export default function App() {
  const [mode, setMode] = useState("home"); // home | host | player
  const [roomCode, setRoomCode] = useState("");
  const [playerId, setPlayerId] = useState(getOrCreatePlayerId());
  const [roomState, setRoomState] = useState(null);
  const [me, setMe] = useState(null); // player object ของเรา

  useEffect(() => {
    socket.on("room:update", (room) => {
      setRoomState(room);
      const mine = room.players.find((p) => p.playerId === playerId);
      if (mine) setMe(mine);
    });

    socket.on("room:question:start", (payload) => {
      setRoomState((prev) =>
        prev
          ? { ...prev, state: "question", currentQuestionIndex: payload.questionIndex }
          : prev
      );
    });

    socket.on("room:game:ended", ({ leaderboard }) => {
      setRoomState((prev) =>
        prev ? { ...prev, state: "ended", leaderboard } : prev
      );
    });

    return () => {
      socket.off("room:update");
      socket.off("room:question:start");
      socket.off("room:game:ended");
    };
  }, [playerId]);

  const handleCreated = (code) => {
    setRoomCode(code);
    setMode("host");
  };

  const handleJoined = (code) => {
    setRoomCode(code);
    setMode("player");
  };

  return (
    <div className="app-root">
      {mode === "home" && (
        <HomeScreen
          onHostCreated={handleCreated}
          onJoinSuccess={handleJoined}
          playerId={playerId}
        />
      )}
      {mode === "host" && (
        <HostScreen
          roomCode={roomCode}
          roomState={roomState}
          playerId={playerId}
        />
      )}
      {mode === "player" && (
        <PlayerScreen
          roomCode={roomCode}
          roomState={roomState}
          playerId={playerId}
        />
      )}
    </div>
  );
}
