import { escapeHtml } from "./html";
import { formatDateLong, formatTimeLabel } from "./time";

export type AnnouncementSlot = {
  name: string;
  numberRequested?: number;
  signedUp: number;
};

export type Announcement = {
  title: string;
  date: string;
  time: string;
  description: string;
  slots: AnnouncementSlot[];
};

function slotStatus(slot: AnnouncementSlot): string {
  if (slot.numberRequested === undefined) return "";
  const remaining = slot.numberRequested - slot.signedUp;
  return remaining > 0
    ? `${remaining} of ${slot.numberRequested} still needed`
    : "full";
}

export function renderAnnouncement(event: Announcement, eventUrl: string) {
  const when = [formatDateLong(event.date), formatTimeLabel(event.time)]
    .filter(Boolean)
    .join(" at ");

  const textSlots = event.slots
    .map((s) => {
      const status = slotStatus(s);
      return `- ${s.name}${status ? ` (${status})` : ""}`;
    })
    .join("\n");
  const text = [
    event.title,
    when,
    event.description,
    event.slots.length > 0 ? `Sign-up slots:\n${textSlots}` : "",
    `Sign up: ${eventUrl}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const htmlSlots = event.slots
    .map((s) => {
      const status = slotStatus(s);
      return `<li style="margin:0 0 4px">${escapeHtml(s.name)}${
        status ? ` <span style="color:#6b7280">(${status})</span>` : ""
      }</li>`;
    })
    .join("");
  const html = `
<div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#111827;max-width:560px;font-size:15px;line-height:1.5">
  <h2 style="margin:0 0 4px;font-size:20px">${escapeHtml(event.title)}</h2>
  <p style="margin:0 0 16px;color:#4b5563">${escapeHtml(when)}</p>
  ${
    event.description
      ? `<p style="margin:0 0 16px">${escapeHtml(event.description).replace(/\n/g, "<br>")}</p>`
      : ""
  }
  ${
    event.slots.length > 0
      ? `<p style="margin:0 0 4px;font-weight:600">Sign-up slots</p><ul style="margin:0 0 20px;padding-left:20px">${htmlSlots}</ul>`
      : ""
  }
  <a href="${escapeHtml(eventUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:8px 16px;border-radius:6px">Sign up</a>
</div>`.trim();

  const subject = `${event.title}: ${formatDateLong(event.date)}`;
  return { subject, text, html };
}
