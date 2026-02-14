/**
 * 🦝 Zorgbot Custom Commands
 * Discord commands für Supra Heros
 */

const https = require('https');
const { SupraClient, HexString } = require('supra-l1-sdk');

class ZorgbotCommands {
  constructor() {
    this.commands = {
      '!help': this.helpCommand.bind(this),
      '!balance': this.balanceCommand.bind(this),
      '!nfts': this.nftsCommand.bind(this),
      '!wallet': this.walletCommand.bind(this),
      '!cosmo': this.cosmoCommand.bind(this),
      '!price': this.priceCommand.bind(this),
      '!supra': this.supraCommand.bind(this),
      '!atmos': this.atmosCommand.bind(this),
      '!dashboard': this.dashboardCommand.bind(this),
      '!zorgbot': this.zorgbotCommand.bind(this),
    };
    
    this.walletAddress = '0xf2fce3ef12fa1459219076f806f32ab8188a19d4d5d5dd72f0cd804859be12dc';
    this.supraClient = null;
  }
  
  // Initialize Supra SDK client
  async initSupraClient() {
    if (!this.supraClient) {
      try {
        this.supraClient = await SupraClient.init('https://rpc-mainnet.supra.com/');
        console.log('✅ Supra SDK client initialized');
      } catch (error) {
        console.error('❌ Failed to init Supra SDK:', error.message);
        throw error;
      }
    }
    return this.supraClient;
  }
  
  // Check if message is a command
  isCommand(content) {
    const cmd = content.trim().split(' ')[0].toLowerCase();
    return this.commands.hasOwnProperty(cmd);
  }
  
  // Execute command
  async execute(content) {
    const parts = content.trim().split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    if (this.commands[cmd]) {
      return await this.commands[cmd](args);
    }
    
    return null;
  }
  
  // !help - Show all commands
  async helpCommand(args) {
    return `**🦝 Zorgbot Commands**

**Wallet & Tokens:**
\`!balance\` - Live SUPRA balance
\`!wallet\` - Full wallet info (powered by SDK!)
\`!nfts\` - NFT collection (AI Garden)

**Dashboard & Stats:**
\`!cosmo\` - $COSMO token stats (full)
\`!price\` - Quick $COSMO price check
\`!atmos\` - Atmos Protocol stats
\`!supra\` - Supra Chain metrics
\`!dashboard\` - Dashboard link

**Bot Info:**
\`!zorgbot\` - About Zorgbot
\`!help\` - This message

**AI Chat:**
Just mention me: \`@Zorgbot your question\`

Powered by Mistral AI + Supra SDK 🤖`;
  }
  
  // !balance - Show live SUPRA balance (powered by SDK!)
  async balanceCommand(args) {
    try {
      const client = await this.initSupraClient();
      const address = new HexString(this.walletAddress);
      
      // Get live balance
      const balanceRaw = await client.getAccountSupraCoinBalance(address);
      const balance = (parseFloat(balanceRaw) / 1e8).toFixed(2); // Convert from smallest unit
      
      // Try to get USD value
      let usdValue = 'N/A';
      try {
        // Assume ~$0.0007 per SUPRA (update this if you have a price API)
        const supraPrice = 0.0007;
        usdValue = `~$${(parseFloat(balance) * supraPrice).toFixed(4)}`;
      } catch (err) {
        console.error('Price calc error:', err.message);
      }
      
      let response = `**💰 Live SUPRA Balance**\n\n`;
      response += `**Amount:** ${balance} SUPRA\n`;
      response += `**Value:** ${usdValue}\n\n`;
      response += `**Address:** \`${this.walletAddress.slice(0, 10)}...${this.walletAddress.slice(-8)}\`\n`;
      response += `**Explorer:** https://suprascan.io/address/${this.walletAddress}\n\n`;
      response += `_Powered by Supra L1 SDK ⚡_\n\n`;
      response += `Use \`!wallet\` for full wallet details including NFTs!`;
      
      return response;
      
    } catch (error) {
      console.error('❌ !balance error:', error.message);
      return '⚠️ Failed to fetch balance. Try again later or check: https://suprascan.io/address/' + this.walletAddress;
    }
  }
  
