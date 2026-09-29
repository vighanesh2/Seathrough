/** Smart tutor recordings are "lesson"; films from /video are "explain-video" (stored as lesson.kind). */
export type SavedVideoKind = "lesson" | "explain-video";

export const EXPLAIN_VIDEO_KIND = "explain-video" satisfies SavedVideoKind;
