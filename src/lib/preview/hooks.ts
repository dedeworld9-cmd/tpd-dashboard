"use client";

import { useEffect, useState } from "react";
import { actorFor, currentMember, openSessionFor, usePreview, type PreviewState } from "./store";

/** The signed-in member (preview persona), their authorization actor and open session. */
export function useMe() {
  return usePreview((s: PreviewState) => {
    const member = currentMember(s);
    return { member, actor: actorFor(member), role: s.role, session: openSessionFor(s, member.id) };
  });
}

/** Re-renders every `ms` while `active`. Returns the current epoch ms (0 before mount). */
export function useNow(ms = 1000, active = true) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms, active]);
  return now;
}
