export const CATEGORIES = [
  "Food & Dining", "Groceries", "Transport", "Shopping", "Bills & Utilities",
  "Entertainment", "Health", "Travel", "Subscriptions", "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

const RULES: [Category, RegExp][] = [
  ["Subscriptions", /netflix|spotify|youtube|disney|icloud|apple\.com\/bill|google (one|storage)|chatgpt|openai|anthropic|github|adobe|dropbox|hbo|prime video|subscription/i],
  ["Groceries", /supermarket|grocer|walmart|costco|aldi|kroger|trader joe|whole foods|sm market|7-eleven|7 eleven|mart\b/i],
  ["Food & Dining", /restaurant|cafe|coffee|starbucks|mcdonald|kfc|jollibee|burger|pizza|sushi|bar & grill|bakery|doordash|ubereats|uber eats|grabfood|foodpanda|deliveroo|diner|kitchen/i],
  ["Transport", /uber|lyft|grab\b|taxi|gas|petron|shell|caltex|fuel|parking|toll|metro|mrt|lrt|transit|train/i],
  ["Travel", /airline|airways|airbnb|booking\.com|hotel|resort|expedia|agoda|cebu pac|flight|hostel/i],
  ["Bills & Utilities", /electric|water|internet|telecom|mobile|verizon|at&t|comcast|insurance|globe|pldt|smart comm|meralco|utility|rent/i],
  ["Health", /pharmacy|drug ?store|clinic|hospital|dental|dentist|doctor|medical|watsons|cvs|walgreens|gym|fitness/i],
  ["Entertainment", /cinema|movie|theater|theatre|concert|ticket|steam|playstation|xbox|nintendo|game|bowling|museum/i],
  ["Shopping", /amazon|lazada|shopee|ebay|zara|h&m|uniqlo|nike|ikea|target|best buy|mall|store|shop|apple store|fashion/i],
];

export function categorize(description: string): Category {
  for (const [cat, re] of RULES) if (re.test(description)) return cat;
  return "Other";
}

export const FALLBACK_CATEGORY = "Other";

/** Validates a user-edited category list; returns the cleaned list, or null when it is unusable. */
export function cleanCategories(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.length > 30) return null;
  const out: string[] = [];
  for (const v of input) {
    if (typeof v !== "string") return null;
    const name = v.trim().replace(/\s+/g, " ");
    if (!name || name.length > 30) return null;
    if (!out.some((o) => o.toLowerCase() === name.toLowerCase())) out.push(name);
  }
  return out.includes(FALLBACK_CATEGORY) ? out : null; // "Other" is where removed categories' expenses go
}
