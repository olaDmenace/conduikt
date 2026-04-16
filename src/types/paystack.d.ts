declare module "@paystack/inline-js" {
  interface CheckoutOptions {
    key: string;
    email: string;
    accessCode?: string;
    amount?: number;
    plan?: string;
    metadata?: Record<string, unknown>;
    onSuccess?: (response: { reference: string }) => void;
    onCancel?: () => void;
  }

  export default class PaystackPop {
    checkout(options: CheckoutOptions): void;
  }
}
