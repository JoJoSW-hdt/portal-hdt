import { useMemo, useState } from "react";

export function usePortalViewState(members) {
  const [view, setView] = useState("home");
  const [adminMode, setAdminMode] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);

  const pending = useMemo(
    () => members.filter(member => member.status === "pending"),
    [members]
  );
  const filtered = useMemo(
    () => members.filter(member =>
      `${member.username} ${member.display_name} ${member.discord_handle || ""}`
        .toLowerCase()
        .includes(search.toLowerCase())
    ),
    [members, search]
  );

  return {
    view, setView,
    adminMode, setAdminMode,
    search, setSearch,
    selectedBadge, setSelectedBadge,
    selectedMember, setSelectedMember,
    pending, filtered,
  };
}
