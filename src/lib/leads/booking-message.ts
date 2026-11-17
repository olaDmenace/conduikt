// The message "Send booking link" puts on the clipboard. Nothing is sent
// from the app: the owner pastes it into WhatsApp, email or a text.

export interface BookingMessageLead {
  first_name?: string | null;
}

export function bookingMessage(lead: BookingMessageLead, projectName: string, bookingUrl: string): string {
  const first = lead.first_name?.trim();
  const greeting = first ? `Hi ${first},` : "Hi,";
  const who = projectName.trim() || "us";
  return `${greeting} thanks for getting in touch with ${who}. You can book a time that suits you here: ${bookingUrl.trim()}`;
}
