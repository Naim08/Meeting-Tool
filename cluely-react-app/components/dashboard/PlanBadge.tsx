'use client';

import React, { useEffect, useState } from 'react';
import { useSupabase } from '@/context/SupabaseProvider';

interface UserPlan {
  price_id: string | null;
  subscription_status: string | null;
  trial_start: string | null;
  trial_end: string | null;
  product_name: string | null;
}

export function PlanBadge() {
  const { session, supabase } = useSupabase();
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlan() {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user subscription info
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('price_id, subscription_status, trial_start, trial_end')
          .eq('id', session.user.id)
          .single();

        if (userError) {
          console.error('Error fetching user:', userError);
          setLoading(false);
          return;
        }

        let productName: string | null = null;

        // If user has a price_id, fetch the product name
        if (userData?.price_id) {
          const { data: priceData } = await supabase
            .from('prices')
            .select('product_id')
            .eq('id', userData.price_id)
            .single();

          if (priceData?.product_id) {
            const { data: productData } = await supabase
              .from('products')
              .select('name')
              .eq('id', priceData.product_id)
              .single();

            productName = productData?.name || null;
          }
        }

        setPlan({
          price_id: userData?.price_id || null,
          subscription_status: userData?.subscription_status || null,
          trial_start: userData?.trial_start || null,
          trial_end: userData?.trial_end || null,
          product_name: productName,
        });
      } catch (err) {
        console.error('Error fetching plan:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPlan();
  }, [session?.user?.id, supabase]);

  if (loading) {
    return (
      <div className="h-5 w-16 animate-pulse rounded bg-gray-200" />
    );
  }

  // Determine plan display info
  const getPlanInfo = () => {
    if (!plan) {
      return {
        name: 'Free',
        color: 'bg-gray-100 text-gray-700',
        status: null,
      };
    }

    // Check if in trial
    if (plan.trial_end && !plan.price_id) {
      const trialEnd = new Date(plan.trial_end);
      const now = new Date();
      const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysLeft > 0) {
        return {
          name: 'Trial',
          color: 'bg-yellow-100 text-yellow-800',
          status: `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`,
        };
      } else {
        return {
          name: 'Trial Expired',
          color: 'bg-red-100 text-red-700',
          status: null,
        };
      }
    }

    // Check subscription status
    if (plan.subscription_status === 'active' && plan.product_name) {
      // Determine tier from product name
      const productLower = plan.product_name.toLowerCase();

      if (productLower.includes('enterprise')) {
        return {
          name: 'Enterprise',
          color: 'bg-purple-100 text-purple-800',
          status: 'Active',
        };
      } else if (productLower.includes('monthly')) {
        return {
          name: 'Pro Monthly',
          color: 'bg-blue-100 text-blue-800',
          status: 'Active',
        };
      } else if (productLower.includes('weekly')) {
        return {
          name: 'Pro Weekly',
          color: 'bg-blue-100 text-blue-800',
          status: 'Active',
        };
      } else {
        return {
          name: plan.product_name,
          color: 'bg-blue-100 text-blue-800',
          status: 'Active',
        };
      }
    }

    if (plan.subscription_status === 'canceled') {
      return {
        name: 'Canceled',
        color: 'bg-gray-100 text-gray-600',
        status: null,
      };
    }

    // Default to free
    return {
      name: 'Free',
      color: 'bg-gray-100 text-gray-700',
      status: null,
    };
  };

  const planInfo = getPlanInfo();

  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${planInfo.color}`}>
        {planInfo.name}
      </span>
      {planInfo.status && (
        <span className="text-xs text-gray-500">
          {planInfo.status}
        </span>
      )}
    </div>
  );
}