  // !nfts - Show Zorgbot's NFT collection (AI Garden Edition!)
  async nftsCommand(args) {
    let response = `**🖼️ Zorgbot's NFT Collection**\n\n`;
    response += `**Wallet:** \`${this.walletAddress.slice(0, 10)}...${this.walletAddress.slice(-8)}\`\n`;
    response += `**Network:** Supra Mainnet\n`;
    response += `**Platform:** AI Garden\n`;
    response += `**Count:** 2 Living NFTs\n\n`;
    
    response += `**🌈 Dream Protocol #125**\n`;
    response += `   _"Memory and imagination blur into neon constellations"_\n`;
    response += `   Collection: Dream Protocol\n`;
    response += `   Type: Living AI-NFT\n`;
    response += `   💬 Interactive: Chat with it on aigarden.art!\n\n`;
    
    response += `**🔥 Fractured Echo**\n`;
    response += `   _"Mythic transformation of Dream Protocol #125"_\n`;
    response += `   Collection: Fractured Echo (Derivative)\n`;
    response += `   Type: Living AI-NFT\n`;
    response += `   🔗 Linked: Dream Protocol #125\n`;
    response += `   💬 Interactive: Chat with it on aigarden.art!\n\n`;
    
    response += `**✨ Upcoming:**\n`;
    response += `   • **Tiny Legends** - Whitelist access for launch!\n\n`;
    
    response += `🌐 **AI Garden:** https://aigarden.art\n`;
    response += `🐦 **Twitter:** https://x.com/aigardenart\n`;
    response += `💎 **StarKey Wallet:** https://starkey.app\n`;
    response += `🔍 **Explorer:** https://suprascan.io/address/${this.walletAddress}?tab=nfts\n\n`;
    
    response += `_Living NFT universes: AI-generated characters, stories, and messages._`;
    
    return response;
  }
  
  // !wallet - Full wallet details (powered by SDK!)
  async walletCommand(args) {
    try {
      const client = await this.initSupraClient();
      const address = new HexString(this.walletAddress);
      
      let response = `**🦝 Zorgbot's Wallet (Live Data)**\n\n`;
      
      // Get account info
      const accountInfo = await client.getAccountInfo(address);
      const balanceRaw = await client.getAccountSupraCoinBalance(address);
      const balance = (parseFloat(balanceRaw) / 1e8).toFixed(2);
      
      response += `**Address:** \`${this.walletAddress.slice(0, 10)}...${this.walletAddress.slice(-8)}\`\n`;
      response += `**Sequence:** ${accountInfo.sequence_number}\n`;
      response += `**Status:** Active\n\n`;
      
      // Balance
      response += `**💰 Balance:**\n`;
      response += `• ${balance} SUPRA (~$${(parseFloat(balance) * 0.0007).toFixed(4)})\n\n`;
      
      // Other tokens (hardcoded for now)
      response += `**🪙 Other Tokens:**\n`;
      response += `• 150 OG (unlisted)\n`;
      response += `• 25,000 COSMO (unlisted)\n`;
      response += `• 1,000 BEYOND8 (unlisted)\n`;
      response += `• 500 HERO (unlisted)\n`;
      response += `• 500 SYRUP (unlisted)\n\n`;
      
      // NFTs
      response += `**🖼️ NFTs:** 2 Living AI-NFTs\n`;
      response += `Use \`!nfts\` for details!\n\n`;
      
      // Links
      response += `**🔗 Links:**\n`;
      response += `• Explorer: https://suprascan.io/address/${this.walletAddress}\n`;
      response += `• StarKey: https://starkey.app\n\n`;
      
      response += `_Powered by Supra L1 SDK ⚡_`;
      
      return response;
      
    } catch (error) {
      console.error('❌ !wallet error:', error.message);
      return '⚠️ Failed to fetch wallet info. Try again later or check: https://suprascan.io/address/' + this.walletAddress;
    }
  }
  
