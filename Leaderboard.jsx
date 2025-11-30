import React from "react";

export default function Leaderboard({ leaderboard, animate }) {
  return (
    <div className={"leaderboard" + (animate ? " animate" : "")}>
      {leaderboard.map((p) => (
        <div key={p.playerId} className="leaderboard-row">
          <div className="rank">#{p.rank}</div>
          <div className="name">{p.name}</div>
          <div className="score">{p.score} pts</div>
        </div>
      ))}
    </div>
  );
}
