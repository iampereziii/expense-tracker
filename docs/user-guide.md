# How to use the expense tracker

For the two of us. Written to be readable on a phone.

---

## Install on your phone (one-time)

**iPhone (Safari):** open the app URL → tap the Share button → **Add to Home Screen** → Add.
**Android (Chrome):** open the app URL → tap the ⋮ menu → **Install app** (or **Add to Home Screen**).

Open it from the home-screen icon, not from a browser tab. That way it runs full-screen and works offline.

---

## First-time setup (~10 minutes, one person does it)

Do these once. The other phone just opens the app after and everything is already there.

1. **Add your accounts** — Money tab → Accounts → type the name (BPI, GCash, Cash, etc.) → Add.
2. **Enter each account's current balance** — tap the balance next to an account → type the real number → Save.
3. **(Optional) Add savings pots** — Money → Savings → New pot → name it (Emergency, Trip Fund, etc.). Give it an "auto-save X% of income" rule if you want, or just move money manually later.
4. **Add any spending categories you'll use** — More → Categories → Add. Food and Bills are already there; add the rest (Transport, Groceries, Eating out, whatever fits your life).
5. **Declare your first budget period** — Budget tab → Declare period. Enter the budget for this period and (optionally) the income you're allocating. The app freezes a snapshot of your balances at this moment.

Done. Both phones now share one budget.

---

## The daily loop (this is 95% of the app)

Open the app — it lands on the **Log** tab.

1. Type the amount (the keyboard is already up).
2. Tap the category (Food is picked by default).
3. Tap **Save**.

The Remaining number ticks down. Your partner will see it on their phone next time they open the app.

If you mistyped, look at the row that appears just under the top — it shows the last thing you logged with an **Undo** button. Tap Undo and it's gone.

---

## When you get paid (start a new period)

1. **Update your account balances first.** Money → Accounts → tap each balance → enter the real current amount → Save. This tells the app what actually happened during the last period.
2. **Budget → Declare period.** Enter the new budget and income.
   - The old period closes.
   - A snapshot of your current balances is frozen (this is your new starting point).
   - Pots with an "auto-save %" rule get their share of the income allocated automatically.

---

## Common tasks

| I want to… | Do this |
|---|---|
| See what I have left this period | Log tab — the big "Remaining" number and progress bar at the top |
| See where our money actually sits | Money → Accounts |
| Move money between savings pots | Money → Savings → tap a pot → Move to |
| Fix an account balance | Money → Accounts → tap the balance → edit |
| Add a new spending category | More → Categories → Add |
| Hide a category we don't use | More → Categories → Remove (old expenses still show its name) |
| Check whether we really spent what we think | Budget tab — the "awareness" card compares expected vs. actual balances after each period |
| Fix an old expense I typed wrong | Undo only works right after saving. After that, log a small correcting expense with a note — the app deliberately doesn't let you edit history |

---

## The "awareness" card (the honesty check)

On the Budget tab, after you declare a new period, an awareness card shows:

- what your balances **should** be (last period's start + income − everything you logged), vs.
- what they **actually** are (the fresh snapshot you just took).

If actual is **lower** than expected, that's unaccounted spending — money that left the accounts but never got logged. Normal for the first few periods until the habit sticks.
If actual is **higher**, usually a balance was wrong or income wasn't fully declared.

If you notice a mistake in the just-frozen snapshot, the snapshot editor on the Budget tab lets you correct it. Snapshots for older periods are locked so history can't be rewritten.

---

## Offline

You can log anywhere with no signal. Everything saves on your phone right away. When you're back on WiFi or data, it syncs quietly in the background.

The tiny indicator at the top-right of the Log tab shows sync status, but you don't have to watch it. Writes never fail because you were offline.

If your partner logged something while you were offline, you'll see their entries after both phones sync. There's nothing to merge or approve — it just happens.

---

## What the app deliberately does NOT do

So you're not looking for these:

- **Editing old expenses** — log a correction instead. Keeps the daily loop fast and the history honest.
- **Report screen / charts / CSV export** — parked on purpose. The awareness card is the only "how did we do" view.
- **Recurring transactions** — every expense is logged manually. Two seconds each; not worth automating.
- **Multi-currency** — pesos only.
- **Password / PIN / Face ID lock** — the app is intentionally frictionless. Whoever holds the phone can log.

---

## If something looks broken

- **"Almost there" screen asking for Firebase config** → the app was opened before it was fully set up. This is a developer step; the person who built the app fixes it.
- **"Can't reach your data" screen** → same thing — the account settings aren't wired up. Not something the app itself can fix.
- **My partner logged something and I don't see it** → both phones need to be online at least briefly. Give it 30 seconds after both come online. Pull-to-refresh doesn't do anything (the app updates itself); just wait or reopen.
- **Something I logged disappeared** → check the Log tab total — the entry might have been Undone. There's no "trash" to recover from; log it again.
