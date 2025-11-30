import React, { useEffect, useState } from "react";
import wheelSvg from "../assets/ui/wheel.svg";

export default function WheelModal({ questionIndex, powers, players, onUsePower }) {
  const [showWheel, setShowWheel] = useState(true);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    // แค่โชว์เอฟเฟกต์หมุน (ผลจริงๆ คิดฝั่ง server แล้วใน power list)
    const base = 720 + Math.random() * 360;
    setRotation(base);
    const t = setTimeout(() => setShowWheel(false), 2000);
    return () => clearTimeout(t);
  }, [questionIndex]);

  const usablePowers = powers.filter((p) => !p.used);

  if (!usablePowers.length && !showWheel) return null;

  return (
    <div className="modal-overlay">
      <div className="modal wheel-modal">
        {showWheel && (
          <>
            <h3>สุ่มน้ำยาพิเศษ!</h3>
            <div className="wheel-container">
              <img
                src={wheelSvg}
                className="wheel-image"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
              <div className="wheel-pointer" />
            </div>
          </>
        )}

        {!showWheel && usablePowers.length > 0 && (
          <>
            <h3>เลือกใช้พลังของคุณ</h3>
            <div className="power-list">
              {usablePowers.map((p, idx) => (
                <PowerRow
                  key={idx}
                  power={p}
                  players={players}
                  onUse={(targetId) => onUsePower(idx, targetId)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const POWER_LABEL = {
  PLUS: "น้ำยาเพิ่มคะแนน (+1000 ถึง +7000)",
  MINUS: "น้ำยาเผาคะแนน (-1000 ถึง -7000)",
  SWAP_LOW: "สลับคะแนนกับผู้เล่นคะแนนต่ำสุด",
  SWAP_HIGH: "สลับคะแนนกับผู้เล่นคะแนนสูงสุด",
  X2_SCORE: "คูณ 2 คะแนนที่มีอยู่",
  STUN: "ระเบิดสตั้น (ทำให้ข้าม 1 ข้อ)",
  FINAL_X4: "น้ำยาโค้งสุดท้าย (คูณ 4 คะแนน)"
};

function PowerRow({ power, players, onUse }) {
  const [target, setTarget] = useState("");

  const needTarget = ["MINUS", "STUN", "SWAP_LOW", "SWAP_HIGH"].includes(
    power.type
  );

  const handleClick = () => {
    if (needTarget && !target) return;
    onUse(target || null);
  };

  return (
    <div className="power-row">
      <div className="power-info">
        <div className="power-type">{power.type}</div>
        <div className="power-desc">{POWER_LABEL[power.type]}</div>
      </div>
      {needTarget && (
        <select
          className="input small"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          <option value="">เลือกเป้าหมาย</option>
          {players.map((p) => (
            <option key={p.playerId} value={p.playerId}>
              {p.name} ({p.score} pts)
            </option>
          ))}
        </select>
      )}
      <button className="btn tiny" onClick={handleClick}>
        ใช้พลัง
      </button>
    </div>
  );
}
