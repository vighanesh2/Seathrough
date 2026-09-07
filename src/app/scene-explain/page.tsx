import { redirect } from "next/navigation";

/** Legacy 3D scenes URL — agent scenes now live on the lesson page. */
export default function SceneExplainPage() {
  redirect("/lessons?view=3d");
}
