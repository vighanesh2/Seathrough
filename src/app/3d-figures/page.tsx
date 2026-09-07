import { redirect } from "next/navigation";

/** Legacy 3D body URL — 3D now lives on the lesson page. */
export default function ThreeDFiguresPage() {
  redirect("/lessons");
}
