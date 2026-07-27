import { setup, assign } from "xstate";

/**
 * Lesson control — coordinates draw / speak / interrupt (Deepgram + board).
 * Matches the MVP stack doc state list.
 */
export const lessonMachine = setup({
  types: {
    context: {} as {
      beatIndex: number;
      title?: string;
      interrupted: boolean;
      error?: string;
    },
    events: {} as
      | { type: "START"; title?: string }
      | { type: "PLAN_READY" }
      | { type: "VALIDATED" }
      | { type: "DRAW_DONE" }
      | { type: "SPEAK_DONE" }
      | { type: "NEXT_BEAT" }
      | { type: "INTERRUPT" }
      | { type: "RESUME" }
      | { type: "ERROR"; message: string }
      | { type: "COMPLETE" }
      | { type: "RESET" },
  },
}).createMachine({
  id: "visualLesson",
  initial: "idle",
  context: {
    beatIndex: 0,
    interrupted: false,
  },
  states: {
    idle: {
      on: {
        START: {
          target: "planning",
          actions: assign({
            title: ({ event }) => event.title,
            beatIndex: 0,
            interrupted: false,
            error: undefined,
          }),
        },
      },
    },
    planning: {
      on: {
        PLAN_READY: "validating",
        ERROR: {
          target: "error",
          actions: assign({
            error: ({ event }) => event.message,
          }),
        },
        INTERRUPT: "interrupted",
        RESET: "idle",
      },
    },
    validating: {
      on: {
        VALIDATED: "drawing",
        ERROR: {
          target: "error",
          actions: assign({
            error: ({ event }) => event.message,
          }),
        },
        INTERRUPT: "interrupted",
        RESET: "idle",
      },
    },
    drawing: {
      on: {
        DRAW_DONE: "speaking",
        INTERRUPT: "interrupted",
        RESET: "idle",
      },
    },
    speaking: {
      on: {
        SPEAK_DONE: "waiting_for_student",
        NEXT_BEAT: {
          target: "validating",
          actions: assign({
            beatIndex: ({ context }) => context.beatIndex + 1,
          }),
        },
        INTERRUPT: "interrupted",
        COMPLETE: "idle",
        RESET: "idle",
      },
    },
    waiting_for_student: {
      on: {
        NEXT_BEAT: {
          target: "validating",
          actions: assign({
            beatIndex: ({ context }) => context.beatIndex + 1,
          }),
        },
        COMPLETE: "idle",
        INTERRUPT: "interrupted",
        RESET: "idle",
      },
    },
    interrupted: {
      entry: assign({ interrupted: true }),
      on: {
        RESUME: {
          target: "planning",
          actions: assign({ interrupted: false }),
        },
        RESET: "idle",
      },
    },
    error: {
      on: {
        RESET: "idle",
        START: "planning",
      },
    },
  },
});

export type LessonMachine = typeof lessonMachine;
