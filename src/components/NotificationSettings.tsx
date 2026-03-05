import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function NotificationSettings() {
  const prefs = useQuery(api.notifications.getNotificationPreferences);
  const update = useMutation(api.notifications.updateNotificationPreferences);

  const [enabled, setEnabled] = useState(false);
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(0);
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    if (prefs) {
      setEnabled(prefs.morningPromptEnabled);
      setHour(prefs.deliveryHourUTC);
      setMinute(prefs.deliveryMinuteUTC);
      setEmail(prefs.email);
    }
  }, [prefs]);

  const handleSave = async () => {
    await update({
      morningPromptEnabled: enabled,
      deliveryHourUTC: hour,
      deliveryMinuteUTC: minute,
      email,
      timezone,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-medium text-[var(--ink)]">
        Morning Prompt Notifications
      </h3>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="accent-[var(--vermillion)]"
        />
        <span className="text-xs text-[var(--ink)]">
          Send daily journaling prompt
        </span>
      </label>

      {enabled && (
        <div className="flex flex-col gap-2 pl-5">
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--ink-light)]">
              Delivery time (UTC):
            </label>
            <select
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              className="text-xs border border-[rgba(26,26,26,0.12)] bg-transparent p-1"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i.toString().padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--ink-light)]">Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="text-xs border border-[rgba(26,26,26,0.12)] bg-transparent p-1 flex-1"
            />
          </div>

          <p className="text-[10px] text-[var(--ink-light)]">
            Timezone: {timezone}
          </p>
        </div>
      )}

      <button
        onClick={handleSave}
        className="text-xs text-[var(--ink-light)] px-3 py-1.5 border border-[rgba(26,26,26,0.15)] bg-transparent hover:border-[var(--ink)] transition-colors self-start"
      >
        {saved ? "Saved" : "Save notification settings"}
      </button>
    </div>
  );
}
