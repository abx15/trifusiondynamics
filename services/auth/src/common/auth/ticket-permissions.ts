/**
 * Action-level permission strings for the helpdesk.
 *
 * These are granted per role in `packages/database/seed.ts`. Authorization
 * always happens server-side: `@RequirePermission(...)` for the coarse action
 * gate, followed by an object-level check inside the service (ownership,
 * tenant, department, assignment).
 *
 * Note that possession of a permission NEVER grants access to a specific
 * resource. `helpdesk:assign` lets a caller reach the assign endpoint; whether
 * they may assign *this* ticket is decided by TicketAuthorizationService.
 */
export const TICKET_PERMISSIONS = {
  READ: 'helpdesk:read',
  WRITE: 'helpdesk:write',
  ASSIGN: 'helpdesk:assign',
  COMMENT_INTERNAL: 'helpdesk:comment_internal',
  SUBMIT_RESOLUTION: 'helpdesk:submit_resolution',
  VERIFY_RESOLUTION: 'helpdesk:verify_resolution',
  REOPEN: 'helpdesk:reopen',
  CLOSE: 'helpdesk:close',
  CLOSE_OVERRIDE: 'helpdesk:close_override',
  ESCALATE: 'helpdesk:escalate',
  MANAGE_SLA: 'helpdesk:manage_sla',
  MANAGE_ROUTING: 'helpdesk:manage_routing',
  READ_AUDIT: 'helpdesk:read_audit',
} as const;

export type TicketPermission =
  (typeof TICKET_PERMISSIONS)[keyof typeof TICKET_PERMISSIONS];

/**
 * Returns true when the actor holds every requested permission.
 *
 * Super admins bypass the permission list (they are the platform control plane)
 * but they are NOT automatically allowed to bypass *resource ownership* checks —
 * see `TicketAuthorizationService`, which still enforces tenant scope for them
 * except for explicitly global operations.
 */
export function actorHasPermission(
  permissions: string[],
  required: readonly string[],
): boolean {
  return required.every((permission) => permissions.includes(permission));
}
