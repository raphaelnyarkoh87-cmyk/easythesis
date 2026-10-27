-- EasyThesis database: Stage 6 (payments)
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again.

-- What Paystack last reported for a payment (for support questions).
alter table public.payments add column if not exists provider_status text;
alter table public.payments add column if not exists updated_at timestamptz not null default now();
create index if not exists payments_user_idx on public.payments (user_id, created_at desc);

-- Records a confirmed payment and extends Premium, exactly once per payment.
-- Called only by the server after Paystack confirms the payment; users cannot call it.
create or replace function public.grant_premium(
  p_reference text,
  p_amount_pesewas int,
  p_currency text,
  p_channel text,
  p_paid_at timestamptz
)
returns table (out_user_id uuid, out_premium_until timestamptz, out_newly_granted boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
  v_days int;
  v_expected int;
  v_status text;
  v_until timestamptz;
begin
  select pay.user_id, pay.days_granted, pay.amount_pesewas, pay.status
    into v_user, v_days, v_expected, v_status
  from public.payments pay
  where pay.reference = p_reference
  for update;

  if v_user is null then
    raise exception 'PAYMENT_NOT_FOUND';
  end if;
  if p_currency <> 'GHS' or p_amount_pesewas < v_expected then
    -- The server marks the payment as failed when it sees this error.
    raise exception 'PAYMENT_AMOUNT_MISMATCH';
  end if;

  if v_status = 'success' then
    -- Already granted (webhook and return page both confirm the same payment).
    select prof.premium_until into v_until from public.profiles prof where prof.id = v_user;
    return query select v_user, v_until, false;
    return;
  end if;

  update public.payments pay
     set status = 'success',
         provider_status = 'success',
         channel = p_channel,
         paid_at = coalesce(p_paid_at, now()),
         updated_at = now()
   where pay.reference = p_reference;

  -- Renewing early adds the days on top of the time left.
  update public.profiles prof
     set plan = 'premium',
         premium_until = greatest(coalesce(prof.premium_until, now()), now()) + make_interval(days => v_days)
   where prof.id = v_user
  returning prof.premium_until into v_until;

  return query select v_user, v_until, true;
end $$;

revoke execute on function public.grant_premium(text, int, text, text, timestamptz) from public, anon, authenticated;
