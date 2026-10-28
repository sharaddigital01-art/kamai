import { create } from "zustand";

interface OpenOptions {
  input?: string;
  dealId?: string;
  /** Convert immediately on open (used by "Share & Earn" on deal cards). */
  autoConvert?: boolean;
}

interface MakeLinkState {
  open: boolean;
  input: string;
  dealId: string | undefined;
  autoConvert: boolean;
  openModal: (o?: OpenOptions) => void;
  close: () => void;
}

/** One global modal, opened from the navbar, mobile nav, hero and every deal card. */
export const useMakeLink = create<MakeLinkState>((set) => ({
  open: false,
  input: "",
  dealId: undefined,
  autoConvert: false,
  openModal: (o = {}) => set({ open: true, input: o.input ?? "", dealId: o.dealId, autoConvert: Boolean(o.autoConvert) }),
  close: () => set({ open: false }),
}));
