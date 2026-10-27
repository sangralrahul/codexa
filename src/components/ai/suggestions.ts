import type { AgentMode } from "./types";

/**
 * Hand-written starting points for the chat welcome, keyed on the project's template
 * category, so a candle store is never offered "add a dark mode toggle to the header".
 * Each one only fills the composer; nothing is sent until the user presses Send.
 */
export type SuggestionIcon = "layout" | "palette" | "chart" | "cart" | "form" | "search" | "sparkles" | "shield" | "users" | "phone" | "route" | "explain" | "fix" | "bolt" | "image" | "mail";
export type Suggestion = { title: string; prompt: string; mode: AgentMode; icon: SuggestionIcon };

const GENERIC: Suggestion[] = [
  { title: "Polish the first screen", prompt: "Tighten the layout and typography of the main page so it feels finished: consistent spacing, a clear heading hierarchy and a strong primary action.", mode: "build", icon: "palette" },
  { title: "Add a feature", prompt: "Add a settings page with a form that saves to localStorage and a link to it from the header.", mode: "build", icon: "form" },
  { title: "Explain the structure", prompt: "Explain how this project is structured: the entry point, the main components and where state lives.", mode: "ask", icon: "explain" },
  { title: "Make it responsive", prompt: "Make every page work well on a 390px phone: stack the layout, enlarge tap targets and keep text readable.", mode: "build", icon: "phone" },
];

