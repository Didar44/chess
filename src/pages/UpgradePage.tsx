import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/model/auth-context";
import { updateProfileTier } from "@/features/auth/lib/supabase";
import { FREE_ANALYSIS_LIMIT } from "@/features/coach/lib/coach";
import {
  FREE_HISTORY_LIMIT,
  PREMIUM_LIVE_LABEL,
} from "@/features/entitlements/lib/limits";
import { Button } from "@/shared/ui/Button";
import { PageIntro } from "@/shared/ui/PageIntro";
import { Panel } from "@/shared/ui/Panel";
import { TextField } from "@/shared/ui/TextField";

const TRIAL_DAYS = 3;
const ANNUAL_PRICE = 24;

type CheckoutField = "cardholderName" | "cardNumber" | "expiry" | "cvc";

type CheckoutForm = Record<CheckoutField, string>;

const initialCheckoutForm: CheckoutForm = {
  cardholderName: "",
  cardNumber: "",
  expiry: "",
  cvc: "",
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function formatCardNumber(value: string) {
  return digitsOnly(value)
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ")
    .trim();
}

function formatExpiry(value: string) {
  const digits = digitsOnly(value).slice(0, 4);
  if (digits.length < 3) {
    return digits;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function isValidLuhn(cardNumber: string) {
  let sum = 0;
  let shouldDouble = false;

  for (let index = cardNumber.length - 1; index >= 0; index -= 1) {
    let digit = Number(cardNumber[index]);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function validateExpiry(expiry: string) {
  const match = expiry.match(/^(\d{2})\/(\d{2})$/);
  if (!match) {
    return "Use MM/YY.";
  }

  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  if (month < 1 || month > 12) {
    return "Month must be between 01 and 12.";
  }

  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return "Card expiry is in the past.";
  }

  return null;
}

function validateCheckoutForm(form: CheckoutForm) {
  const nextErrors: Partial<Record<CheckoutField, string>> = {};
  const normalizedName = form.cardholderName.trim();
  const normalizedCardNumber = digitsOnly(form.cardNumber);
  const normalizedCvc = digitsOnly(form.cvc);

  if (normalizedName.length < 4) {
    nextErrors.cardholderName = "Enter the cardholder name.";
  }

  if (normalizedCardNumber.length < 15 || normalizedCardNumber.length > 16) {
    nextErrors.cardNumber = "Use a valid 15 or 16 digit card number.";
  } else if (!isValidLuhn(normalizedCardNumber)) {
    nextErrors.cardNumber = "Card number check failed.";
  }

  const expiryError = validateExpiry(form.expiry);
  if (expiryError) {
    nextErrors.expiry = expiryError;
  }

  if (!/^\d{3,4}$/.test(normalizedCvc)) {
    nextErrors.cvc = "Use a 3 or 4 digit CVC.";
  }

  return nextErrors;
}

export function UpgradePage() {
  const { isConfigured, profile, refreshProfile, sessionUser, status } = useAuth();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"offer" | "checkout" | "success">("offer");
  const [submitting, setSubmitting] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState<CheckoutForm>(initialCheckoutForm);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<CheckoutField, string>>>({});

  const updateCheckoutField = (field: CheckoutField, value: string) => {
    const normalizedValue =
      field === "cardNumber"
        ? formatCardNumber(value)
        : field === "expiry"
          ? formatExpiry(value)
          : field === "cvc"
            ? digitsOnly(value).slice(0, 4)
            : value;

    setCheckoutForm((current) => ({
      ...current,
      [field]: normalizedValue,
    }));

    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      return {
        ...current,
        [field]: undefined,
      };
    });
  };

  const activatePro = async () => {
    if (!sessionUser) {
      setError("Sign in before activating Pro.");
      return;
    }

    const nextFieldErrors = validateCheckoutForm(checkoutForm);
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError("Check the payment fields and try again.");
      return;
    }

    if (!acceptedTerms) {
      setError("Accept the checkout terms to continue.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      await updateProfileTier({ tier: "pro", userId: sessionUser.id });
      await refreshProfile();
      setStep("success");
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Upgrade failed.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-4">
      <PageIntro
        kicker="Boardline Pro"
        title="Unlock the full training and live-play pass."
        summary="Boardline Pro expands review history, coaching access, and live-room perks on your account."
      />
      <div className="app-section-grid">
        <Panel heading="Upgrade Flow" kicker="Checkout">
          <div className="grid gap-4">
            {status !== "authenticated" || !sessionUser ? (
              <div className="grid gap-3">
                <p className="text-sm text-[var(--color-muted)]">
                  Sign in first so Pro can be added to your player profile.
                </p>
                <div>
                  <Link to="/auth">
                    <Button type="button">Open auth</Button>
                  </Link>
                </div>
              </div>
            ) : null}

            {profile?.tier === "pro" || step === "success" ? (
              <div className="grid gap-4">
                <div className="app-pane-note border-[var(--color-success)]">
                  <p className="section-kicker text-[var(--color-success)]">
                    {step === "success" ? "Trial Active" : "Pro Active"}
                  </p>
                  <p className="mt-2 text-2xl font-semibold uppercase">
                    {step === "success" ? `${TRIAL_DAYS}-day Pro trial is live.` : "Boardline Pro is live."}
                  </p>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    {step === "success"
                      ? `No charge is taken in this preview build. Your account is now unlocked as if the ${TRIAL_DAYS}-day trial has started.`
                      : "Your account now gets deeper review history, unlimited coach analysis, and the priority live-room lane."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link to="/review">
                    <Button type="button">Open review</Button>
                  </Link>
                  <Link to="/play?mode=live">
                    <Button type="button" variant="secondary">Open game room</Button>
                  </Link>
                </div>
              </div>
            ) : null}

            {profile?.tier !== "pro" && step === "offer" ? (
              <div className="grid gap-4">
                <div className="app-toolbar items-end justify-between">
                  <div className="grid gap-2">
                    <p className="section-kicker">Annual Club Pass</p>
                    <div className="inline-flex w-fit items-center gap-2 border border-[var(--color-border-strong)] bg-[var(--color-accent-soft)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-accent)]">
                      <span>{TRIAL_DAYS} days free</span>
                      <span className="text-[var(--color-muted)]">No charge today</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-4xl font-semibold uppercase leading-none">${ANNUAL_PRICE}</p>
                      <p className="mt-2 text-sm text-[var(--color-muted)]">per year after trial</p>
                    </div>
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
                      Cancel before day {TRIAL_DAYS + 1}
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 text-sm text-[var(--color-muted)]">
                  <p>The first {TRIAL_DAYS} days are free. Start with a real checkout form, unlock Pro immediately, and decide later.</p>
                  <p>This is still a preview environment, so no live payment is processed even though card fields are validated.</p>
                </div>
                <Button
                  disabled={!isConfigured || status !== "authenticated"}
                  onClick={() => setStep("checkout")}
                  type="button"
                >
                  Start {TRIAL_DAYS}-day free trial
                </Button>
              </div>
            ) : null}

            {profile?.tier !== "pro" && step === "checkout" ? (
              <div className="grid gap-4">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.9fr)]">
                  <div className="app-pane-note">
                    <p className="section-kicker">Payment Method</p>
                    <p className="mt-2 text-sm text-[var(--color-muted)]">
                      Enter a card to reserve the annual Pro pass. The first {TRIAL_DAYS} days are free.
                    </p>
                  </div>
                  <div className="app-pane-note border-[var(--color-accent)]">
                    <p className="section-kicker text-[var(--color-accent)]">Billing Summary</p>
                    <div className="mt-3 grid gap-2 text-sm text-[var(--color-muted)]">
                      <div className="flex items-center justify-between gap-3">
                        <span>Today</span>
                        <strong className="text-base text-[var(--color-text)]">$0</strong>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>After {TRIAL_DAYS} days</span>
                        <strong className="text-base text-[var(--color-text)]">${ANNUAL_PRICE}/year</strong>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm">
                    <span className="section-kicker">Cardholder</span>
                    <TextField
                      autoComplete="off"
                      className={fieldErrors.cardholderName ? "border-[var(--color-danger)] focus:border-[var(--color-danger)]" : ""}
                      placeholder="As shown on card"
                      value={checkoutForm.cardholderName}
                      onChange={(event) => updateCheckoutField("cardholderName", event.target.value)}
                    />
                    <span className="min-h-5 text-sm text-[var(--color-danger)]">
                      {fieldErrors.cardholderName ?? ""}
                    </span>
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="section-kicker">Card number</span>
                    <TextField
                      autoComplete="off"
                      className={fieldErrors.cardNumber ? "border-[var(--color-danger)] focus:border-[var(--color-danger)]" : ""}
                      inputMode="numeric"
                      placeholder="4242 4242 4242 4242"
                      value={checkoutForm.cardNumber}
                      onChange={(event) => updateCheckoutField("cardNumber", event.target.value)}
                    />
                    <span className="min-h-5 text-sm text-[var(--color-danger)]">
                      {fieldErrors.cardNumber ?? ""}
                    </span>
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="section-kicker">Expiry</span>
                    <TextField
                      autoComplete="off"
                      className={fieldErrors.expiry ? "border-[var(--color-danger)] focus:border-[var(--color-danger)]" : ""}
                      inputMode="numeric"
                      placeholder="MM/YY"
                      value={checkoutForm.expiry}
                      onChange={(event) => updateCheckoutField("expiry", event.target.value)}
                    />
                    <span className="min-h-5 text-sm text-[var(--color-danger)]">
                      {fieldErrors.expiry ?? ""}
                    </span>
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="section-kicker">CVC</span>
                    <TextField
                      autoComplete="off"
                      className={fieldErrors.cvc ? "border-[var(--color-danger)] focus:border-[var(--color-danger)]" : ""}
                      inputMode="numeric"
                      placeholder="123"
                      value={checkoutForm.cvc}
                      onChange={(event) => updateCheckoutField("cvc", event.target.value)}
                    />
                    <span className="min-h-5 text-sm text-[var(--color-danger)]">
                      {fieldErrors.cvc ?? ""}
                    </span>
                  </label>
                </div>
                <label className="app-pane-note flex items-start gap-3 text-sm text-[var(--color-muted)]">
                  <input
                    checked={acceptedTerms}
                    className="mt-1"
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    I understand this is a checkout. My card details must pass the validation checks before the trial starts.
                  </span>
                </label>
                {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
                <div className="flex flex-wrap gap-3">
                  <Button disabled={submitting} onClick={() => void activatePro()} type="button">
                    {submitting ? "Starting trial" : `Start ${TRIAL_DAYS}-day free trial`}
                  </Button>
                  <Button onClick={() => setStep("offer")} type="button" variant="ghost">
                    Back
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </Panel>

        <Panel heading="What Changes" kicker="Membership">
          <div className="grid gap-4">
            <div className="app-meta-strip">
              <div className="app-meta-card">
                <strong>{TRIAL_DAYS}</strong>
                <span>days free first</span>
              </div>
              <div className="app-meta-card">
                <strong>{FREE_HISTORY_LIMIT}</strong>
                <span>free archive depth</span>
              </div>
              <div className="app-meta-card">
                <strong>{FREE_ANALYSIS_LIMIT}</strong>
                <span>free coach runs</span>
              </div>
            </div>
            <div className="grid gap-3 text-sm text-[var(--color-muted)]">
              <p>Trial window: unlock Pro immediately, keep the first {TRIAL_DAYS} days free, then continue at ${ANNUAL_PRICE}/year.</p>
              <p>Pro archive: deeper review history and no coach credit cap.</p>
              <p>Live rooms: Pro unlocks the {PREMIUM_LIVE_LABEL.toLowerCase()}.</p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
