/**
 * BookMyShot Payment Service
 * Production Razorpay integration using same backend APIs as website.
 * 
 * Architecture:
 * 1. Mobile calls backend → creates Razorpay order/subscription
 * 2. Mobile opens Razorpay Checkout (native SDK in production, WebView in dev)
 * 3. On payment success → mobile sends verification to backend
 * 4. Backend verifies signature → activates subscription/records payment
 * 5. Webhooks handle edge cases (payment.failed, subscription.charged)
 * 
 * Same endpoints as website:
 * - POST /api/razorpay/create-subscription (subscription)
 * - POST /api/razorpay/verify-subscription (verify)
 * - POST /api/razorpay/create-commission-order (commission payment)
 * - POST /api/razorpay/verify-commission-payment (verify)
 * - GET  /api/razorpay/config (get public key)
 */

import { Platform } from 'react-native';
import api from './api';

// Types
export interface RazorpayConfig {
  keyId: string;
  configured: boolean;
}

export interface PaymentOrder {
  id: string;
  amount: number;
  currency: string;
}

export interface SubscriptionResult {
  subscriptionId: string;
  status?: string;
  message?: string;
}

// ═══ GET RAZORPAY CONFIG ═══
export async function getRazorpayConfig(): Promise<RazorpayConfig> {
  const res = await api.get('/razorpay/config');
  return { keyId: res.data?.keyId || '', configured: res.data?.configured || false };
}

// ═══ SUBSCRIPTION FLOW ═══
// Step 1: Create subscription on backend (same as website)
export async function createSubscription(): Promise<SubscriptionResult> {
  const res = await api.post('/razorpay/create-subscription', {});
  return {
    subscriptionId: res.data?.subscriptionId || '',
    status: res.data?.status,
    message: res.data?.message,
  };
}

// Step 2: Open Razorpay Checkout (production only - needs native module)
export async function openRazorpaySubscription(
  keyId: string,
  subscriptionId: string,
  userName: string,
  userEmail: string
): Promise<{ razorpay_subscription_id: string; razorpay_payment_id: string; razorpay_signature: string }> {
  // In production APK/AAB, use react-native-razorpay
  const RazorpayCheckout = require('react-native-razorpay').default;

  const options = {
    key: keyId,
    subscription_id: subscriptionId,
    name: 'BookMyShot',
    description: 'Creator Monthly Subscription',
    prefill: { name: userName, email: userEmail },
    theme: { color: '#D4AF37' },
  };

  const result = await RazorpayCheckout.open(options);
  return {
    razorpay_subscription_id: result.razorpay_subscription_id,
    razorpay_payment_id: result.razorpay_payment_id,
    razorpay_signature: result.razorpay_signature,
  };
}

// Step 3: Verify subscription on backend (same as website)
export async function verifySubscription(
  razorpay_subscription_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string
): Promise<boolean> {
  const res = await api.post('/razorpay/verify-subscription', {
    razorpay_subscription_id,
    razorpay_payment_id,
    razorpay_signature,
  });
  return res.data?.success || false;
}

// ═══ COMMISSION PAYMENT FLOW ═══
// Step 1: Create order for commission payment
export async function createCommissionOrder(amount: number): Promise<PaymentOrder> {
  const res = await api.post('/razorpay/create-commission-order', { amount });
  return {
    id: res.data?.order?.id || '',
    amount: res.data?.order?.amount || amount * 100,
    currency: 'INR',
  };
}

// Step 2: Open Razorpay Checkout for commission
export async function openRazorpayOrder(
  keyId: string,
  orderId: string,
  amount: number,
  description: string,
  userName: string
): Promise<{ razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }> {
  const RazorpayCheckout = require('react-native-razorpay').default;

  const options = {
    key: keyId,
    amount: amount * 100, // paise
    currency: 'INR',
    name: 'BookMyShot',
    description,
    order_id: orderId,
    prefill: { name: userName },
    theme: { color: '#D4AF37' },
  };

  const result = await RazorpayCheckout.open(options);
  return {
    razorpay_order_id: result.razorpay_order_id,
    razorpay_payment_id: result.razorpay_payment_id,
    razorpay_signature: result.razorpay_signature,
  };
}

// Step 3: Verify commission payment
export async function verifyCommissionPayment(
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string,
  amount: number
): Promise<boolean> {
  const res = await api.post('/razorpay/verify-commission-payment', {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    amount,
  });
  return res.data?.success || false;
}

// ═══ PROMOTION PAYMENT FLOW ═══
export async function createPromotionOrder(planType: string, amount: number): Promise<PaymentOrder> {
  const res = await api.post('/razorpay/create-promotion-order', { planType, amount });
  return {
    id: res.data?.order?.id || '',
    amount: res.data?.order?.amount || amount * 100,
    currency: 'INR',
  };
}

export async function verifyPromotionPayment(
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string,
  planType: string,
  amount: number
): Promise<boolean> {
  const res = await api.post('/razorpay/verify-payment', {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    type: 'promotion',
    planType,
    amount,
  });
  return res.data?.success || false;
}

// ═══ PAYMENT RECORDS (booking payments - same as website) ═══
export async function recordBookingPayment(
  bookingId: string,
  amount: number,
  paymentType: 'advance' | 'partial' | 'final' | 'other',
  notes?: string,
  proof?: string
) {
  const res = await api.post('/payment-records/creator', {
    bookingId,
    amount,
    paymentType,
    notes: notes || '',
    proof: proof || '',
  });
  return res.data;
}

export async function getPaymentRecords(bookingId: string) {
  const res = await api.get(`/payment-records/booking/${bookingId}`);
  return res.data?.records || res.data?.data || [];
}

export async function setBookingAmount(bookingId: string, amount: number) {
  const res = await api.patch(`/payment-records/booking/${bookingId}/amount`, { amount });
  return res.data;
}

export async function markBookingPaid(bookingId: string) {
  const res = await api.patch(`/payment-records/booking/${bookingId}/mark-paid`);
  return res.data;
}

// ═══ EARNINGS (same as website /creator/earnings) ═══
export async function getCreatorEarnings() {
  const res = await api.get('/creator/earnings');
  return res.data;
}

// ═══ HELPER: Check if native Razorpay is available ═══
export function isNativeRazorpayAvailable(): boolean {
  try {
    const RazorpayCheckout = require('react-native-razorpay').default;
    return !!RazorpayCheckout;
  } catch {
    return false;
  }
}
