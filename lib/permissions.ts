import { headers } from "next/headers";
import { auth } from "./auth";
import { InitiativeService } from "@/services/initiatives";

export const AdminAction = {
  // User management
  VIEW_USERS: "VIEW_USERS",
  DEACTIVATE_USER: "DEACTIVATE_USER",
  ASSIGN_MANAGER: "ASSIGN_MANAGER", // admin only

  // Organization management
  VIEW_ORGANIZATIONS: "VIEW_ORGANIZATIONS",
  APPROVE_ORGANIZATION: "APPROVE_ORGANIZATION", // admin only
  REJECT_ORGANIZATION: "REJECT_ORGANIZATION", // admin only
  FREEZE_ORGANIZATION: "FREEZE_ORGANIZATION", // admin only
  UNFREEZE_ORGANIZATION: "UNFREEZE_ORGANIZATION", // admin only
  REMOVE_ORGANIZATION: "REMOVE_ORGANIZATION", // admin only
  SET_FEATURED_PARTNER: "SET_FEATURED_PARTNER", // admin only

  // Initiative management
  VIEW_INITIATIVES: "VIEW_INITIATIVES",
  APPROVE_INITIATIVE: "APPROVE_INITIATIVE",
  REJECT_INITIATIVE: "REJECT_INITIATIVE",
  CANCEL_INITIATIVE: "CANCEL_INITIATIVE",
  DELETE_INITIATIVE: "DELETE_INITIATIVE",

  // Participation management
  APPROVE_PARTICIPATION: "APPROVE_PARTICIPATION",
  REJECT_PARTICIPATION: "REJECT_PARTICIPATION",
  KICK_PARTICIPANT: "KICK_PARTICIPANT",

  // Categories
  CREATE_CATEGORY: "CREATE_CATEGORY",
  UPDATE_CATEGORY: "UPDATE_CATEGORY",
  DELETE_CATEGORY: "DELETE_CATEGORY",

  // Support requests
  VIEW_SUPPORT_REQUESTS: "VIEW_SUPPORT_REQUESTS",
  CLOSE_SUPPORT_REQUEST: "CLOSE_SUPPORT_REQUEST",

  // Audit
  VIEW_AUDIT_LOG: "VIEW_AUDIT_LOG",
} as const;

export type AdminAction = (typeof AdminAction)[keyof typeof AdminAction];

export const ManagementAction = AdminAction;
export type ManagementAction = AdminAction;

export function isManagementRole(role?: string | null): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

// Actions restricted to ADMIN only
const ADMIN_ONLY = new Set<AdminAction>([
  AdminAction.ASSIGN_MANAGER,
  AdminAction.APPROVE_ORGANIZATION,
  AdminAction.FREEZE_ORGANIZATION,
  AdminAction.REMOVE_ORGANIZATION,
  AdminAction.SET_FEATURED_PARTNER,
]);

// Full set of privileged actions
const ALL_MANAGEMENT_ACTIONS = new Set<AdminAction>(Object.values(AdminAction));

// Manager gets everything except ADMIN_ONLY
const MANAGER_ACTIONS = new Set<AdminAction>(
  [...ALL_MANAGEMENT_ACTIONS].filter((a) => !ADMIN_ONLY.has(a)),
);

const POLICY: Record<string, Set<AdminAction>> = {
  ADMIN: ALL_MANAGEMENT_ACTIONS,
  MANAGER: MANAGER_ACTIONS,
  USER: new Set(),
};

/**
 * PDP evaluation function. Answers "can role perform action?"
 * @param role - the role of the user (ADMIN, MANAGER, USER)
 * @param action - the action to check (one of ManagementAction)
 * @returns boolean - true if the role can perform the action, false otherwise
 */
export function can(role: string, action: AdminAction): boolean {
  return POLICY[role]?.has(action) ?? false;
}

/**
 * Throws if the role cannot perform the action. Use at PEP boundaries.
 * @param role - the role of the user (ADMIN, MANAGER, USER)
 * @param action - the action to check (one of ManagementAction)
 */
export function enforce(role: string, action: AdminAction): void {
  if (!can(role, action)) {
    throw new Error(`Forbidden: ${role} cannot perform ${action}`);
  }
}

/**
 * Check if user is admin of the platform
 * @param allowManager - if true, allows MANAGER role as well
 * @returns User ID
 */
export async function checkAdminPermission(
  allowManager: boolean = false,
): Promise<string> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("يجب تسجيل الدخول");
  }

  if (session.user.role !== "ADMIN") {
    if (allowManager && session.user.role === "MANAGER") {
      return session.user.id;
    }
    throw new Error("غير مصرح لك بالوصول لهذه الصفحة");
  }

  return session.user.id;
}

/**
 * Helpers for initiative manager-only member management
 * @param initiativeId Initiative ID
 * @returns User ID
 */
export async function assertInitiativeManager(initiativeId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("unauthorized");
  const initiative = await InitiativeService.getById(
    initiativeId,
    session.user.id,
  );
  const isManager =
    initiative?.organizerUserId === session?.user.id ||
    initiative?.organizerOrg?.userId === session?.user.id;
  if (!isManager) throw new Error("forbidden");
  return { userId: session.user.id };
}
