import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!STRIPE_WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing required environment variables for stripe-webhook function.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// Manual Stripe signature verification using Web Crypto API
async function verifyStripeSignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const parts = signature.split(',');

  let timestamp = '';
  let signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't') timestamp = value;
    if (key === 'v1') signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) return false;

  const signedPayload = `${timestamp}.${body}`;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return signatures.some(sig => sig === expectedSignature);
}

async function updateUserByEmail(email: string, values: any) {
  const { error } = await supabase
    .from("users")
    .update(values)
    .eq("email", email);
  if (error) throw error;
}

function extractPlanId(metadata: any, fallback: any) {
  return metadata?.plan_id ?? metadata?.plan ?? fallback ?? null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("Stripe-Signature");
  if (!signature) {
    return new Response("Missing Stripe signature", { status: 400 });
  }

  const body = await req.text();

  // Verify signature manually
  const isValid = await verifyStripeSignature(body, signature, STRIPE_WEBHOOK_SECRET!);
  if (!isValid) {
    console.error("Stripe signature verification failed");
    return new Response("Invalid signature", { status: 400 });
  }

  // Parse the event
  let event;
  try {
    event = JSON.parse(body);
  } catch (error) {
    console.error("Failed to parse webhook body", error);
    return new Response("Invalid JSON", { status: 400 });
  }

  console.log("🔔 Received webhook event:", event.type);

  try {
    switch (event.type) {
      // One-time payments
      case "payment_intent.succeeded": {
        const intent = event.data.object;
        const email = intent.receipt_email ?? intent.customer?.email;

        if (!email) break;

        await updateUserByEmail(email, {
          subscription_status: "paid",
          plan_id: extractPlanId(intent.metadata, intent.description ?? null),
          stripe_customer_id: typeof intent.customer === "string" ? intent.customer : intent.customer?.id ?? null,
          latest_checkout_at: new Date().toISOString()
        });
        break;
      }

      // Checkout completed
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        const email = session.customer_details?.email ?? session.metadata?.email;
        if (!email) break;

        const planId = extractPlanId(session.metadata, session.payment_link ?? null);

        await updateUserByEmail(email, {
          subscription_status: session.mode === "subscription" ? "active" : "paid",
          plan_id: planId,
          stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
          stripe_checkout_session_id: session.id,
          latest_checkout_at: new Date().toISOString()
        });
        break;
      }

      // Subscription created
      case "customer.subscription.created": {
        const subscription = event.data.object;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
        console.log("🔔 Subscription created - Customer ID:", customerId);

        if (!customerId) {
          console.error("❌ No customer ID found in subscription");
          break;
        }

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("id, email")
          .eq("stripe_customer_id", customerId)
          .single();

        if (userError) {
          console.error("❌ Error fetching user:", userError);
          break;
        }

        if (!userData) {
          console.error("❌ No user found with stripe_customer_id:", customerId);
          break;
        }

        console.log("✅ Found user:", userData.email);

        const currentPeriodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;
        const currentPeriodStart = subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000).toISOString()
          : null;
        const trialEnd = subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null;
        const trialStart = subscription.trial_start
          ? new Date(subscription.trial_start * 1000).toISOString()
          : null;
        const subscriptionCreated = subscription.created
          ? new Date(subscription.created * 1000).toISOString()
          : null;

        // Update users table with all subscription details
        await updateUserByEmail(userData.email, {
          subscription_status: subscription.status,
          plan_id: extractPlanId(subscription.metadata, subscription.items.data[0]?.price?.id ?? null),
          stripe_customer_id: customerId,
          price_id: subscription.items.data[0]?.price?.id ?? null,
          quantity: subscription.items.data[0]?.quantity ?? null,
          cancel_at_period_end: subscription.cancel_at_period_end,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          trial_start: trialStart,
          trial_end: trialEnd,
          subscription_created: subscriptionCreated,
          latest_invoice_id: typeof subscription.latest_invoice === "string" ? subscription.latest_invoice : subscription.latest_invoice?.id ?? null
        });

        console.log("✅ Subscription created and user updated!");
        break;
      }

      // Subscription updated (plan changes, etc.)
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
        if (!customerId) break;

        const { data: userData } = await supabase
          .from("users")
          .select("id, email")
          .eq("stripe_customer_id", customerId)
          .single();

        if (!userData) break;

        const currentPeriodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;
        const currentPeriodStart = subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000).toISOString()
          : null;
        const endedAt = subscription.ended_at
          ? new Date(subscription.ended_at * 1000).toISOString()
          : null;
        const cancelAt = subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000).toISOString()
          : null;
        const canceledAt = subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : null;

        // Update users table with all subscription details
        await updateUserByEmail(userData.email, {
          subscription_status: subscription.status,
          plan_id: extractPlanId(subscription.metadata, subscription.items.data[0]?.price?.id ?? null),
          price_id: subscription.items.data[0]?.price?.id ?? null,
          quantity: subscription.items.data[0]?.quantity ?? null,
          cancel_at_period_end: subscription.cancel_at_period_end,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          ended_at: endedAt,
          cancel_at: cancelAt,
          canceled_at: canceledAt,
          latest_invoice_id: typeof subscription.latest_invoice === "string" ? subscription.latest_invoice : subscription.latest_invoice?.id ?? null
        });
        break;
      }

      // Subscription paused
      case "customer.subscription.paused": {
        const subscription = event.data.object;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
        if (!customerId) break;

        const { data: userData } = await supabase
          .from("users")
          .select("id, email")
          .eq("stripe_customer_id", customerId)
          .single();

        if (!userData) break;

        await updateUserByEmail(userData.email, {
          subscription_status: "paused",
          price_id: subscription.items.data[0]?.price?.id ?? null,
          quantity: subscription.items.data[0]?.quantity ?? null,
          cancel_at_period_end: subscription.cancel_at_period_end,
          current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
          current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
          plan_id: extractPlanId(subscription.metadata, subscription.items.data[0]?.price?.id ?? null),
          latest_invoice_id: typeof subscription.latest_invoice === "string" ? subscription.latest_invoice : subscription.latest_invoice?.id ?? null
        });
        break;
      }

      // Subscription deleted/canceled
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
        if (!customerId) break;

        const { data: userData } = await supabase
          .from("users")
          .select("id, email")
          .eq("stripe_customer_id", customerId)
          .single();

        if (!userData) break;

        await updateUserByEmail(userData.email, {
          subscription_status: "canceled",
          price_id: subscription.items.data[0]?.price?.id ?? null,
          quantity: subscription.items.data[0]?.quantity ?? null,
          cancel_at_period_end: subscription.cancel_at_period_end,
          current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
          current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
          ended_at: new Date().toISOString(),
          cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
          canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
          plan_id: extractPlanId(subscription.metadata, subscription.items.data[0]?.price?.id ?? null),
          latest_invoice_id: typeof subscription.latest_invoice === "string" ? subscription.latest_invoice : subscription.latest_invoice?.id ?? null
        });
        break;
      }

      // Invoice payment succeeded (RENEWALS - weekly/monthly)
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const email = invoice.customer_email;

        if (!email || !invoice.subscription) break;

        const periodEnd = invoice.lines?.data?.[0]?.period?.end
          ? new Date(invoice.lines.data[0].period.end * 1000).toISOString()
          : null;

        await updateUserByEmail(email, {
          subscription_status: "active",
          current_period_end: periodEnd,
          latest_invoice_id: invoice.id
        });
        break;
      }

      // Invoice payment failed
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const email = invoice.customer_email;

        if (!email || !invoice.subscription) break;

        await updateUserByEmail(email, {
          subscription_status: "past_due"
        });
        break;
      }

      default:
        break;
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("Webhook handler error", error);
    return new Response("Webhook handler failure", { status: 500 });
  }
});

