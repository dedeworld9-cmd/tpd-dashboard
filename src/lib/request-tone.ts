import type { Tone } from "@/components/ui/primitives";
import type { RequestState } from "./sample-data";

export function stateTone(state: RequestState): Tone {
  switch (state) {
    case "Approved":
      return "green";
    case "Denied":
      return "red";
    case "Under review":
      return "blue";
    case "Submitted":
      return "amber";
    default:
      return "neutral";
  }
}
