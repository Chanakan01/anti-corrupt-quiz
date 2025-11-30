import React from "react";
import avatarClean from "../assets/avatars/avatar-clean-politician.svg";
import avatarActivist from "../assets/avatars/avatar-young-activist.svg";
import avatarWhistle from "../assets/avatars/avatar-whistleblower.svg";
import avatarJudge from "../assets/avatars/avatar-judge.svg";

const avatars = [
  { id: "avatar-clean-politician", label: "นักการเมืองโปร่งใส", src: avatarClean },
  { id: "avatar-young-activist", label: "เยาวชนต่อต้านโกง", src: avatarActivist },
  { id: "avatar-whistleblower", label: "ผู้เปิดโปงการโกง", src: avatarWhistle },
  { id: "avatar-judge", label: "ตุลาการยุติธรรม", src: avatarJudge }
];

export default function AvatarPicker({ value, onChange, disabledIds = [] }) {
  return (
    <div className="avatar-picker">
      <div className="avatar-picker-title">เลือกตัวละคร</div>
      <div className="avatar-grid">
        {avatars.map((a) => {
          const taken = disabledIds.includes(a.id);
          const selected = value === a.id;
          return (
            <button
              key={a.id}
              type="button"
              className={
                "avatar-item" +
                (selected ? " selected" : "") +
                (taken ? " disabled" : "")
              }
              disabled={taken}
              onClick={() => !taken && onChange(a.id)}
            >
              <img src={a.src} alt={a.label} />
              <span>{a.label}</span>
              {taken && <div className="avatar-taken-overlay">ถูกเลือกแล้ว</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
