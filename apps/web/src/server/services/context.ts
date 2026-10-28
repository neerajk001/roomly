/** Authoritative tenant context for every service call. Never from the client. */
export interface ServiceContext {
  userId: string;
  workspaceId: string;
}
