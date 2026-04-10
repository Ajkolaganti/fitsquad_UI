import type { ChallengeFocus, ChallengeKind } from "@/types";

/** Training split / muscle emphasis — selector chips */
export const SPLIT_TYPES = [
  { id: "push", label: "Push (chest, shoulders, triceps)" },
  { id: "pull", label: "Pull (back, biceps)" },
  { id: "legs", label: "Legs" },
  { id: "full_body", label: "Full body" },
  { id: "upper_lower", label: "Upper / lower split" },
  { id: "core", label: "Core" },
  { id: "arms", label: "Arms" },
  { id: "cardio", label: "Cardio / conditioning" },
] as const;

export type SplitTypeId = (typeof SPLIT_TYPES)[number]["id"];

/** Modality / equipment filter for exercise list */
export const MODALITIES = [
  { id: "barbell", label: "Barbell" },
  { id: "dumbbell_kb", label: "Dumbbell / KB" },
  { id: "machine", label: "Machine / cable" },
  { id: "bodyweight", label: "Bodyweight" },
  { id: "olympic", label: "Olympic lifts" },
  { id: "mobility", label: "Mobility / recovery" },
  { id: "cardio", label: "Cardio" },
] as const;

export type ModalityId = (typeof MODALITIES)[number]["id"];

export interface CatalogExercise {
  id: string;
  label: string;
  modalityId: ModalityId;
}

/** Curated list for searchable selector (~45 items) */
export const EXERCISES: CatalogExercise[] = [
  { id: "bb_back_squat", label: "Back squat", modalityId: "barbell" },
  { id: "bb_front_squat", label: "Front squat", modalityId: "barbell" },
  { id: "bb_romanian_dl", label: "Romanian deadlift", modalityId: "barbell" },
  { id: "bb_conventional_dl", label: "Conventional deadlift", modalityId: "barbell" },
  { id: "bb_bench", label: "Bench press", modalityId: "barbell" },
  { id: "bb_incline_bench", label: "Incline bench press", modalityId: "barbell" },
  { id: "bb_ohp", label: "Overhead press", modalityId: "barbell" },
  { id: "bb_row", label: "Barbell row", modalityId: "barbell" },
  { id: "bb_hip_thrust", label: "Barbell hip thrust", modalityId: "barbell" },
  { id: "bb_power_clean", label: "Power clean", modalityId: "olympic" },
  { id: "bb_snatch", label: "Snatch", modalityId: "olympic" },
  { id: "db_goblet_squat", label: "Goblet squat", modalityId: "dumbbell_kb" },
  { id: "db_bench", label: "Dumbbell bench press", modalityId: "dumbbell_kb" },
  { id: "db_shoulder_press", label: "Dumbbell shoulder press", modalityId: "dumbbell_kb" },
  { id: "db_row", label: "One-arm dumbbell row", modalityId: "dumbbell_kb" },
  { id: "db_lunge", label: "Walking lunge", modalityId: "dumbbell_kb" },
  { id: "kb_swing", label: "Kettlebell swing", modalityId: "dumbbell_kb" },
  { id: "kb_tgu", label: "Turkish get-up", modalityId: "dumbbell_kb" },
  { id: "m_leg_press", label: "Leg press", modalityId: "machine" },
  { id: "m_lat_pulldown", label: "Lat pulldown", modalityId: "machine" },
  { id: "m_seated_row", label: "Seated cable row", modalityId: "machine" },
  { id: "m_leg_curl", label: "Leg curl", modalityId: "machine" },
  { id: "m_leg_ext", label: "Leg extension", modalityId: "machine" },
  { id: "m_calf_raise", label: "Calf raise (machine)", modalityId: "machine" },
  { id: "m_fly", label: "Cable / pec fly", modalityId: "machine" },
  { id: "m_tricep_pushdown", label: "Tricep pushdown", modalityId: "machine" },
  { id: "m_face_pull", label: "Face pull", modalityId: "machine" },
  { id: "m_lateral_raise", label: "Lateral raise (cable/DB)", modalityId: "machine" },
  { id: "bw_pullup", label: "Pull-up / chin-up", modalityId: "bodyweight" },
  { id: "bw_dip", label: "Dip", modalityId: "bodyweight" },
  { id: "bw_pushup", label: "Push-up", modalityId: "bodyweight" },
  { id: "bw_plank", label: "Plank", modalityId: "bodyweight" },
  { id: "bw_hanging_leg_raise", label: "Hanging leg raise", modalityId: "bodyweight" },
  { id: "bw_pistol_squat", label: "Pistol squat (assisted)", modalityId: "bodyweight" },
  { id: "mob_foam_roll", label: "Foam rolling / SMR", modalityId: "mobility" },
  { id: "mob_yoga_flow", label: "Yoga flow for lifters", modalityId: "mobility" },
  { id: "mob_hip_mobility", label: "Hip mobility circuit", modalityId: "mobility" },
  { id: "cardio_row", label: "Rowing machine", modalityId: "cardio" },
  { id: "cardio_bike", label: "Assault / spin bike", modalityId: "cardio" },
  { id: "cardio_run", label: "Treadmill / running", modalityId: "cardio" },
  { id: "cardio_sled", label: "Sled push / pull", modalityId: "cardio" },
  { id: "carry_farmers", label: "Farmer's carry", modalityId: "dumbbell_kb" },
  { id: "curl_bb", label: "Barbell curl", modalityId: "barbell" },
  { id: "curl_db", label: "Dumbbell curl", modalityId: "dumbbell_kb" },
];

