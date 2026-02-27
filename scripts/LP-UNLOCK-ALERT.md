# LP Unlock Alert System

Automated LP unlock monitoring with interactive Discord alerts.

## Overview

The system monitors locked LP positions and sends Discord alerts with interactive buttons when unlock is imminent (<24h).

**Safety Features:**
- 🛡️ **Min TVL Filter:** $10,000 (excludes small/risky pools)
- 🛡️ **Max APR Filter:** 500% (excludes unrealistic returns)
- ⚠️ **High Risk Warning:** APR >200%
- 📊 **Smart Scoring:** 60% TVL stability + 40% APR performance

## Components

### 1. Check Script (`check-lp-unlocks.js`)

Runs daily (cron) to check LP unlock status.

**Features:**
- Monitors hardcoded wallet addresses
- Checks if LP unlocks in <24h
- Fetches top 3 pools by APR
- Sends Discord alert with buttons
- Saves alert state for button handler

**Usage:**
```bash
node scripts/check-lp-unlocks.js
```

**Exit Codes:**
- `0` - No urgent unlocks
- `1` - Alert triggered (LP unlocks <24h)
- `2` - Error

### 2. Zorgbot Button Handler

Handles Discord button interactions.

**Buttons:**
- ✅ **Use Best Pool** - Shows best pool details + instructions
- 🔄 **Show All Pools** - Displays top 10 pools by APR
- ❌ **Remind Later** - Snoozes alert until tomorrow

**Auto-disables buttons** after interaction to prevent duplicate actions.

## Safety Scoring System

### Filters

**Hard Filters (must pass):**
- TVL ≥ $10,000
- APR ≤ 500%

**Risk Indicators:**
- ✅ Safe: APR < 200%
- ⚠️ High Risk: APR ≥ 200%

### Scoring Algorithm

**TVL Score (0-100):**
- $1M+ → 100 points
- $100K-$1M → 70-100 (logarithmic)
- $10K-$100K → 40-70 (logarithmic)
- <$10K → 0-40 (linear, filtered out)

**APR Score (0-100):**
- >500% → 0 (filtered out)
- 200-500% → 20-60 (penalty for high risk)
- 50-200% → 60-100 (optimal range)
- 10-50% → 30-60 (okay range)
- <10% → 0-30 (low returns)

**Final Score:**
```
Score = (TVL Score × 0.6) + (APR Score × 0.4)
```

Pools are ranked by final score, prioritizing stability (TVL) over returns (APR).

**Example:**
```
Pool A: TVL $150K, APR 4.7%
  → TVL Score: 75.3, APR Score: 14.2
  → Final: 50.9

Pool B: TVL $20K, APR 188%
  → TVL Score: 49.1, APR Score: 96.9
  → Final: 68.2 (best!)
```

## Configuration

### Environment Variables (`.env`)

```bash
DISCORD_BOT_TOKEN=your_token_here
DISCORD_SUPRA_HEROS_SERVER_ID=your_server_id
DISCORD_ALERT_CHANNEL_ID=optional_channel_id  # Optional: dedicated alerts channel
```

If `DISCORD_ALERT_CHANNEL_ID` is not set, alerts are sent to the first channel named "alert" or "general" in the Supra Heros server.

### Monitored Wallets

Edit `MONITORED_WALLETS` in `check-lp-unlocks.js`:

```javascript
const MONITORED_WALLETS = [
  '0x4c286a0451ceC8270eA09468eA38ca60Cf113992'  // Add more wallets here
];
```

### LP Locks (Hardcoded)

Edit `knownLocks` in `scripts/atmos-pools.js` → `checkLPUnlocks()`:

```javascript
const knownLocks = [
  {
    wallet: '0x...',
    pair: 'SUPRA/COSMO',
    lockedAmount: 200.247,
    unlockDate: new Date('2026-03-03T15:48:07+01:00'),
    poolAddress: '0x...'
  }
];
```

## Alert Flow

1. **Cron job triggers** (`0 9 * * 1` - Every Monday 9am)
2. **Script checks** all monitored wallets
3. **If LP unlocks <24h:**
   - Fetch top 3 pools by APR
   - Send Discord embed with buttons
   - Save alert state to `.lp-unlock-alert.json`
4. **User clicks button:**
   - Zorgbot handles interaction
   - Shows pool details or full list
   - Disables buttons to prevent re-use

## Discord Alert Example

```
🚨 LP UNLOCK ALERT!
Your locked LP position will unlock soon!

💧 Pair: SUPRA/COSMO
💰 Amount: 200.247 LP
⏰ Unlocks: 3/3/2026, 3:48 PM
⏳ Time Remaining: 6.5 hours

📊 Top Pools by APR (Suggested Re-staking)
1. iSUPRA/stSUPRA - APR: 225.1% | TVL: $63.35K
2. SUPRA/CASH - APR: 3,652.9% | TVL: $203.17K
3. iUSDT/iETH - APR: 34.2% | TVL: $33.85K

[✅ Use Best Pool] [🔄 Show All Pools] [❌ Remind Later]
```

## Manual Commands

Check your LP positions:
```
!mylp [wallet]
```

View pool details:
```
!pools info SUPRA CASH
!pools top
```

## Testing

Test the check script:
```bash
cd /data/.openclaw/workspace
node scripts/check-lp-unlocks.js
```

**Note:** To trigger an alert for testing, temporarily change `unlockSoon: hoursToUnlock <= 24` to `hoursToUnlock <= 9999` in `atmos-pools.js`.

## Files

- `scripts/check-lp-unlocks.js` - Main check script
- `scripts/atmos-pools.js` - Pool queries + lock data
- `mistral-manager/zorgbot.js` - Button handler
- `.lp-unlock-alert.json` - Alert state (auto-generated)
- `mistral-manager/.env` - Discord config

## Cron Job

Current schedule: **Every Monday at 9:00 AM**

```bash
# View cron jobs
openclaw cron list

# Run manually
node scripts/check-lp-unlocks.js
```

## Next Steps / Future Improvements

- [ ] Dynamic lock detection (via GraphQL)
- [ ] Multi-wallet support in Discord (user auth)
- [ ] Direct LP swap execution (requires wallet integration)
- [ ] Historical LP unlock tracking
- [ ] Notification preferences (DM vs channel)
- [ ] Custom alert timing (6h, 12h, 24h)

---

**Created:** 2026-02-27  
**Status:** ✅ Production Ready
