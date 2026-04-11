import type { ActivityItem, Challenge } from "@/types";

export const MOCK_CHALLENGES: Challenge[] = [
  {
    id: "demo-1",
    name: "Morning lifters",
    daysPerWeek: 4,
    durationMinutes: 40,
    challengeKind: "split_focus",
    focus: { splitId: "push" },
    goalSummary: "Push (chest, shoulders, triceps) · 4×/week · 40 min",
    inviteCode: "DEMO2026",
    participants: [
      {
        userId: "u1",
        name: "Ajay",
        streak: 12,
        completedDays: 3,
        lastCheckin: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      },
      {
        userId: "u2",
        name: "John",
        streak: 4,
        completedDays: 2,
        lastCheckin: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      },
      {
        userId: "u3",
        name: "Sam",
        streak: 8,
        completedDays: 4,
        lastCheckin: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      },
    ],
    myProgress: {
      streak: 12,
      completedDaysTotal: 3,
      weeklyGoal: 4,
    },
  },
  {
    id: "demo-2",
    name: "Weekend warriors",
    daysPerWeek: 3,
    durationMinutes: 45,
    challengeKind: "attendance",
    goalSummary: "3×/week · 45 min · general gym habit",
    inviteCode: "WKND01",
    participants: [
      {
        userId: "u1",
        name: "Ajay",
        streak: 5,
        completedDays: 2,
        lastCheckin: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      },
      {
        userId: "u4",
        name: "Maya",
        streak: 9,
        completedDays: 3,
        lastCheckin: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
      },
    ],
    myProgress: {
      streak: 5,
      completedDaysTotal: 2,
      weeklyGoal: 3,
    },
  },
];

export const MOCK_ACTIVITIES: ActivityItem[] = [
  {
    id: "a1",
    message: "Ajay checked in at gym",
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: "a2",
    message: "John missed today",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: "a3",
    message: "Sam completed today's workout",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
];

export function getMockChallenge(id: string): Challenge | undefined {
  return MOCK_CHALLENGES.find((c) => c.id === id);
}
