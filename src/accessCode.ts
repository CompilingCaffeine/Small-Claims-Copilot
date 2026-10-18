// The hosted copy runs live AI only for people with an access code. The code is kept
// in this browser, like the case itself, and sent with every request to the server.
import { useEffect, useState } from "react";

const KEY = "scc:access-code";

let current = read();

function read(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function accessCode(): string {
  return current;
}

export function setAccessCode(code: string) {
  current = code;
  try {
    if (code) window.localStorage.setItem(KEY, code);
    else window.localStorage.removeItem(KEY);
  } catch {
    // Remembering the code is a convenience; it still works until the tab closes.
  }
}

/** Whether the server asks for a code (the hosted copy). False until it answers. */
export function useAccessCodeRequired(): boolean {
  const [required, setRequired] = useState(false);
  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: { accessCodeRequired?: boolean }) => setRequired(data.accessCodeRequired === true))
      .catch(() => {});
  }, []);
  return required;
}
