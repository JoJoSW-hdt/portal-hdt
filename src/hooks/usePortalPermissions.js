export function usePortalPermissions(profile, staffPermissions = {}) {
  const approved = profile?.status === "approved";
  const isAdmin = ["founder", "admin"].includes(profile?.role) && approved;
  const isFounder = profile?.role === "founder" && approved;
  const isStaff = profile?.role === "staff" && approved;

  const canManageEvents = isFounder || isStaff;
  const canApprove = isAdmin || (isStaff && staffPermissions.approve_members);
  const canGrant = isAdmin || (isStaff && staffPermissions.grant_badges);
  const canPublish = isFounder || (isStaff && staffPermissions.publish_news);
  const canGrantExp = isAdmin || (isStaff && staffPermissions.grant_exp);
  const canEnterAdmin =
    isAdmin || canApprove || canGrant || canGrantExp || canPublish || canManageEvents;

  return {
    isAdmin,
    isFounder,
    isStaff,
    canManageEvents,
    canApprove,
    canGrant,
    canPublish,
    canGrantExp,
    canEnterAdmin,
  };
}
