import { useState } from "react";

export function usePortalFormState() {
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [discord, setDiscord] = useState("");
  const [tagline, setTagline] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [editingBadge, setEditingBadge] = useState(null);
  const [badgeName, setBadgeName] = useState("");
  const [badgeDesc, setBadgeDesc] = useState("");
  const [badgeRarity, setBadgeRarity] = useState("comum");
  const [badgeExp, setBadgeExp] = useState(0);
  const [badgeFile, setBadgeFile] = useState(null);
  const [grantMember, setGrantMember] = useState("");
  const [grantBadge, setGrantBadge] = useState("");

  return {
    authMode, setAuthMode,
    email, setEmail,
    password, setPassword,
    username, setUsername,
    displayName, setDisplayName,
    discord, setDiscord,
    tagline, setTagline,
    avatarFile, setAvatarFile,
    editingBadge, setEditingBadge,
    badgeName, setBadgeName,
    badgeDesc, setBadgeDesc,
    badgeRarity, setBadgeRarity,
    badgeExp, setBadgeExp,
    badgeFile, setBadgeFile,
    grantMember, setGrantMember,
    grantBadge, setGrantBadge,
  };
}
