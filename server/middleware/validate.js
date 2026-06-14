/**
 * Validation middleware for admin endpoints.
 * Each validator collects all errors and returns them at once.
 */

// --- Helpers ---

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_CURRENCIES = ["INR", "USD", "EUR", "GBP", "AUD", "CAD", "JPY", "CNY", "SGD", "AED"];

function validationError(res, errors) {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors,
  });
}

// --- Platform Settings ---

const validatePlatformSettings = (req, res, next) => {
  const errors = [];
  const { siteName, supportEmail, currency } = req.body;

  if (!siteName || (typeof siteName === "string" && siteName.trim() === "")) {
    errors.push({ field: "siteName", message: "Site name is required" });
  }

  if (supportEmail !== undefined && supportEmail !== "") {
    if (typeof supportEmail !== "string" || !EMAIL_REGEX.test(supportEmail)) {
      errors.push({ field: "supportEmail", message: "Invalid email format" });
    }
  }

  if (currency !== undefined && currency !== "") {
    if (!VALID_CURRENCIES.includes(currency)) {
      errors.push({ field: "currency", message: `Currency must be one of: ${VALID_CURRENCIES.join(", ")}` });
    }
  }

  if (errors.length > 0) {
    return validationError(res, errors);
  }
  next();
};

// --- Subscription Settings ---

const SUBSCRIPTION_PRICE_FIELDS = [
  "monthlyPlanPrice",
  "yearlyPlanPrice",
  "featuredPortfolioPrice",
  "searchBoostPrice",
  "homepageFeaturedPrice",
];

const validateSubscriptionSettings = (req, res, next) => {
  const errors = [];

  for (const field of SUBSCRIPTION_PRICE_FIELDS) {
    if (req.body[field] !== undefined) {
      const val = Number(req.body[field]);
      if (isNaN(val) || val < 0) {
        errors.push({ field, message: `${field} must be a non-negative number` });
      }
    }
  }

  // Also validate trialDays as non-negative integer
  for (const field of ["trialDays"]) {
    if (req.body[field] !== undefined) {
      const val = Number(req.body[field]);
      if (isNaN(val) || val < 0) {
        errors.push({ field, message: `${field} must be a non-negative number` });
      }
    }
  }

  if (errors.length > 0) {
    return validationError(res, errors);
  }
  next();
};

// --- Commission Settings ---

const COMMISSION_PERCENT_FIELDS = [
  "bmsLeadCommissionPercent",
  "creatorLeadCommissionPercent",
  "latePaymentFeePercent",
  "manualAdjustmentPercent",
];

const validateCommissionSettings = (req, res, next) => {
  const errors = [];

  for (const field of COMMISSION_PERCENT_FIELDS) {
    if (req.body[field] !== undefined) {
      const val = Number(req.body[field]);
      if (isNaN(val) || val < 0 || val > 100) {
        errors.push({ field, message: `${field} must be between 0 and 100` });
      }
    }
  }

  if (errors.length > 0) {
    return validationError(res, errors);
  }
  next();
};

// --- Finance Control ---

const validateManualPayment = (req, res, next) => {
  const errors = [];
  const { targetCreator, amount, paymentType, reasonNote } = req.body;

  if (!targetCreator) {
    errors.push({ field: "targetCreator", message: "Target creator is required" });
  }
  if (amount === undefined || amount === null || amount === "") {
    errors.push({ field: "amount", message: "Amount is required" });
  } else if (isNaN(Number(amount)) || Number(amount) <= 0) {
    errors.push({ field: "amount", message: "Amount must be a positive number" });
  }
  if (!paymentType) {
    errors.push({ field: "paymentType", message: "Payment type is required" });
  }
  if (!reasonNote || (typeof reasonNote === "string" && reasonNote.trim() === "")) {
    errors.push({ field: "reasonNote", message: "Reason note is required" });
  }

  if (errors.length > 0) {
    return validationError(res, errors);
  }
  next();
};

const validateRefund = (req, res, next) => {
  const errors = [];
  const { originalPaymentRef, refundAmount, reason, originalPaymentAmount } = req.body;

  if (!originalPaymentRef) {
    errors.push({ field: "originalPaymentRef", message: "Original payment reference is required" });
  }
  if (refundAmount === undefined || refundAmount === null || refundAmount === "") {
    errors.push({ field: "refundAmount", message: "Refund amount is required" });
  } else if (isNaN(Number(refundAmount)) || Number(refundAmount) <= 0) {
    errors.push({ field: "refundAmount", message: "Refund amount must be a positive number" });
  }
  if (!reason || (typeof reason === "string" && reason.trim() === "")) {
    errors.push({ field: "reason", message: "Reason is required" });
  }

  // Validate refund does not exceed original payment amount
  if (
    originalPaymentAmount !== undefined &&
    refundAmount !== undefined &&
    !isNaN(Number(refundAmount)) &&
    Number(refundAmount) > 0
  ) {
    if (Number(refundAmount) > Number(originalPaymentAmount)) {
      errors.push({ field: "refundAmount", message: "Refund amount cannot exceed original payment amount" });
    }
  }

  if (errors.length > 0) {
    return validationError(res, errors);
  }
  next();
};

const validateAdjustment = (req, res, next) => {
  const errors = [];
  const { target, adjustmentAmount, justificationNote } = req.body;

  if (!target) {
    errors.push({ field: "target", message: "Target booking or creator is required" });
  }
  if (adjustmentAmount === undefined || adjustmentAmount === null || adjustmentAmount === "") {
    errors.push({ field: "adjustmentAmount", message: "Adjustment amount is required" });
  } else if (isNaN(Number(adjustmentAmount))) {
    errors.push({ field: "adjustmentAmount", message: "Adjustment amount must be a number" });
  }
  if (!justificationNote || (typeof justificationNote === "string" && justificationNote.trim() === "")) {
    errors.push({ field: "justificationNote", message: "Justification note is required" });
  }

  if (errors.length > 0) {
    return validationError(res, errors);
  }
  next();
};

module.exports = {
  validatePlatformSettings,
  validateSubscriptionSettings,
  validateCommissionSettings,
  validateManualPayment,
  validateRefund,
  validateAdjustment,
};
