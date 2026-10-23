import React from "react";
import { sans } from "../theme/tokens.js";

export default function Field({ label, hint, children }) {
  return (
    <label style={{ display: "block", marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontFamily: sans, fontSize: 12.5, color: "#5C6B84", fontWeight: 500 }}>
          {label}
        </span>
        {hint && (
          <span style={{ fontFamily: sans, fontSize: 11, color: "#8A8266" }}>
            {hint}
          </span>
        )}
      </div>
      {children}
    </label>
  );
}
