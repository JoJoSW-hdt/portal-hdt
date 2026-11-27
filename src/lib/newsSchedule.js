export function resolveNewsPublishedAt(scheduledAt, editingNews, now = new Date()) {
  if (scheduledAt) {
    const date = new Date(scheduledAt);
    if (!Number.isFinite(date.getTime())) {
      throw new Error("Informe uma data válida para a publicação.");
    }
    return date.toISOString();
  }

  const previousDate = editingNews?.published_at;
  const isStillScheduled =
    editingNews?.status === "published" &&
    previousDate &&
    new Date(previousDate) > now;

  // Clearing a future schedule means publishing immediately.
  // Already-published news keep their original publication timestamp.
  return isStillScheduled ? null : previousDate || null;
}
