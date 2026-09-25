export interface AssignRolePayload {
  userId: string;
  role: string;
}

export interface PolicyPayload {
  role: string;
  resource: string;
  action: string;
}
