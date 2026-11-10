import { z } from "zod";

/** Item categories to include, distinct from exact objects the user wants to keep. */
export const ROOM_CHECKLISTS = [
  {
    key: "LIVING_ROOM",
    label: "Living room",
    items: [
      ["sofa", "Sofa"],
      ["accent-chair", "Accent chair"],
      ["coffee-table", "Coffee table"],
      ["tv-unit", "TV unit"],
      ["living-rug", "Area rug"],
      ["curtains", "Curtains"],
      ["living-storage", "Storage cabinet"],
      ["plants", "Plants"],
      ["floor-lamp", "Floor lamp"],
    ],
  },
  {
    key: "BEDROOM",
    label: "Bedroom",
    items: [
      ["bed", "Bed"],
      ["bedside-tables", "Bedside tables"],
      ["wardrobe", "Wardrobe"],
      ["dresser", "Dresser"],
      ["bedroom-curtains", "Blackout curtains"],
      ["bedside-lighting", "Bedside lighting"],
      ["bedroom-rug", "Bedside rug"],
      ["bedroom-mirror", "Full-length mirror"],
      ["reading-chair", "Reading chair"],
    ],
  },
  {
    key: "KITCHEN",
    label: "Kitchen",
    items: [
      ["cabinet-styling", "Cabinet styling"],
      ["counter-organizers", "Countertop organizers"],
      ["breakfast-stools", "Breakfast stools"],
      ["kitchen-lighting", "Kitchen lighting"],
      ["kitchen-runner", "Kitchen runner"],
      ["kitchen-plants", "Herbs & plants"],
      ["shelf-decor", "Shelf decor"],
      ["kitchen-bins", "Waste & recycling bins"],
    ],
  },
  {
    key: "BATHROOM",
    label: "Bathroom",
    items: [
      ["bathroom-mirror", "Vanity mirror"],
      ["towel-storage", "Towel storage"],
      ["bath-mat", "Bath mat"],
      ["bathroom-storage", "Bathroom organizers"],
      ["shower-curtain", "Shower curtain"],
      ["vanity-lighting", "Vanity lighting"],
      ["bathroom-plants", "Bathroom plants"],
      ["bath-accessories", "Countertop accessories"],
    ],
  },
  {
    key: "DINING_ROOM",
    label: "Dining room",
    items: [
      ["dining-table", "Dining table"],
      ["dining-chairs", "Dining chairs"],
      ["sideboard", "Sideboard"],
      ["dining-pendant", "Pendant lighting"],
      ["dining-rug", "Dining rug"],
      ["table-centrepiece", "Table centrepiece"],
      ["dining-art", "Wall art"],
      ["display-cabinet", "Display cabinet"],
    ],
  },
  {
    key: "HOME_OFFICE",
    label: "Home office",
    items: [
      ["work-desk", "Work desk"],
      ["office-chair", "Ergonomic chair"],
      ["bookshelves", "Bookshelves"],
      ["desk-lamp", "Desk lamp"],
      ["office-storage", "Document storage"],
      ["monitor-stand", "Monitor stand"],
      ["cable-management", "Cable management"],
      ["office-pinboard", "Pinboard"],
      ["office-plants", "Desk plants"],
    ],
  },
  {
    key: "KIDS_ROOM",
    label: "Kids room",
    items: [
      ["kids-bed", "Child's bed"],
      ["toy-storage", "Toy storage"],
      ["play-mat", "Play mat"],
      ["kids-study-table", "Study table"],
      ["kids-bookshelves", "Book display"],
      ["kids-soft-lighting", "Soft lighting"],
      ["reading-nook", "Reading nook"],
      ["kids-wall-decor", "Colourful wall decor"],
    ],
  },
  {
    key: "BALCONY",
    label: "Balcony",
    items: [
      ["outdoor-chairs", "Outdoor chairs"],
      ["balcony-table", "Compact outdoor table"],
      ["planters", "Planters"],
      ["outdoor-rug", "Outdoor rug"],
      ["string-lights", "String lights"],
      ["outdoor-storage", "Outdoor storage stool"],
      ["privacy-screen", "Freestanding privacy screen"],
    ],
  },
  {
    key: "HALLWAY",
    label: "Hallway",
    items: [
      ["shoe-storage", "Shoe storage"],
      ["console-table", "Console table"],
      ["entry-mirror", "Entry mirror"],
      ["coat-rack", "Coat rack"],
      ["hall-runner", "Hallway runner"],
      ["entry-bench", "Entry bench"],
      ["hall-wall-art", "Wall art"],
      ["entry-lighting", "Entry lighting"],
    ],
  },
  {
    key: "OTHER",
    label: "Other",
    items: [
      ["flexible-seating", "Flexible seating"],
      ["multiuse-table", "Multipurpose table"],
      ["modular-storage", "Modular storage"],
      ["room-divider", "Freestanding room divider"],
      ["accent-rug", "Accent rug"],
      ["task-lighting", "Task lighting"],
      ["decorative-art", "Decorative art"],
      ["indoor-greenery", "Indoor greenery"],
    ],
  },
] as const;

export type ChecklistRoomType = (typeof ROOM_CHECKLISTS)[number]["key"];
export const checklistRoomTypeSchema = z.enum(ROOM_CHECKLISTS.map((room) => room.key));
const knownItems = new Set<string>(
  ROOM_CHECKLISTS.flatMap((room) => room.items.map(([key]) => key)),
);
export const roomIncludeItemsSchema = z
  .array(z.string().min(1).max(64))
  .max(12)
  .refine(
    (items) => new Set(items).size === items.length && items.every((item) => knownItems.has(item)),
    "Choose valid room items without duplicates.",
  );
export function checklistForRoom(roomType: string) {
  return ROOM_CHECKLISTS.find((room) => room.key === roomType)?.items ?? [];
}
export function roomIncludesAreValid(roomType: string, items: readonly string[]): boolean {
  return (
    ROOM_CHECKLISTS.some((room) => room.key === roomType) &&
    roomIncludeItemsSchema.safeParse(items).success &&
    items.every((item) => checklistForRoom(roomType).some(([key]) => key === item))
  );
}
export function roomIncludesPrompt(
  roomType: string,
  items: readonly string[],
  purpose: "restyle" | "edit" = "restyle",
): string {
  if (!roomIncludesAreValid(roomType, items)) throw new Error("Invalid items for this room.");
  if (!items.length) return "";
  const labels = items.map((item) => checklistForRoom(roomType).find(([key]) => key === item)?.[1]);
  if (purpose === "edit")
    return `Original must-have item categories: ${labels.join(", ")}. Keep these preferences unless the requested edit explicitly removes or replaces one. These categories do not mean exact objects must be preserved. Keep the room structure and fixed services unchanged.`;
  return `Include these requested item categories in every concept: ${labels.join(", ")}. These are items to include, not exact objects to preserve. Use compact versions and sensible quantities to suit the visible space; avoid overcrowding and keep doors, windows and circulation clear. Keep the existing architecture and fixed services unchanged. For fixed fixtures, restyle existing ones rather than rebuilding or adding plumbing. Vary their style, materials and colours between concepts while retaining the requested categories.`;
}
export function savedRoomIncludes(params: unknown): string[] {
  const parsed = z.object({ includeItems: roomIncludeItemsSchema }).safeParse(params);
  return parsed.success ? parsed.data.includeItems : [];
}
