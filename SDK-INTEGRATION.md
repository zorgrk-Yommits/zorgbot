# Supra L1 SDK Integration

Zorgbot is now powered by the Supra L1 SDK for live blockchain data! ⚡

## Installation

```bash
npm install supra-l1-sdk
```

## SDK Version

- **Package:** `supra-l1-sdk`
- **Version:** v5.0.1
- **Docs:** https://sdk-docs.supra.com/
- **GitHub:** https://github.com/Entropy-Foundation/supra-l1-sdk

## Features

### ✅ What Works

- **Live Balance Checks** - Real-time SUPRA coin balance
- **Account Info** - Sequence number, authentication key
- **Transaction History** - SDK methods available
- **Coin Transfers** - Transaction signing and submission
- **StarKey Integration** - Full wallet support

### ❌ What Doesn't Work

- **NFT Indexing** - No public indexer available
- **TokenStore Details** - RPC endpoints return empty/malformed data
- **SupraScan NFT API** - No public API endpoints

## Implementation

### Commands

```javascript
// !balance - Live SUPRA balance (SDK-powered)
const client = await SupraClient.init('https://rpc-mainnet.supra.com/');
const balance = await client.getAccountSupraCoinBalance(address);

// !wallet - Full wallet details (SDK-powered)
const accountInfo = await client.getAccountInfo(address);
const balanceRaw = await client.getAccountSupraCoinBalance(address);
```

### Code Structure

- `zorgbot-commands.js` - Commands with SDK integration
  - `initSupraClient()` - Initialize SDK client
  - `balanceCommand()` - Live balance check
  - `walletCommand()` - Full wallet details
  - `nftsCommand()` - NFT collection (hardcoded)

### Error Handling

```javascript
try {
  const client = await this.initSupraClient();
  const balance = await client.getAccountSupraCoinBalance(address);
  // ... handle balance
} catch (error) {
  console.error('❌ Balance error:', error.message);
  return 'Failed to fetch balance. Try again later.';
}
```

## NFT Tracking

### Current Solution

NFTs are **hardcoded** in the `!nfts` command because:

1. Supra uses Aptos Object-based NFTs
2. NFTs live at separate addresses (not in account resources)
3. TokenStore resource exists but contains no NFT data
4. No public indexer API available

### Future Improvements

When a Supra NFT indexer becomes available:

1. Query NFT ownership via indexer API
2. Fetch metadata from AI Garden / collection contracts
3. Display real-time NFT holdings
4. Track transfers and sales

### Possible Solutions

- **AI Garden API** - Direct API for Living NFTs
- **SupraScan GraphQL** - If/when public endpoint available
- **Custom Indexer** - Monitor token events on-chain
- **StarKey API** - If wallet provides NFT data

## Testing

Test scripts available:

```bash
# Test SDK basic functionality
node test-supra-sdk.js

# Deep dive into NFT resources
node test-nft-deeper.js

# Test SupraScan API endpoints
node test-suprascan-api.js

# Test Zorgbot commands
node test-commands.js
```

## Configuration

### Environment Variables

```bash
# .env
MISTRAL_API_KEY=your_mistral_key
DISCORD_BOT_TOKEN=your_discord_token
TEST_GUILD_ID=your_test_server_id
SUPRA_HEROS_GUILD_ID=your_main_server_id
```

### Wallet Address

Hardcoded in `zorgbot-commands.js`:

```javascript
this.walletAddress = '0xf2fce3ef12fa1459219076f806f32ab8188a19d4d5d5dd72f0cd804859be12dc';
```

## Resources

- **Supra RPC:** https://rpc-mainnet.supra.com/
- **SupraScan:** https://suprascan.io
- **StarKey Wallet:** https://starkey.app
- **AI Garden:** https://aigarden.art

## Live Status

✅ **Zorgbot is live with SDK integration!**

- Balance checks: Working ⚡
- Wallet details: Working ⚡
- NFT collection: Static (hardcoded)
- Commands: `!balance`, `!wallet`, `!nfts`

---

**Integration Date:** February 14, 2026
**Developer:** 🦝 Bandit (Rene's AI Sidekick)
