"use client";
import { API_URL } from "@/lib/config"

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { getPaddle } from "@/lib/paddle";

export interface BillingPlan {
  id: string;
  name: string;
  monthly_minutes: number;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  paddle_monthly_price_id: string;
  paddle_yearly_price_id: string;
}

export interface UsageEntry {
  id: number;
  change: number;
  balance_after: number;
  reason: string;
  created_at: string | null;
}

export interface BillingStatus {
  plan: string;
  plan_name: string;
  credits_remaining: number;
  credits_total: number;
  subscription_status: string;
  current_period_end: string | null;
  credits_reset_at?: string | null;
  cancel_at?: string | null;
  can_manage_subscription?: boolean;
  features: string[];
  usage_history: UsageEntry[];
}

const API = API_URL;

export function useBilling() {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/billing/plans`);
      const data = await res.json();
      setPlans(data.plans || []);
    } catch {
      console.error("Failed to fetch billing plans");
    }
  }, []);

  const fetchStatus = useCallback(async (): Promise<BillingStatus | null> => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsLoading(false);
      return null;
    }
    try {
      const res = await fetch(`${API}/api/billing/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: BillingStatus = await res.json();
        setStatus(data);
        return data;
      }
    } catch {
      console.error("Failed to fetch billing status");
    } finally {
      setIsLoading(false);
    }
    return null;
  }, []);

  useEffect(() => {
    fetchPlans();
    fetchStatus();
  }, [fetchPlans, fetchStatus]);

  /** Paddle-hosted page to cancel, change card, switch plan or download invoices. */
  const manageSubscription = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/billing/portal`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.overview_url) {
        window.location.href = data.overview_url;
      } else {
        toast.error(data.error || "Couldn't open subscription management.");
      }
    } catch {
      toast.error("Couldn't open subscription management.");
    }
  }, []);

  const openCheckout = useCallback(
    async (planId: string, interval: "month" | "year" = "month") => {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      try {
        const res = await fetch(`${API}/api/billing/create-checkout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ plan: planId, interval }),
        });
        const data = await res.json();

        if (!res.ok) {
          if (data.code === "subscription_exists") {
            toast.info(data.error);
            await manageSubscription();
            return;
          }
          toast.error(data.error || "Couldn't start checkout. Please try again.");
          return;
        }

        const paddle = await getPaddle();
        if (!paddle) {
          toast.error("Payments aren't available yet. Please try again soon.");
          return;
        }
        paddle.Checkout.open({
          items: [{ priceId: data.price_id, quantity: 1 }],
          // Paddle accepts a known customer id OR an email, never both.
          customer: data.customer_id ? { id: data.customer_id } : { email: data.customer_email },
          customData: data.custom_data,
          settings: {
            successUrl: `${window.location.origin}/pricing?upgraded=${planId}`,
            displayMode: "overlay",
            theme: "dark",
          },
        });
      } catch {
        toast.error("Couldn't start checkout. Please check your connection.");
      }
    },
    [manageSubscription]
  );

  const simulatePlan = useCallback(async (planId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API}/api/billing/dev-simulate-plan`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: planId }),
      });
      if (res.ok) {
        await fetchStatus(); // Refresh
      }
    } catch {
      console.error("Plan simulation failed");
    }
  }, [fetchStatus]);

  const creditsPercent =
    status && status.credits_total > 0
      ? Math.round((status.credits_remaining / status.credits_total) * 100)
      : 0;

  const isLow = creditsPercent <= 20;

  return {
    plans,
    status,
    isLoading,
    openCheckout,
    manageSubscription,
    simulatePlan,
    creditsPercent,
    isLow,
    refresh: fetchStatus,
  };
}
