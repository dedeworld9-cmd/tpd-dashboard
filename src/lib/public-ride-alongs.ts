/** The supplied document is an adapted real-world reference draft,
 * not a legal waiver or an official roleplay department release.
 * Application and review remain in Google Docs / the TPD Discord ticket.
 */
export const CIVILIAN_RIDE_ALONG_DOCUMENT =
  "https://docs.google.com/document/d/1hRNCfBXZsO6N9Mo7jpv_HQ2rF078AJUeuLHQPwOLxBY/edit?tab=t.0";

export const CIVILIAN_RIDE_ALONG_COPY_URL =
  "https://docs.google.com/document/d/1hRNCfBXZsO6N9Mo7jpv_HQ2rF078AJUeuLHQPwOLxBY/copy";

/** Tickets V2 panel channel; this opens the panel, not a pre-created ticket. */
export const CIVILIAN_RIDE_ALONG_TICKET_URL =
  "https://discord.com/channels/1563693949527523428/1563693950072656051";

export const CIVILIAN_RIDE_ALONG_STEPS = [
  {
    title: "Make your own copy",
    detail:
      "Select Make a Copy to create your own Google Doc, then fill it out using roleplay information only.",
  },
  {
    title: "Open a civilian ride-along ticket",
    detail:
      "Use Open a Ticket to reach the Tickets V2 panel in TPD Discord, then create a civilian ride-along ticket. Share your completed Google Doc copy with ticket reviewers using appropriate read access.",
  },
  {
    title: "Wait for the review",
    detail:
      "The application is reviewed in that Discord ticket. An available officer must be arranged, and their Sergeant or higher must approve the ride-along before it begins. Do not start without that approval.",
  },
] as const;
