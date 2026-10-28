"use client";

import type { DealView } from "@/types";
import { EarnKaroDealCard } from "@/components/EarnKaroDealCard";

export function DealCard({ deal }: { deal: DealView }) {
  return <EarnKaroDealCard deal={deal} />;
}
