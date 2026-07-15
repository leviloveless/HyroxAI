-- Billing robustness (monetization).
--
-- Previously subscriptions.user_id referenced profiles(id). A user can authenticate
-- and reach Stripe Checkout BEFORE completing onboarding (which is what creates the
-- profiles row), so their payment would succeed while the webhook's insert failed
-- this FK — leaving a paying customer with no recorded entitlement.
--
-- A subscription belongs to the auth account, not the app-domain profile. Repoint
-- the FK at auth.users(id) so the webhook can always record entitlement regardless
-- of onboarding state. Existing rows already satisfy this (profiles.id == auth uid),
-- so the re-add validates cleanly.

alter table subscriptions
  drop constraint subscriptions_user_id_fkey;

alter table subscriptions
  add constraint subscriptions_user_id_fkey
    foreign key (user_id) references auth.users (id) on delete cascade;
