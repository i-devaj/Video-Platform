# Walkthrough — Yourtube Watch-Time Plan System

## Summary

Implemented a 4-tier video watch-time subscription system (Free / Bronze / Silver / Gold) that is **completely independent** from the existing download premium system.

---

## What Changed

### Backend — 6 new files, 2 modified

| File | Action | Purpose |
|------|--------|---------|
| `server/Modals/Plan.js` | NEW | Plan schema (name, price, watchLimitMinutes, features, color) |
| `server/Modals/Transaction.js` | NEW | Payment audit trail with status tracking |
| `server/scripts/seedPlans.js` | NEW | Seeds 4 plans into MongoDB (executed successfully) |
| `server/controllers/plan.js` | NEW | 6 endpoints: list plans, get user plan, create order, verify, cancel, transactions |
| `server/routes/plan.js` | NEW | `/plan/*` route definitions |
| `server/Modals/Auth.js` | MODIFIED | Added `plan` (ObjectId ref) and `planActivatedAt` fields |
| `server/index.js` | MODIFIED | Registered `/plan` routes |
| `server/utils/sendEmail.js` | MODIFIED | Added `sendInvoiceEmail` with branded HTML template |

### Frontend — 4 new files, 3 modified

| File | Action | Purpose |
|------|--------|---------|
| `yourtube/src/lib/plans.ts` | NEW | TypeScript types, color map, `getWatchLimitSeconds` helper |
| `yourtube/src/hooks/useWatchTimeGuard.ts` | NEW | Enforces plan-based time limits on video playback |
| `yourtube/src/components/PlanBadge.tsx` | NEW | Colored badge showing current plan tier |
| `yourtube/src/components/UpgradeModal.tsx` | NEW | Plan comparison cards with Razorpay checkout |
| `yourtube/src/components/Videopplayer.tsx` | MODIFIED | Integrated watch guard + limit overlay + warning toast + UpgradeModal |
| `yourtube/src/components/Header.tsx` | MODIFIED | Added PlanBadge in user dropdown |
| `yourtube/src/components/Sidebar.tsx` | MODIFIED | Added "Plans & Pricing" link |
| `yourtube/src/lib/AuthContext.js` | MODIFIED | Fetches populated plan on login |
| `yourtube/src/pages/pricing/index.tsx` | NEW | Full pricing page with plan cards + upgrade/cancel |

---

## Plan Tiers

| Plan | Price | Watch Limit | Color |
|------|-------|-------------|-------|
| Free | ₹0 | 5 minutes | Gray |
| Bronze | ₹10 | 7 minutes | #CD7F32 |
| Silver | ₹50 | 10 minutes | #C0C0C0 |
| Gold | ₹100 | Unlimited | #FFD700 |

---

## How It Works

1. **No plan (Free)**: User can watch any video for up to 5 minutes. At the limit, video pauses and a blurred overlay with "Upgrade Plan" button appears.
2. **Warning toast**: Shows remaining seconds when 80% of the limit has elapsed.
3. **Upgrade flow**: User clicks upgrade → UpgradeModal shows plan cards → Razorpay checkout → backend verifies HMAC signature → updates user plan → sends invoice email.
4. **Cancel**: User can cancel from the pricing page, reverting to Free.
5. **Session persistence**: Plan is fetched and merged into user context on every login/auth-state-change.

---

## Separation from Download Premium

| Aspect | Watch-Time Plans | Download Premium |
|--------|-----------------|-----------------|
| User field | `user.plan` (ObjectId ref) | `user.isPremium` (Boolean) |
| Routes | `/plan/*` | `/payment/*` |
| Controller | `plan.js` | `payment.js` |
| UI Component | `UpgradeModal` | `PremiumModal` |
| What it controls | Video playback duration | Download limits |

The two systems are fully independent. A user can have Gold plan (unlimited watch) but no download premium (1 download/day), or vice versa.
