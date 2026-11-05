import { TrainingWorkspace } from "@/components/workspaces/training";
import { LiveTraining } from "@/components/workspaces/live-training";
import { LiveSwitch } from "@/components/auth/live-gate";

export const metadata = { title: "Training" };

export default function TrainingPage() {
  return <LiveSwitch demo={<TrainingWorkspace />} live={<LiveTraining />} />;
}