const BY_CATEGORY: Record<string, Suggestion[]> = {
  ecommerce: [
    { title: "Product detail page", prompt: "Add a product detail view with a larger image, description, size/variant picker and an Add to cart button that updates the cart count.", mode: "build", icon: "image" },
    { title: "Checkout form", prompt: "Add a checkout step after the cart: shipping address and contact form with validation and an order summary.", mode: "build", icon: "form" },
    { title: "Search and filters", prompt: "Add a search box and category filters to the product grid, keeping the filter state in the URL.", mode: "build", icon: "search" },
    { title: "How the cart works", prompt: "Explain how the cart state is stored and updated in this project.", mode: "ask", icon: "explain" },
  ],
  dashboards: [
    { title: "Date range filter", prompt: "Add a date range filter (7 days, 30 days, 90 days) that updates every chart and stat on the dashboard.", mode: "build", icon: "chart" },
    { title: "Export to CSV", prompt: "Add an Export CSV button to the main table that downloads the currently filtered rows.", mode: "build", icon: "bolt" },
    { title: "Empty and loading states", prompt: "Add loading skeletons and friendly empty states to every card and table on the dashboard.", mode: "build", icon: "layout" },
    { title: "Explain the data flow", prompt: "Explain where the dashboard data comes from and how the charts are computed.", mode: "ask", icon: "explain" },
  ],
  saas: [
    { title: "Pricing section", prompt: "Add a pricing section with three plans, a monthly/yearly toggle and a highlighted recommended plan.", mode: "build", icon: "layout" },
    { title: "Onboarding checklist", prompt: "Add an onboarding checklist card on the main screen with 4 steps that persist their completion in localStorage.", mode: "build", icon: "form" },
    { title: "Team invites", prompt: "Add a team page where you can invite members by email and assign a role, stored locally for now.", mode: "build", icon: "users" },
    { title: "Explain the structure", prompt: "Explain how this SaaS starter is structured and where to add new pages.", mode: "ask", icon: "explain" },
  ],
  "ai-tools": [
    { title: "Prompt presets", prompt: "Add a row of prompt presets above the chat input that fill the input when clicked.", mode: "build", icon: "sparkles" },
    { title: "Conversation history", prompt: "Add a sidebar listing past conversations saved in localStorage, with rename and delete.", mode: "build", icon: "layout" },
    { title: "Copy and retry", prompt: "Add Copy and Retry buttons to each assistant message.", mode: "build", icon: "bolt" },
    { title: "Where the model is called", prompt: "Explain where this app calls a model and how responses are rendered.", mode: "ask", icon: "explain" },
  ],
  "admin-panels": [
    { title: "Bulk actions", prompt: "Add row checkboxes to the main table with bulk actions (activate, deactivate, delete) and a confirmation step.", mode: "build", icon: "form" },
    { title: "Audit log", prompt: "Add an audit log page that records every create, update and delete with a timestamp.", mode: "build", icon: "shield" },
    { title: "Search and sort", prompt: "Add search and sortable columns to every table.", mode: "build", icon: "search" },
    { title: "Explain the CRUD flow", prompt: "Explain how records are created, edited and deleted in this admin panel.", mode: "ask", icon: "explain" },
  ],
  crm: [
    { title: "Pipeline board", prompt: "Add a kanban view of deals by stage with drag-and-drop between columns.", mode: "build", icon: "layout" },
    { title: "Contact timeline", prompt: "Add a timeline of notes and activities to each contact, with a form to add a note.", mode: "build", icon: "users" },
    { title: "Follow-up reminders", prompt: "Add follow-up dates to contacts and a Due today list on the main screen.", mode: "build", icon: "mail" },
    { title: "Explain the data model", prompt: "Explain the contact and deal data model in this CRM.", mode: "ask", icon: "explain" },
  ],
  portfolios: [
    { title: "Case study page", prompt: "Add a case study page template with a hero image, the problem, the process and the result, linked from each project card.", mode: "build", icon: "image" },
    { title: "Contact form", prompt: "Add a contact section with a validated form and a success message.", mode: "build", icon: "mail" },
    { title: "Refine the typography", prompt: "Refine the typography: a stronger display heading, comfortable line lengths and consistent spacing.", mode: "build", icon: "palette" },
    { title: "Make it responsive", prompt: "Make the project grid and every section work well on a 390px phone.", mode: "build", icon: "phone" },
  ],
  "landing-pages": [
    { title: "Sharpen the hero", prompt: "Rewrite the hero with a shorter headline, one clear call to action and a supporting line under it.", mode: "build", icon: "palette" },
    { title: "FAQ section", prompt: "Add an FAQ section with 6 questions in an accessible accordion.", mode: "build", icon: "layout" },
    { title: "Signup form", prompt: "Add an email signup form with validation and a thank-you state.", mode: "build", icon: "mail" },
    { title: "Make it responsive", prompt: "Make every section of the landing page work well on a 390px phone.", mode: "build", icon: "phone" },
  ],
  websites: [
    { title: "Add a page", prompt: "Add an About page with a team section and link it from the navigation.", mode: "build", icon: "layout" },
    { title: "Contact form", prompt: "Add a contact page with a validated form and a success message.", mode: "build", icon: "mail" },
    { title: "Refine the typography", prompt: "Refine the typography and spacing across the site so it feels consistent and finished.", mode: "build", icon: "palette" },
    { title: "Explain the structure", prompt: "Explain how the pages of this site are organised.", mode: "ask", icon: "explain" },
  ],
  "mobile-first": [
    { title: "Bottom sheet", prompt: "Add a bottom sheet for item details that opens from the list and closes with a swipe or the back button.", mode: "build", icon: "phone" },
    { title: "Pull to refresh", prompt: "Add a pull-to-refresh gesture to the main list with a loading indicator.", mode: "build", icon: "bolt" },
    { title: "Settings screen", prompt: "Add a settings tab with toggles that persist in localStorage.", mode: "build", icon: "form" },
    { title: "Explain the navigation", prompt: "Explain how the tab navigation works in this app.", mode: "ask", icon: "explain" },
  ],
  "web-apps": [
    { title: "Keyboard shortcuts", prompt: "Add keyboard shortcuts for the main actions and a ? dialog that lists them.", mode: "build", icon: "bolt" },
    { title: "Persist the data", prompt: "Persist the app's data in localStorage so it survives a reload.", mode: "build", icon: "form" },
    { title: "Empty states", prompt: "Add friendly empty states with a primary action wherever a list can be empty.", mode: "build", icon: "layout" },
    { title: "Explain the state", prompt: "Explain where state lives in this app and how it flows between components.", mode: "ask", icon: "explain" },
  ],
};

const API: Suggestion[] = [
  { title: "Add a resource", prompt: "Add a new REST resource with list, create, update and delete routes and input validation.", mode: "build", icon: "route" },
  { title: "Validate input", prompt: "Add request validation to every route and return clear 400 errors.", mode: "build", icon: "shield" },
  { title: "Document the API", prompt: "Write a README section that documents every route with an example request and response.", mode: "build", icon: "explain" },
  { title: "Explain the routes", prompt: "Explain how routing and the data store work in this API.", mode: "ask", icon: "explain" },
];

export function suggestionsFor(category?: string | null, framework?: string | null): Suggestion[] {
  if (framework === "node-express") return API;
  return (category && BY_CATEGORY[category]) || GENERIC;
}