export function getSplitById(id: string) {
  return SPLIT_TYPES.find((s) => s.id === id);
}

export function getExerciseById(id: string) {
  return EXERCISES.find((e) => e.id === id);
}

export function filterExercisesByModality(
  modalityId: string | null
): CatalogExercise[] {
  if (!modalityId) return [...EXERCISES];
  return EXERCISES.filter((e) => e.modalityId === modalityId);
}

export interface GoalSummaryInput {
  challengeKind: ChallengeKind;
  daysPerWeek: number;
  durationMinutes: number;
  focus?: ChallengeFocus;
}

/** Human-readable line for cards and headers */
export function buildGoalSummary(input: GoalSummaryInput): string {
  const base = `${input.daysPerWeek}×/week · ${input.durationMinutes} min`;
  switch (input.challengeKind) {
    case "attendance":
      return `${base} · general gym habit`;
    case "split_focus": {
      const split = input.focus?.splitId
        ? getSplitById(input.focus.splitId)
        : undefined;
      return split ? `${split.label} · ${base}` : base;
    }
    case "exercise_focus": {
      const ex = input.focus?.exerciseId
        ? getExerciseById(input.focus.exerciseId)
        : undefined;
      return ex ? `${ex.label} · ${base}` : base;
    }
    case "custom_text": {
      const t = input.focus?.customText?.trim();
      return t ? `${t} · ${base}` : base;
    }
    default:
      return base;
  }
}

/** Build focus object from form state (omit empty fields) */
export function normalizeFocus(
  kind: ChallengeKind,
  partial: {
    splitId?: string;
    exerciseId?: string;
    modalityId?: string;
    customText?: string;
  }
): ChallengeFocus | undefined {
  switch (kind) {
    case "split_focus":
      return partial.splitId ? { splitId: partial.splitId } : undefined;
    case "exercise_focus":
      return partial.exerciseId
        ? {
            exerciseId: partial.exerciseId,
            ...(partial.modalityId ? { modalityId: partial.modalityId } : {}),
          }
        : undefined;
    case "custom_text":
      return partial.customText?.trim()
        ? { customText: partial.customText.trim() }
        : undefined;
    default:
      return undefined;
  }
}
