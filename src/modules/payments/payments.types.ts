// ─────────────────────────────────────────────────────────────────────────────
// Paymob — Internal types
// ─────────────────────────────────────────────────────────────────────────────

/** Billing data shape required by Paymob */
export interface PaymobBillingData {
  apartment:       string;
  email:           string;
  floor:           string;
  first_name:      string;
  street:          string;
  building:        string;
  phone_number:    string;
  shipping_method: string;
  postal_code:     string;
  city:            string;
  country:         string;
  last_name:       string;
  state:           string;
}

/** Paymob auth response */
export interface PaymobAuthResponse {
  token: string;
}

/** Paymob order registration response */
export interface PaymobOrderResponse {
  id: number;
  created_at: string;
  delivery_needed: boolean;
  merchant: { id: number };
  amount_cents: number;
  currency: string;
  merchant_order_id: string;
  items: unknown[];
}

/** Paymob payment key response */
export interface PaymobPaymentKeyResponse {
  token: string;
}

// ─── Webhook / Transaction callback ──────────────────────────────────────────

/** Transaction object inside Paymob's webhook callback */
export interface PaymobTransaction {
  id: number;
  pending: boolean;
  amount_cents: number;
  success: boolean;
  is_auth: boolean;
  is_capture: boolean;
  is_standalone_payment: boolean;
  is_voided: boolean;
  is_refunded: boolean;
  is_3d_secure: boolean;
  integration_id: number;
  has_parent_transaction: boolean;
  owner: number;
  created_at: string;
  currency: string;
  error_occured: boolean;
  order: {
    id: number;
    merchant_order_id: string; // ← our DB order ID (uuid)
    amount_cents: number;
    currency: string;
  };
  source_data: {
    pan:      string;
    type:     string; // "card" | "wallet"
    sub_type: string; // "MasterCard" | "Vodafone" | etc.
  };
  data: {
    message?:           string;
    txn_response_code?: string;
  };
}

/** Full Paymob webhook payload */
export interface PaymobWebhookBody {
  type: string;         // "TRANSACTION"
  obj:  PaymobTransaction;
}

// ─── Controller inputs ────────────────────────────────────────────────────────

/** Body for POST /payments/initiate — returns iframe URL */
export interface InitiateCardPaymentInput {
  orderNumber: string;
}

/** Body for POST /payments/wallet — returns redirect URL */
export interface InitiateWalletPaymentInput {
  orderNumber:       string;
  walletMobileNumber: string; // e.g. "01001234567"
}

// ─── Service return types ─────────────────────────────────────────────────────

export interface CardPaymentInitiated {
  iframeUrl:     string;
  paymentKey:    string;
  paymobOrderId: number;
}

export interface WalletPaymentInitiated {
  redirectUrl:   string; // deep link for wallet app
  paymobOrderId: number;
}
