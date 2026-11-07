import type { Tone } from "@/components/ui/status";
import type { RequestState } from "@/lib/sample-data";

export function stateTone(state: RequestState): Tone {
  switch (state) {
    case "Approved":
      return "green";
    case "Denied":
      return "red";
    case "Under review":
      return "gold";
    case "Submitted":
      return "info";
    default:
      return "neutral";
  }
}
