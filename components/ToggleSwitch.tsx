import React from "react";

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const ToggleSwitch: React.FC<Props> = ({ checked, onChange, label, disabled }) => {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, opacity: disabled ? 0.6 : 1 }}>
      {label && <span>{label}</span>}
      <label style={{ position: "relative", display: "inline-block", width: 40, height: 20 }}>
        <input
          type="checkbox"
          disabled={disabled}
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          style={{ opacity: 0, width: 0, height: 0 }}
        />
        <span
          style={{
            position: "absolute",
            cursor: disabled ? "not-allowed" : "pointer",
            inset: 0,
            backgroundColor: checked ? "#4CAF50" : "#ccc",
            borderRadius: 20,
            transition: "0.3s"
          }}
        >
          <span
            style={{
              position: "absolute",
              height: 16,
              width: 16,
              left: checked ? 22 : 2,
              bottom: 2,
              backgroundColor: "white",
              borderRadius: "50%",
              transition: "0.3s"
            }}
          />
        </span>
      </label>
    </div>
  );
};