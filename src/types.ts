export interface StoreView {
  slug: string;
  name: string;
  brandColor: string;
  profitPct: number;
}

export interface DealView {
  id: string;
  title: string;
  imageUrl: string | null;
  productUrl: string;
  pricePaise: number;
  mrpPaise: number;
  discountPct: number;
  estimatedProfitPaise: number;
  category: string;
  isFeatured: boolean;
  expiresAt: string | null;
  store: { slug: string; name: string; brandColor: string };
}

export interface DealPage {
  items: DealView[];
  total: number;
  page: number;
  pageCount: number;
}
