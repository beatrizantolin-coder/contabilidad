import type { Account, AccountType, CardKind, ID, PaymentMode, SavingsKind } from "../types";

export interface AccountDraftFields {
  name: string;
  type: AccountType;
  opening: number;
  linkedAccountId: ID | null;
  savingsKind: SavingsKind | null;
  cardKind: CardKind | null;
  paymentMode: PaymentMode | null;
  monthlyPayment: number | null;
}

/** Limpia los campos que no aplican al tipo de cuenta elegido (p.ej. forma de pago fuera de una tarjeta de credito). */
export function normalizeAccountFields(f: AccountDraftFields): Omit<Account, "id" | "warning"> {
  const isCard = f.type === "credit";
  const isCreditCard = isCard && f.cardKind === "credit";
  return {
    name: f.name,
    type: f.type,
    opening: f.opening,
    linkedAccountId: isCard ? f.linkedAccountId : null,
    savingsKind: f.type === "savings" ? f.savingsKind : null,
    cardKind: isCard ? f.cardKind : null,
    paymentMode: isCreditCard ? f.paymentMode : null,
    monthlyPayment: isCreditCard && f.paymentMode === "fixed" ? f.monthlyPayment : null,
  };
}
