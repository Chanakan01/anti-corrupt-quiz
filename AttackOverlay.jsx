import React from "react";

export default function AttackOverlay({ event, meId }) {
  const isVictim = event.target.playerId === meId;
  const isActor = event.actor.playerId === meId;

  return (
    <div className="attack-overlay">
      <div className="attack-box">
        <div className="attack-beam" />
        <div className="attack-burst" />
        <h3>
          {event.actor.name} ใช้พลัง {event.powerType} ใส่ {event.target.name}
        </h3>
        {isVictim && <p>คุณกำลังโดนโจมตี! ระวังคะแนนของคุณ!</p>}
        {isActor && <p>คุณใช้พลังโจมตีแล้ว!</p>}
      </div>
    </div>
  );
}