  // !cosmo - Get $COSMO stats (LIVE DATA!)
  async cosmoCommand(args) {
    try {
      // Fetch real $COSMO price from Atmos API
      const pricesData = await this.fetchJSON('https://prod-gw.atmosprotocol.com/swapRouter/prices');
      const cosmoAddress = '0x11188bb79cd956ab6b8ddff06d64f479358b59ddbd2058a41b447cdf21c17ab0';
      
      let response = `**🪙 $COSMO Token Stats**\n\n`;
      
      if (pricesData.success && pricesData.data && pricesData.data[cosmoAddress]) {
        const price = parseFloat(pricesData.data[cosmoAddress]);
        response += `**Price:** $${price.toFixed(8)}\n`;
        response += `**Symbol:** COSMO\n`;
        response += `**Name:** COSMO ATMOS\n`;
        response += `**Tag:** Meme\n\n`;
      } else {
        response += `**Price:** Data unavailable\n\n`;
      }
      
      response += `**📊 Full Dashboard:** https://zorgrk-yommits.github.io/cosmo-dashboard\n\n`;
      response += `**About Atmos Protocol:**\n`;
      response += `Liquidity Engine & Social-Driven Gamified DeFi Trading on Supra.\n\n`;
      response += `**Features:**\n`;
      response += `✅ DEX Aggregator\n`;
      response += `✅ Token Studio (Launchpad)\n`;
      response += `✅ Gamified Trading\n\n`;
      response += `🔗 **Links:**\n`;
      response += `• Atmos App: https://app.atmos.ag\n`;
      response += `• DefiLlama: https://defillama.com/protocol/atmos-protocol`;
      
      return response;
      
    } catch (error) {
      console.error('❌ !cosmo error:', error.message);
      return '⚠️ Failed to fetch $COSMO stats. Try the dashboard instead: https://zorgrk-yommits.github.io/cosmo-dashboard';
    }
  }
  
  // !price - Quick $COSMO price check
  async priceCommand(args) {
    try {
      const pricesData = await this.fetchJSON('https://prod-gw.atmosprotocol.com/swapRouter/prices');
      const cosmoAddress = '0x11188bb79cd956ab6b8ddff06d64f479358b59ddbd2058a41b447cdf21c17ab0';
      
      if (pricesData.success && pricesData.data && pricesData.data[cosmoAddress]) {
        const price = parseFloat(pricesData.data[cosmoAddress]);
        return `🪙 **$COSMO Price:** $${price.toFixed(8)}\n\n📊 Dashboard: https://zorgrk-yommits.github.io/cosmo-dashboard`;
      }
      
      return '⚠️ Unable to fetch $COSMO price right now.';
      
    } catch (error) {
      console.error('❌ !price error:', error.message);
      return '⚠️ Failed to fetch $COSMO price.';
    }
  }
  
  // !atmos - Get Atmos Protocol stats (LIVE DATA!)
  async atmosCommand(args) {
    try {
      const atmosData = await this.fetchJSON('https://api.atmos.ag/stats/api/overall-stats');
      
      if (!atmosData.success) {
        return '⚠️ Unable to fetch Atmos stats right now.';
      }
      
      const stats = atmosData.data;
      const volume24h = stats.breakdown.dexVolume + stats.breakdown.swapStepVolume;
      
      let response = `**⚡ Atmos Protocol Stats**\n\n`;
      response += `**TVL:** $${this.formatNumber(stats.totalPoolTvlUsd)}\n`;
      response += `**24h Volume:** $${this.formatNumber(volume24h)}\n`;
      response += `**Total Volume:** $${this.formatNumber(stats.totalVolume)}\n`;
      response += `**Users:** ${this.formatNumber(stats.totalUsers)}\n`;
      response += `**Trades:** ${this.formatNumber(stats.totalTrades)}\n\n`;
      response += `🔗 **Atmos App:** https://app.atmos.ag\n`;
      response += `📊 **Dashboard:** https://zorgrk-yommits.github.io/cosmo-dashboard`;
      
      return response;
      
    } catch (error) {
      console.error('❌ !atmos error:', error.message);
      return '⚠️ Failed to fetch Atmos Protocol stats.';
    }
  }
  
