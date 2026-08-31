// ============================================================
// RAME — konstanta domain (pengganti enum agar kompatibel SQLite)
// ============================================================

export const ROLES = {
  EO: "EO",
  COMMUNITY: "COMMUNITY",
  VENUE: "VENUE",
  MEDIA: "MEDIA",
  ADMIN: "ADMIN",
} as const;

export const USER_ROLES = {
  PARTICIPANT: "PARTICIPANT",
  ORGANIZER: "ORGANIZER",
  ADMIN: "ADMIN",
} as const;

export const EVENT_STATUS = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const;

export const JOURNEY_MODES = {
  LINEAR: "LINEAR",
  BRANCHING: "BRANCHING",
  FREE_EXPLORATION: "FREE_EXPLORATION",
  HYBRID: "HYBRID",
} as const;

export const ACTIVITY_TYPES = {
  PHOTO: "PHOTO",
  QUIZ: "QUIZ",
  QR_CHECKIN: "QR_CHECKIN",
  FEEDBACK: "FEEDBACK",
  SCAVENGER: "SCAVENGER",
  CUSTOM: "CUSTOM",
} as const;

export const COMPLETION_METHODS = {
  AUTO: "AUTO",
  ORGANIZER_VERIFY: "ORGANIZER_VERIFY",
  QR_VERIFY: "QR_VERIFY",
  UPLOAD: "UPLOAD",
} as const;

export const VERIFY_STATUS = {
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
  SYNCED: "SYNCED",
  DUPLICATE: "DUPLICATE",
  CONFLICT: "CONFLICT",
} as const;

export const OFFLINE_STATUS = {
  PENDING: "PENDING",
  SYNCED: "SYNCED",
  DUPLICATE: "DUPLICATE",
  CONFLICT: "CONFLICT",
  REJECTED: "REJECTED",
} as const;

export const LOG_ACTIONS = {
  EVENT_JOINED: "EVENT_JOINED",
  ACTIVITY_STARTED: "ACTIVITY_STARTED",
  ACTIVITY_COMPLETED: "ACTIVITY_COMPLETED",
  VERIFICATION_COMPLETED: "VERIFICATION_COMPLETED",
  STAMP_AWARDED: "STAMP_AWARDED",
  XP_AWARDED: "XP_AWARDED",
  ACHIEVEMENT_UNLOCKED: "ACHIEVEMENT_UNLOCKED",
  CREDENTIAL_ELIGIBLE: "CREDENTIAL_ELIGIBLE",
  CREDENTIAL_ISSUED: "CREDENTIAL_ISSUED",
  FEEDBACK_SUBMITTED: "FEEDBACK_SUBMITTED",
  SCAN_REJECTED: "SCAN_REJECTED",
  OFFLINE_SYNCED: "OFFLINE_SYNCED",
} as const;

export const CREDENTIAL_STATUS = {
  ELIGIBLE: "ELIGIBLE",
  PENDING: "PENDING",
  ISSUED: "ISSUED",
  FAILED: "FAILED",
  REVOKED: "REVOKED",
} as const;

export const ELIGIBILITY_POLICIES = {
  EVENT_COMPLETION: "EVENT_COMPLETION",
  MILESTONE: "MILESTONE",
  ACHIEVEMENT: "ACHIEVEMENT",
  CUSTOM: "CUSTOM",
} as const;

export const FEEDBACK_TYPES = {
  RATING: "RATING",
  TEXT: "TEXT",
  CHOICE: "CHOICE",
} as const;

export const ACHIEVEMENT_CONDITIONS = {
  ALL_ACTIVITIES: "ALL_ACTIVITIES",
  N_ACTIVITIES: "N_ACTIVITIES",
  STAMPS_COUNT: "STAMPS_COUNT",
  CUSTOM: "CUSTOM",
} as const;

export const QR_TTL_SECONDS = 120; // QR dinamis berlaku 2 menit

export const EID_MODES = {
  MOCK: "mock",
  SANDBOX: "sandbox",
  PRODUCTION: "production",
} as const;

export const JOURNEY_MODE_LABEL: Record<string, { id: string; en: string }> = {
  LINEAR: { id: "Linier", en: "Linear" },
  BRANCHING: { id: "Bercabang", en: "Branching" },
  FREE_EXPLORATION: { id: "Eksplorasi Bebas", en: "Free Exploration" },
  HYBRID: { id: "Hibrida", en: "Hybrid" },
};

export const COMPLETION_METHOD_LABEL: Record<string, { id: string; en: string }> = {
  AUTO: { id: "Otomatis", en: "Automatic" },
  ORGANIZER_VERIFY: { id: "Verifikasi Panitia", en: "Organizer verification" },
  QR_VERIFY: { id: "Scan QR", en: "QR scan" },
  UPLOAD: { id: "Unggah Bukti", en: "Upload proof" },
};
