import { redirect } from "next/navigation";

/** Legacy photo explain URL — retired from the product. */
export default function ImageExplainPage() {
  redirect("/lessons");
}
