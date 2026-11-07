/**
 * Lets the command palette open a member's detail panel in the live directory without putting the member's id
 * (or name) in the URL. In memory only: nothing is stored.
 */
let pending: string | null = null;
export const OPEN_MEMBER_EVENT = "tpd:open-member";

export function requestOpenMember(id: string) {
  pending = id;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_MEMBER_EVENT));
}
export function takePendingMember(): string | null {
  const id = pending;
  pending = null;
  return id;
}
