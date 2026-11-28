export function getUpcomingEvents(events, now = new Date()) {
  const nowTime = now.getTime();

  return events.filter((event) => {
    if (event.status !== "published" || !event.starts_at) return false;

    const relevantEnd = event.ends_at || event.starts_at;
    const endTime = new Date(relevantEnd).getTime();
    return Number.isFinite(endTime) && endTime >= nowTime;
  });
}
