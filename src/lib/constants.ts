export const MIN_WITHDRAWAL_PAISE = 1_000; // ₹10

export const CATEGORIES = [
  { slug: "fashion", label: "Fashion" },
  { slug: "footwear", label: "Footwear" },
  { slug: "beauty", label: "Beauty" },
  { slug: "electronics", label: "Electronics" },
  { slug: "home", label: "Home" },
  { slug: "accessories", label: "Accessories" },
] as const;

export const SORTS = [
  { value: "trending", label: "Trending" },
  { value: "discount", label: "Biggest discount" },
  { value: "profit", label: "Highest profit" },
  { value: "new", label: "Newest" },
] as const;

export const DISCOUNT_STEPS = [30, 50, 70] as const;
