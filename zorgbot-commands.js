/**
 * 🦝 Zorgbot Custom Commands
 * Discord commands für Supra Heros
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { SupraClient, HexString } = require('supra-l1-sdk');
const atmosPools = require('./scripts/atmos-pools.js');

class ZorgbotCommands {
  constructor() {
    this.commands = {
      '!help': this.helpCommand.bind(this),
      '!balance': this.balanceCommand.bind(this),
      '!nfts': this.nftsCommand.bind(this),
      '!nft-add': this.nftAddCommand.bind(this),
      '!wallet': this.walletCommand.bind(this),
      '!cosmo': this.cosmoCommand.bind(this),
      '!price': this.priceCommand.bind(this),
      '!oracle': this.oracleCommand.bind(this),
      '!btc': this.btcCommand.bind(this),
      '!eth': this.ethCommand.bind(this),
      '!supra': this.supraCommand.bind(this),
      '!atmos': this.atmosCommand.bind(this),
      '!dashboard': this.dashboardCommand.bind(this),
      '!zorgbot': this.zorgbotCommand.bind(this),
      '!pools': this.poolsCommand.bind(this),
      '!mylp': this.mylpCommand.bind(this),
    };
    
    // Supra Oracle API
    this.oracleApiKey = this.loadOracleApiKey();
    this.oracleBaseUrl = 'https://prod-kline-rest.supra.com';
    
    this.walletAddress = '0xf2fce3ef12fa1459219076f806f32ab8188a19d4d5d5dd72f0cd804859be12dc';
    this.supraClient = null;
  }
  
  // Load Supra Oracle API key
  loadOracleApiKey() {
    const keyPath = path.join(__dirname, '..', '.supra-oracle-api-key');
    try {
      if (fs.existsSync(keyPath)) {
        return fs.readFileSync(keyPath, 'utf8').trim();
      }
    } catch (e) {
      console.warn('⚠️ Could not load Oracle API key:', e.message);
    }
    return null;
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
  async execute(content, message = null) {
    const parts = content.trim().split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    if (this.commands[cmd]) {
      return await this.commands[cmd](args, message);
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
\`!nft-add <image>\` - Add NFT via image (attach or URL)

**Crypto Prices (Supra Oracle):**
\`!btc\` - Bitcoin price
\`!eth\` - Ethereum price
\`!oracle <pair>\` - Any pair (btc_usd, eth_usdt, sol_usd...)
\`!price\` - Quick $COSMO price check

**LP Pools (Atmos Protocol):**
\`!pools top\` - Top 10 pools by TVL
\`!pools find <token>\` - Find pools with token
\`!pools info <token1> <token2>\` - Pool details (e.g. SUPRA CASH)
\`!pools live\` - Recent swap/liquidity events
\`!mylp [wallet]\` - Your LP positions + lock status

**Dashboard & Stats:**
\`!cosmo\` - $COSMO token stats (full)
\`!atmos\` - Atmos Protocol stats
\`!supra\` - Supra Chain metrics
\`!dashboard\` - Dashboard link

**Bot Info:**
\`!zorgbot\` - About Zorgbot
\`!help\` - This message

**AI Chat:**
Just mention me: \`@Zorgbot your question\`

Powered by Mistral AI + Supra SDK + Supra Oracle 🤖`;
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
      response += `**Explorer:** <https://suprascan.io/address/${this.walletAddress}>\n\n`;
      response += `_Powered by Supra L1 SDK ⚡_\n\n`;
      response += `Use \`!wallet\` for full wallet details including NFTs!`;
      
      return response;
      
    } catch (error) {
      console.error('❌ !balance error:', error.message);
      return '⚠️ Failed to fetch balance. Try again later or check: <https://suprascan.io/address/' + this.walletAddress + '>';
    }
  }
  
  // !nfts - Show Zorgbot's NFT collection (dynamically loaded from JSON!)
  async nftsCommand(args) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const nftData = JSON.parse(await fs.readFile(path.join(__dirname, 'nfts.json'), 'utf8'));
      
      let response = `**🖼️ Zorgbot's NFT Collection**\n\n`;
      response += `**Wallet:** \`${nftData.wallet.slice(0, 10)}...${nftData.wallet.slice(-8)}\`\n`;
      response += `**Network:** Supra Mainnet\n`;
      response += `**Platform:** AI Garden\n`;
      response += `**Count:** ${nftData.count} Living NFTs\n\n`;
      
      // Render each NFT dynamically
      for (const nft of nftData.nfts) {
        response += `**${nft.emoji} ${nft.collection}`;
        if (nft.edition && nft.collection === 'Tiny Legends') {
          response += ` #${nft.edition.split(' ')[0]} - ${nft.name}`;
        } else if (nft.edition) {
          response += ` #${nft.edition}`;
        } else {
          response += ` - ${nft.name}`;
        }
        response += `**\n`;
        
        if (nft.subtitle) response += `   _"${nft.subtitle}"_\n`;
        else if (nft.description) response += `   _"${nft.description}"_\n`;
        
        if (nft.collection) response += `   Collection: ${nft.collection}\n`;
        if (nft.edition && nft.collection === 'Tiny Legends') response += `   Edition: ${nft.edition}\n`;
        if (nft.origin) response += `   Origin: ${nft.origin}\n`;
        if (nft.type) response += `   Type: ${nft.type}\n`;
        if (nft.rarity) response += `   Rarity: ${nft.rarity}\n`;
        if (nft.derivative) response += `   🔗 Linked: ${nft.derivative}\n`;
        if (nft.minted) response += `   Status: ✅ Minted ${nft.minted}\n`;
        if (nft.added) response += `   Status: ✅ Added ${nft.added}\n`;
        if (nft.interactive) response += `   💬 Interactive: Chat with it on AI Garden!\n`;
        response += `\n`;
      }
      
      response += `**🖼️ Platforms:**\n`;
      response += `• AI Garden: <https://aigarden.art>\n`;
      response += `• Explorer: <https://suprascan.io/address/${nftData.wallet}?tab=nfts>\n`;
      
      return response;
    } catch (error) {
      console.error('❌ !nfts error:', error);
      return '⚠️ Failed to load NFT collection. Check nfts.json file.';
    }
  }

  // !nft-add <image-url-or-attachment> - Add NFT via image analysis (Mistral Vision)
  async nftAddCommand(args, message) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      // Get image URL from args or Discord attachment
      let imageUrl = args.join(' ').trim();
      if (!imageUrl && message && message.attachments && message.attachments.size > 0) {
        const attachment = message.attachments.first();
        if (attachment.contentType && attachment.contentType.startsWith('image/')) {
          imageUrl = attachment.url;
        }
      }
      
      if (!imageUrl) {
        return '⚠️ Please provide an image URL or attach an image!\nUsage: `!nft-add <image-url>` or attach an image.';
      }
      
      // Load Mistral API key
      const envPath = path.join(__dirname, '.env');
      require('dotenv').config({ path: envPath });
      const mistralKey = process.env.MISTRAL_API_KEY;
      
      if (!mistralKey) {
        return '⚠️ Mistral API key not configured!';
      }
      
      // Call Mistral Vision API (pixtral-large-latest)
      console.log('🔍 Analyzing NFT image with Mistral Vision...');
      const visionResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mistralKey}`
        },
        body: JSON.stringify({
          model: 'pixtral-large-latest',
          messages: [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract NFT details from this image. Provide ONLY a JSON object with these fields: collection, name, subtitle (optional), edition (e.g. "41 / 3000"), origin (optional), rarity (optional), accessories (optional), description (optional). Be concise and accurate.'
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }],
          max_tokens: 500
        })
      });
      
      if (!visionResponse.ok) {
        const errorText = await visionResponse.text();
        console.error('❌ Mistral Vision error:', errorText);
        return '⚠️ Failed to analyze image. Try again later.';
      }
      
      const visionData = await visionResponse.json();
      const analysisText = visionData.choices[0].message.content;
      
      // Parse JSON from response (extract JSON block if wrapped in markdown)
      let nftDetails;
      try {
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          nftDetails = JSON.parse(jsonMatch[0]);
        } else {
          nftDetails = JSON.parse(analysisText);
        }
      } catch (parseError) {
        console.error('❌ Failed to parse NFT details:', analysisText);
        return '⚠️ Could not extract NFT details. Response: ' + analysisText.slice(0, 200);
      }
      
      // Load current nfts.json
      const nftsPath = path.join(__dirname, 'nfts.json');
      const nftData = JSON.parse(await fs.readFile(nftsPath, 'utf8'));
      
      // Generate ID
      const id = `${nftDetails.collection.toLowerCase().replace(/\s+/g, '-')}-${nftDetails.name.toLowerCase().replace(/\s+/g, '-')}`;
      
      // Create new NFT entry
      const newNFT = {
        id,
        collection: nftDetails.collection,
        name: nftDetails.name,
        type: 'Living AI-NFT',
        emoji: '✨', // Default, can be customized later
        interactive: true,
        status: 'Active',
        added: new Date().toISOString().split('T')[0]
      };
      
      // Add optional fields
      if (nftDetails.subtitle) newNFT.subtitle = nftDetails.subtitle;
      if (nftDetails.edition) newNFT.edition = nftDetails.edition;
      if (nftDetails.origin) newNFT.origin = nftDetails.origin;
      if (nftDetails.rarity) newNFT.rarity = nftDetails.rarity;
      if (nftDetails.accessories) newNFT.accessories = nftDetails.accessories;
      if (nftDetails.description) newNFT.description = nftDetails.description;
      
      // Add to collection
      nftData.nfts.push(newNFT);
      nftData.count = nftData.nfts.length;
      
      // Save back to file
      await fs.writeFile(nftsPath, JSON.stringify(nftData, null, 2), 'utf8');
      
      console.log('✅ NFT added:', id);
      
      return `✅ **NFT Added!**\n\n**${newNFT.emoji} ${newNFT.collection} - ${newNFT.name}**\n` +
             (newNFT.subtitle ? `_"${newNFT.subtitle}"_\n` : '') +
             (newNFT.edition ? `Edition: ${newNFT.edition}\n` : '') +
             (newNFT.rarity ? `Rarity: ${newNFT.rarity}\n` : '') +
             `\nTotal NFTs: ${nftData.count} 🎉\n` +
             `Run \`!nfts\` to see the full collection!`;
      
    } catch (error) {
      console.error('❌ !nft-add error:', error);
      return '⚠️ Failed to add NFT: ' + error.message;
    }
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
      
      // LP Position
      response += `**💧 LP Position (Atmos Protocol)**\n`;
      response += `• Pair: SUPRA/COSMO\n`;
      response += `• Locked LP: 200.247 (unlocks: 3.3.2026 15:48:07)\n`;
      response += `• Unlocked LP: 0.000\n`;
      response += `• Composition: 368.159 SUPRA + 11.22K COSMO\n`;
      response += `• Value: $0.431 USD\n\n`;
      
      // NFTs
      response += `**🖼️ NFTs:** 3 Living AI-NFTs\n`;
      response += `Use \`!nfts\` for details!\n\n`;
      
      // Links
      response += `**🔗 Links:**\n`;
      response += `• Explorer: <https://suprascan.io/address/${this.walletAddress}>\n`;
      response += `• StarKey: <https://starkey.app>\n\n`;
      
      response += `_Powered by Supra L1 SDK ⚡_`;
      
      return response;
      
    } catch (error) {
      console.error('❌ !wallet error:', error.message);
      return '⚠️ Failed to fetch wallet info. Try again later or check: <https://suprascan.io/address/' + this.walletAddress + '>';
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
  
  // !oracle <pair> - Get any crypto price from Supra Oracle
  async oracleCommand(args) {
    let pair = args[0]?.toLowerCase() || 'btc_usdt';
    
    if (!this.oracleApiKey) {
      return '⚠️ Oracle API not configured.';
    }
    
    try {
      // Try the requested pair first
      let data = await this.fetchOracleLatest(pair);
      
      // If no data and pair ends with _usd, try _usdt instead
      if ((!data.instruments || data.instruments.length === 0) && pair.endsWith('_usd')) {
        const altPair = pair.replace('_usd', '_usdt');
        data = await this.fetchOracleLatest(altPair);
        if (data.instruments && data.instruments.length > 0) {
          pair = altPair; // Use the working pair
        }
      }
      
      // If no data and pair ends with _usdt, try _usd instead
      if ((!data.instruments || data.instruments.length === 0) && pair.endsWith('_usdt')) {
        const altPair = pair.replace('_usdt', '_usd');
        data = await this.fetchOracleLatest(altPair);
        if (data.instruments && data.instruments.length > 0) {
          pair = altPair;
        }
      }
      
      if (data.instruments && data.instruments.length > 0) {
        const inst = data.instruments[0];
        const price = parseFloat(inst.currentPrice);
        const high = parseFloat(inst['24h_high']);
        const low = parseFloat(inst['24h_low']);
        const change = parseFloat(inst['24h_change']);
        const changeEmoji = change >= 0 ? '📈' : '📉';
        
        let response = `**${changeEmoji} ${pair.toUpperCase()}**\n\n`;
        response += `**Price:** $${this.formatPrice(price)}\n`;
        response += `**24h Change:** ${change >= 0 ? '+' : ''}${change.toFixed(2)}%\n`;
        response += `**24h High:** $${this.formatPrice(high)}\n`;
        response += `**24h Low:** $${this.formatPrice(low)}\n`;
        response += `**Updated:** ${inst.timestamp}\n\n`;
        response += `_Powered by Supra Oracle ⚡_`;
        
        return response;
      }
      
      return `⚠️ No data found for ${pair}. Try: btc_usdt, eth_usd, sol_usd`;
      
    } catch (error) {
      console.error('❌ !oracle error:', error.message);
      return `⚠️ Failed to fetch ${pair} price. Try: btc_usdt, eth_usd, sol_usd`;
    }
  }
  
  // !btc - Quick Bitcoin price
  async btcCommand(args) {
    if (!this.oracleApiKey) {
      return '⚠️ Oracle API not configured.';
    }
    
    try {
      const data = await this.fetchOracleLatest('btc_usdt');
      
      if (data.instruments && data.instruments.length > 0) {
        const inst = data.instruments[0];
        const price = parseFloat(inst.currentPrice);
        const change = parseFloat(inst['24h_change']);
        const changeEmoji = change >= 0 ? '📈' : '📉';
        
        return `${changeEmoji} **Bitcoin:** $${this.formatPrice(price)} (${change >= 0 ? '+' : ''}${change.toFixed(2)}% 24h)\n\n_Supra Oracle ⚡_`;
      }
      
      return '⚠️ Unable to fetch BTC price.';
      
    } catch (error) {
      console.error('❌ !btc error:', error.message);
      return '⚠️ Failed to fetch Bitcoin price.';
    }
  }
  
  // !eth - Quick Ethereum price
  async ethCommand(args) {
    if (!this.oracleApiKey) {
      return '⚠️ Oracle API not configured.';
    }
    
    try {
      const data = await this.fetchOracleLatest('eth_usdt');
      
      if (data.instruments && data.instruments.length > 0) {
        const inst = data.instruments[0];
        const price = parseFloat(inst.currentPrice);
        const change = parseFloat(inst['24h_change']);
        const changeEmoji = change >= 0 ? '📈' : '📉';
        
        return `${changeEmoji} **Ethereum:** $${this.formatPrice(price)} (${change >= 0 ? '+' : ''}${change.toFixed(2)}% 24h)\n\n_Supra Oracle ⚡_`;
      }
      
      return '⚠️ Unable to fetch ETH price.';
      
    } catch (error) {
      console.error('❌ !eth error:', error.message);
      return '⚠️ Failed to fetch Ethereum price.';
    }
  }
  
  // Helper: Fetch from Supra Oracle API
  fetchOracleLatest(tradingPair) {
    return new Promise((resolve, reject) => {
      const url = `${this.oracleBaseUrl}/latest?trading_pair=${tradingPair}`;
      
      const req = https.request(url, {
        method: 'GET',
        headers: {
          'x-api-key': this.oracleApiKey,
          'Accept': 'application/json'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON'));
          }
        });
      });
      
      req.on('error', reject);
      req.end();
    });
  }
  
  // Helper: Format price (adaptive decimals)
  formatPrice(price) {
    if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(2);
    if (price >= 0.01) return price.toFixed(4);
    return price.toFixed(8);
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
      response += `🔗 **Atmos App:** <https://app.atmos.ag>\n`;
      response += `📊 **Dashboard:** <https://zorgrk-yommits.github.io/cosmo-dashboard>`;
      
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
      response += `🔗 **Explorer:** <https://suprascan.io>\n`;
      response += `📊 **Dashboard:** <https://zorgrk-yommits.github.io/cosmo-dashboard>`;
      
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

**Dashboard:** <https://zorgrk-yommits.github.io/cosmo-dashboard>
**GitHub:** <https://github.com/zorgrk-Yommits/cosmo-dashboard>

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
  
  // !pools - Atmos LP Pools commands
  async poolsCommand(args) {
    const subcommand = args[0]?.toLowerCase();
    
    // Show help if no subcommand
    if (!subcommand) {
      return `**💧 Atmos LP Pools**\n\n` +
             `**Commands:**\n` +
             `\`!pools top\` - Top 10 pools by TVL\n` +
             `\`!pools find <token>\` - Pools with token (e.g. SUPRA)\n` +
             `\`!pools info <token1> <token2>\` - Details for pair (e.g. SUPRA CASH)\n` +
             `\`!pools live\` - Recent swap/liquidity events\n\n` +
             `**Example:**\n` +
             `\`!pools info SUPRA CASH\``;
    }
    
    try {
      switch (subcommand) {
        case 'top':
          return await this.poolsTopCommand(args.slice(1));
        
        case 'find':
          return await this.poolsFindCommand(args.slice(1));
        
        case 'info':
          return await this.poolsInfoCommand(args.slice(1));
        
        case 'live':
          return await this.poolsLiveCommand(args.slice(1));
        
        default:
          return `⚠️ Unknown subcommand: \`${subcommand}\`\n\nUse \`!pools\` for help.`;
      }
    } catch (error) {
      console.error('❌ !pools error:', error.message);
      return '⚠️ Failed to fetch pool data. Try again later.';
    }
  }
  
  // !pools top - Top pools by TVL
  async poolsTopCommand(args) {
    const limit = parseInt(args[0]) || 10;
    const pools = await atmosPools.getTopPools(Math.min(limit, 20));
    
    if (!pools || pools.length === 0) {
      return '⚠️ No pools found.';
    }
    
    let response = `**💧 Top ${pools.length} Pools by TVL**\n\n`;
    
    pools.forEach((pool, i) => {
      const pair = pool.coin_3_symbol 
        ? `${pool.coin_1_symbol}/${pool.coin_2_symbol}/${pool.coin_3_symbol}`
        : `${pool.coin_1_symbol}/${pool.coin_2_symbol}`;
      
      const tvl = parseFloat(pool.pool_tvl_usd || 0);
      const volume = parseFloat(pool.pool_volume_usd || 0);
      const fee = pool.swap_fee_bps / 100;
      const apr = this.estimateAPR(volume, tvl, pool.swap_fee_bps);
      
      response += `**${i + 1}. ${pair}**\n`;
      response += `   TVL: $${this.formatNumberCompact(tvl)} | `;
      response += `Vol: $${this.formatNumberCompact(volume)} | `;
      response += `APR: ${apr.toFixed(1)}%\n`;
    });
    
    const totalTVL = pools.reduce((sum, p) => sum + parseFloat(p.pool_tvl_usd || 0), 0);
    response += `\n**Total TVL:** $${this.formatNumberCompact(totalTVL)}`;
    
    return response;
  }
  
  // !pools find <token> - Find pools with token
  async poolsFindCommand(args) {
    if (args.length === 0) {
      return '⚠️ Usage: `!pools find <token>`\nExample: `!pools find SUPRA`';
    }
    
    const token = args.join(' ').toUpperCase();
    
    // Get all pools and filter
    const allPools = await atmosPools.getTopPools(100);
    const matchingPools = allPools.filter(pool => 
      pool.coin_1_symbol?.toUpperCase().includes(token) ||
      pool.coin_2_symbol?.toUpperCase().includes(token) ||
      pool.coin_3_symbol?.toUpperCase().includes(token)
    );
    
    if (matchingPools.length === 0) {
      return `⚠️ No pools found with token: **${token}**`;
    }
    
    let response = `**💧 Pools with ${token}** (Top ${Math.min(matchingPools.length, 10)})\n\n`;
    
    matchingPools.slice(0, 10).forEach((pool, i) => {
      const pair = pool.coin_3_symbol 
        ? `${pool.coin_1_symbol}/${pool.coin_2_symbol}/${pool.coin_3_symbol}`
        : `${pool.coin_1_symbol}/${pool.coin_2_symbol}`;
      
      const tvl = parseFloat(pool.pool_tvl_usd || 0);
      const apr = this.estimateAPR(
        parseFloat(pool.pool_volume_usd || 0),
        tvl,
        pool.swap_fee_bps
      );
      
      response += `**${i + 1}. ${pair}**\n`;
      response += `   TVL: $${this.formatNumberCompact(tvl)} | APR: ${apr.toFixed(1)}%\n`;
    });
    
    if (matchingPools.length > 10) {
      response += `\n_+${matchingPools.length - 10} more pools_`;
    }
    
    return response;
  }
  
  // !pools info <token1> <token2> - Pool details
  async poolsInfoCommand(args) {
    if (args.length < 2) {
      return '⚠️ Usage: `!pools info <token1> <token2>`\nExample: `!pools info SUPRA CASH`';
    }
    
    const token1 = args[0];
    const token2 = args[1];
    
    const pools = await atmosPools.getPoolByTokens(token1, token2);
    
    if (!pools || pools.length === 0) {
      return `⚠️ No pool found for **${token1}/${token2}**`;
    }
    
    // Get the biggest pool by TVL
    const pool = pools.sort((a, b) => 
      parseFloat(b.pool_tvl_usd || 0) - parseFloat(a.pool_tvl_usd || 0)
    )[0];
    
    const pair = pool.coin_3_symbol 
      ? `${pool.coin_1_symbol}/${pool.coin_2_symbol}/${pool.coin_3_symbol}`
      : `${pool.coin_1_symbol}/${pool.coin_2_symbol}`;
    
    const tvl = parseFloat(pool.pool_tvl_usd || 0);
    const volume = parseFloat(pool.pool_volume_usd || 0);
    const fee = pool.swap_fee_bps / 100;
    const apr = this.estimateAPR(volume, tvl, pool.swap_fee_bps);
    
    let response = `**💧 ${pair}**\n\n`;
    response += `**TVL:** $${this.formatNumberCompact(tvl)}\n`;
    response += `**Volume (24h):** $${this.formatNumberCompact(volume)}\n`;
    response += `**Fee:** ${fee}%\n`;
    response += `**APR Estimate:** ${apr.toFixed(1)}%\n`;
    response += `**Type:** ${pool.pool_type === 100 ? 'Stable' : 'Standard'}\n\n`;
    
    response += `**Reserves:**\n`;
    response += `• ${pool.coin_1_symbol}: ${this.formatNumberCompact(parseFloat(pool.amount_1 || 0))}\n`;
    response += `• ${pool.coin_2_symbol}: ${this.formatNumberCompact(parseFloat(pool.amount_2 || 0))}\n`;
    if (pool.coin_3_symbol) {
      response += `• ${pool.coin_3_symbol}: ${this.formatNumberCompact(parseFloat(pool.amount_3 || 0))}\n`;
    }
    
    response += `\n**Address:** \`${pool.pool_address.slice(0, 10)}...${pool.pool_address.slice(-8)}\``;
    
    if (pools.length > 1) {
      response += `\n\n_${pools.length - 1} other pool(s) available_`;
    }
    
    return response;
  }
  
  // !pools live - Recent events
  async poolsLiveCommand(args) {
    // Get top pool (SUPRA/CASH) for live events
    const pools = await atmosPools.getTopPools(1);
    
    if (!pools || pools.length === 0) {
      return '⚠️ No pools found.';
    }
    
    const pool = pools[0];
    const events = await atmosPools.getLiveEvents(pool.pool_address, 5);
    
    if (!events || events.length === 0) {
      return '⚠️ No recent events found.';
    }
    
    const pair = pool.coin_3_symbol 
      ? `${pool.coin_1_symbol}/${pool.coin_2_symbol}/${pool.coin_3_symbol}`
      : `${pool.coin_1_symbol}/${pool.coin_2_symbol}`;
    
    let response = `**⚡ Recent Events - ${pair}**\n\n`;
    
    events.forEach((event, i) => {
      const time = new Date(event.created_at);
      const timeStr = time.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      const amount1 = parseFloat(event.amount_1 || 0);
      const amount2 = parseFloat(event.amount_2 || 0);
      
      response += `**${event.event_type}** @ ${timeStr}\n`;
      response += `   ${this.formatNumberCompact(amount1)} / ${this.formatNumberCompact(amount2)}\n`;
    });
    
    response += `\n_Pool TVL: $${this.formatNumberCompact(parseFloat(pool.pool_tvl_usd || 0))}_`;
    
    return response;
  }
  
  // Helper: Estimate APR from volume/tvl/fee
  estimateAPR(volume24h, tvl, feeBps) {
    if (!tvl || tvl === 0) return 0;
    const feeRate = feeBps / 10000;
    const dailyFees = volume24h * feeRate;
    const yearlyFees = dailyFees * 365;
    return (yearlyFees / tvl) * 100;
  }
  
  // !mylp [wallet] - Show user's LP positions
  async mylpCommand(args) {
    // Default to Zorgbot's deployer wallet if no arg
    const wallet = args[0] || '0x4c286a0451ceC8270eA09468eA38ca60Cf113992';
    
    if (!wallet.match(/^0x[a-fA-F0-9]{64}$/)) {
      return '⚠️ Invalid wallet address. Must be 0x... (66 chars)';
    }
    
    try {
      const positions = await atmosPools.getUserLP(wallet);
      const locks = atmosPools.checkLPUnlocks(wallet);
      
      let response = `**💧 LP Positions - \`${wallet.slice(0, 10)}...${wallet.slice(-8)}\`**\n\n`;
      
      // Active positions
      if (positions.length === 0) {
        response += `_No active LP positions found._\n\n`;
      } else {
        response += `**Active Positions:**\n`;
        
        positions.forEach((pos, i) => {
          const pair = pos.pool.coin_3_symbol 
            ? `${pos.pool.coin_1_symbol}/${pos.pool.coin_2_symbol}/${pos.pool.coin_3_symbol}`
            : `${pos.pool.coin_1_symbol}/${pos.pool.coin_2_symbol}`;
          
          response += `\n**${i + 1}. ${pair}**\n`;
          response += `   LP Balance: ${this.formatNumberCompact(pos.lpBalance)}\n`;
          response += `   Pool TVL: $${this.formatNumberCompact(parseFloat(pos.pool.pool_tvl_usd || 0))}\n`;
        });
        
        response += `\n`;
      }
      
      // Locked LP
      if (locks.length > 0) {
        response += `**🔒 Locked Positions:**\n`;
        
        locks.forEach(lock => {
          response += `\n**${lock.pair}**\n`;
          response += `   Amount: ${lock.lockedAmount} LP\n`;
          response += `   Unlocks: ${lock.unlockDate.toLocaleString('en-US', { 
            dateStyle: 'short', 
            timeStyle: 'short' 
          })}\n`;
          
          if (lock.daysRemaining >= 1) {
            response += `   ⏳ ${lock.daysRemaining.toFixed(1)} days remaining\n`;
          } else {
            response += `   ⏳ ${lock.hoursRemaining.toFixed(1)} hours remaining\n`;
          }
          
          if (lock.unlockSoon) {
            response += `   ⚠️ **UNLOCKS SOON (<24h)!**\n`;
          }
        });
      }
      
      return response;
      
    } catch (error) {
      console.error('❌ !mylp error:', error.message);
      return '⚠️ Failed to fetch LP positions. Try again later.';
    }
  }

  // Helper: Format number compact
  formatNumberCompact(num) {
    if (!num || isNaN(num)) return '0';
    
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    if (num >= 1) return num.toFixed(2);
    if (num >= 0.01) return num.toFixed(4);
    return num.toFixed(8);
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
