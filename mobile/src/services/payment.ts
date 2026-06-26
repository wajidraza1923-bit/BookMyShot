/**
 * BookMyShot Payment Service — Production
 * Uses react-native-razorpay for native checkout in production APK.
 * Falls back to WebView-based checkout in Expo Go (development only).
 * 
 * SAME backend endpoints as website:
 * - POST /api/razorpay/create-subscription
 * - POST /api/razorpay/verify-subscription
 * - POST /api/razorpay/create-commission-order
 * - POST /api/razorpay/verify-commission-payment
 * - POST /api/razorpay/create-promotion-order
 * - POST /api/razorpay/verify-payment
 * - GET  /api/razorpay/config
 */

import { Linking } from 'react-native';
import api from './api';

// ═══ Detect native Razorpay module ═══
let RazorpayCheckout: any = null;
try {
  RazorpayCheckout = require('react-native-razorpay').default;
} catch (e) {
  console.log('[Payment] react-native-razorpay not available (Expo Go). Will use WebView fallback.');
}

// Types
export interface RazorpayConfig { keyId: string; configured: boolean; }
export interface PaymentOrder { id: string; amount: number; currency: string; }
export interface SubscriptionResult { subscriptionId: string; status?: string; message?: string; keyId?: string; amount?: number; }

// ═══ GET RAZORPAY CONFIG ═══
export async function getRazorpayConfig(): Promise<RazorpayConfig> {
  const res = await api.get('/razorpay/config');
  return { keyId: res.data?.keyId || '', configured: res.data?.configured || false };
}

// ═══ CHECK IF NATIVE RAZORPAY IS AVAILABLE ═══
export function isNativeRazorpayAvailable(): boolean {
  return RazorpayCheckout !== null && typeof RazorpayCheckout?.open === 'function';
}

// ═══════════════════════════════════════════════════════════════
// SUBSCRIPTION FLOW
// ═══════════════════════════════════════════════════════════════

// Step 1: Create subscription on backend
export async function createSubscription(): Promise<SubscriptionResult> {
  const res = await api.post('/razorpay/create-subscription', {});
  return {
    subscriptionId: res.data?.subscriptionId || res.data?.subscription?.id || '',
    status: res.data?.status || res.data?.subscription?.status,
    message: res.data?.message,
    keyId: res.data?.keyId,
    amount: res.data?.amount,
  };
}

// Step 2: Open Razorpay Checkout for subscription
export async function openRazorpaySubscription(
  keyId: string,
  subscriptionId: string,
  userName: string,
  userEmail: string
): Promise<{ razorpay_subscription_id: string; razorpay_payment_id: string; razorpay_signature: string }> {
  if (!RazorpayCheckout) {
    throw { code: 'NO_NATIVE_MODULE', message: 'Razorpay native module not available. Use production APK.' };
  }

  const options = {
    key: keyId,
    subscription_id: subscriptionId,
    name: 'BookMyShot',
    description: 'Creator Monthly Subscription (AutoPay)',
    image: 'https://bookmyshot.in/images/logo.png',
    prefill: { name: userName, email: userEmail },
    theme: { color: '#D4AF37' },
    modal: { confirm_close: true },
  };

  const result = await RazorpayCheckout.open(options);
  return {
    razorpay_subscription_id: result.razorpay_subscription_id,
    razorpay_payment_id: result.razorpay_payment_id,
    razorpay_signature: result.razorpay_signature,
  };
}

// Step 3: Verify subscription
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

// ═══════════════════════════════════════════════════════════════
// COMMISSION PAYMENT FLOW
// ═══════════════════════════════════════════════════════════════

// Step 1: Create order
export async function createCommissionOrder(amount: number): Promise<PaymentOrder> {
  const res = await api.post('/razorpay/create-commission-order', { amount });
  return {
    id: res.data?.order?.id || '',
    amount: res.data?.amount || amount,
    currency: 'INR',
  };
}

// Step 2: Open Razorpay Checkout for one-time payment (commission/promotion)
export async function openRazorpayOrder(
  keyId: string,
  orderId: string,
  amount: number,
  description: string,
  userName: string
): Promise<{ razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }> {
  if (!RazorpayCheckout) {
    throw { code: 'NO_NATIVE_MODULE', message: 'Razorpay native module not available. Use production APK.' };
  }

  const options = {
    key: keyId,
    amount: amount * 100, // paise
    currency: 'INR',
    name: 'BookMyShot',
    description,
    order_id: orderId,
    image: 'https://bookmyshot.in/images/logo.png',
    prefill: { name: userName },
    theme: { color: '#D4AF37' },
    modal: { confirm_close: true },
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

// ═══════════════════════════════════════════════════════════════
// PROMOTION PAYMENT FLOW
// ═══════════════════════════════════════════════════════════════

export async function createPromotionOrder(planType: string, amount: number): Promise<PaymentOrder> {
  const res = await api.post('/razorpay/create-promotion-order', { planType, amount });
  return {
    id: res.data?.order?.id || '',
    amount: res.data?.amount || amount,
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

// ═══════════════════════════════════════════════════════════════
// CANCEL SUBSCRIPTION (AutoPay off)
// ═══════════════════════════════════════════════════════════════
export async function cancelSubscription(): Promise<boolean> {
  const res = await api.post('/razorpay/cancel-subscription', {});
  return res.data?.success || false;
}

// ═══════════════════════════════════════════════════════════════
// AUTOPAY STATUS
// ═══════════════════════════════════════════════════════════════
export async function getAutoPayStatus() {
  const res = await api.get('/razorpay/autopay-status');
  return res.data?.data || {};
}

// ═══════════════════════════════════════════════════════════════
// PAYMENT RECORDS (booking payments)
// ═══════════════════════════════════════════════════════════════
export async function recordBookingPayment(
  bookingId: string, amount: number,
  paymentType: 'advance' | 'partial' | 'final' | 'other',
  notes?: string, proof?: string
) {
  const res = await api.post('/payment-records/creator', { bookingId, amount, paymentType, notes: notes || '', proof: proof || '' });
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

// ═══════════════════════════════════════════════════════════════
// EARNINGS
// ═══════════════════════════════════════════════════════════════
export async function getCreatorEarnings() {
  const res = await api.get('/creator/earnings');
  return res.data;
}