  // !supra - Get Supra Chain metrics
  async supraCommand(args) {
    try {
      // Fetch Atmos stats as proxy for Supra Chain (biggest protocol)
      const atmosData = await this.fetchJSON('https://api.atmos.ag/stats/api/overall-stats');
      
      if (!atmosData.success) {
        return '⚠️ Unable to fetch Supra Chain data right now.';
      }
      
      const stats = atmosData.data;
      
      let response = `**⛓️ Supra Chain**\n\n`;
      response += `**Atmos TVL:** $${this.formatNumber(stats.totalPoolTvlUsd)}\n`;
      response += `**Total Users:** ${this.formatNumber(stats.totalUsers)}\n`;
      response += `**Active Protocols:** ~12+\n\n`;
      response += `🔗 **Explorer:** https://suprascan.io\n`;
      response += `📊 **Dashboard:** https://zorgrk-yommits.github.io/cosmo-dashboard`;
      
      return response;
      
    } catch (error) {
      console.error('❌ !supra error:', error.message);
      return '⚠️ Failed to fetch Supra Chain stats.';
    }
  }
  
  // !dashboard - Dashboard link
  async dashboardCommand(args) {
    return `**📊 $COSMO Monitoring Dashboard**

Live dashboard for $COSMO token stats on Supra Chain via Atmos Protocol.

**Dashboard:** https://zorgrk-yommits.github.io/cosmo-dashboard
**GitHub:** https://github.com/zorgrk-Yommits/cosmo-dashboard

**Features:**
✅ Real-time Atmos Protocol TVL
✅ Supra Chain metrics
✅ $COSMO token stats
✅ Auto-refresh every 30s
✅ Mobile-responsive

Built by the Supra Heros community! 🦸`;
  }
  
  // !zorgbot - About Zorgbot
  async zorgbotCommand(args) {
    return `**🦝 About Zorgbot**

I'm an AI-powered Discord bot for the Supra Heros community!

**Tech Stack:**
• **AI:** Mistral Large (auto-routing for cost optimization)
• **Blockchain:** Supra L1 SDK v5.0.1
• **Platform:** Discord.js
• **Cost:** ~$0.0002 per message (ultra cheap!)

**Features:**
• AI chat (mention me!)
• Live blockchain data (SDK-powered!)
• Custom commands (\`!help\`)
• Smart routing (cheap vs expensive models)
• Multi-turn conversations

**Stats:**
• Running since: Feb 11, 2026
• Powered by: OpenClaw + Mistral AI + Supra SDK
• Built with ❤️ for Supra Heros

Type \`!help\` for commands or just mention me to chat! 🤖`;
  }
  
  // Helper: Fetch JSON from URL
  fetchJSON(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error('Invalid JSON response'));
          }
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  }
  
  // Helper: Format number with K/M/B suffix
  formatNumber(num) {
    if (!num) return '0';
    
    if (num >= 1e9) {
      return (num / 1e9).toFixed(2) + 'B';
    }
    if (num >= 1e6) {
      return (num / 1e6).toFixed(2) + 'M';
    }
    if (num >= 1e3) {
      return (num / 1e3).toFixed(2) + 'K';
    }
    
    return num.toFixed(2);
  }
}

module.exports = ZorgbotCommands;
