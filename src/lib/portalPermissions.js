export function getPortalPermissions(profile, staffPermissions = {}) {
  const isAdmin =
    ["founder", "admin"].includes(profile?.role) &&
    profile?.status === "approved";
  const isFounder =
    profile?.role === "founder" && profile?.status === "approved";
  const isStaff =
    profile?.role === "staff" && profile?.status === "approved";

  const canManageEvents = isFounder || isStaff;
  const canApprove =
    isAdmin || (isStaff && staffPermissions.approve_members);
  const canGrant =
    isAdmin || (isStaff && staffPermissions.grant_badges);
  const canPublish =
    isFounder || (isStaff && staffPermissions.publish_news);
  const canGrantExp =
    isAdmin || (isStaff && staffPermissions.grant_exp);
  const canEnterAdmin =
    isAdmin ||
    canApprove ||
    canGrant ||
    canGrantExp ||
    canPublish ||
    canManageEvents;

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
