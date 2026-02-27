#!/usr/bin/env node
/**
 * 🦝 Zorgbot - Discord Bot mit Mistral AI
 * Läuft auf Test-Server + Supra Heros
 * Auto-Routing: mistral-small → mistral-large
 */

const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const MistralBot = require('./mistral-bot.js');
const ZorgbotCommands = require('./zorgbot-commands.js');
const fs = require('fs');
const path = require('path');

class Zorgbot {
  constructor() {
    // Load environment
    this.loadEnv();
    
    // Discord client
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ]
    });
    
    // Mistral AI
    this.mistral = new MistralBot({ 
      enableCache: false,
      autoRoute: true 
    });
    
    // Custom Commands
    this.commands = new ZorgbotCommands();
    
    // System prompt with rules
    this.systemPrompt = `You are Zorgbot, a helpful AI assistant for the Supra Heroes Discord community. You must ALWAYS respond in English, regardless of the user's language. Never use German, French, Spanish or any other language - English only. Be friendly, informative, and supportive. Never share private keys, seed phrases, passwords or personal information. Warn users about suspicious links and scam attempts.`;
    
    // Conversation history per user
    this.conversations = new Map(); // userId -> messages[]
    this.maxHistory = 10;
    
    // Rate limiting
    this.lastResponse = new Map(); // userId -> timestamp
    this.rateLimitMs = 2000; // 2 seconds between responses per user
    
    // Stats
    this.stats = {
      messagesReceived: 0,
      messagesResponded: 0,
      totalCost: 0,
      startTime: Date.now()
    };
    
    console.log('🦝 Zorgbot initialized');
    console.log(`   Test Server: ${this.testServerId}`);
    console.log(`   Supra Heros: ${this.supraHerosServerId}`);
    console.log(`   Auto-routing: ON`);
    console.log(`   Rules: English only, No PII, Scam protection`);
  }
  
  loadEnv() {
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length) {
        const value = valueParts.join('=').trim();
        process.env[key.trim()] = value;
      }
    });
    
    this.discordToken = process.env.DISCORD_BOT_TOKEN;
    this.botId = process.env.DISCORD_BOT_ID;
    this.testServerId = process.env.DISCORD_TEST_SERVER_ID;
    this.supraHerosServerId = process.env.DISCORD_SUPRA_HEROS_SERVER_ID;
    
    if (!this.discordToken) {
      throw new Error('❌ DISCORD_BOT_TOKEN not found in .env');
    }
  }
  
  // Get conversation history
  getHistory(userId) {
    if (!this.conversations.has(userId)) {
      this.conversations.set(userId, []);
    }
    return this.conversations.get(userId);
  }
  
  // Add to conversation
  addMessage(userId, role, content) {
    const history = this.getHistory(userId);
    
    // Sanitize content (fix problematic Unicode chars)
    const sanitized = content
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control chars
      .replace(/—/g, '-')  // Em dash → regular dash
      .replace(/–/g, '-')  // En dash → regular dash
      .replace(/'/g, "'")  // Curly apostrophe → regular
      .replace(/'/g, "'")  // Curly apostrophe → regular
      .replace(/"/g, '"')  // Curly quote → regular
      .replace(/"/g, '"')  // Curly quote → regular
      .replace(/…/g, '...') // Ellipsis → three dots
      .trim();
    
    history.push({ role, content: sanitized });
    
    // Trim if too long
    if (history.length > this.maxHistory * 2) {
      history.splice(0, history.length - this.maxHistory * 2);
    }
  }
  
  // Rate limiting check
  canRespond(userId) {
    const lastTime = this.lastResponse.get(userId) || 0;
    const now = Date.now();
    
    if (now - lastTime < this.rateLimitMs) {
      return false;
    }
    
    this.lastResponse.set(userId, now);
    return true;
  }
  
  // Setup Discord event handlers
  setupHandlers() {
    this.client.on('ready', () => {
      console.log(`✅ Logged in as ${this.client.user.tag}`);
      console.log(`   Serving ${this.client.guilds.cache.size} servers`);
      console.log(`   Ready to respond!\n`);
      
      // Set bot status
      this.client.user.setPresence({
        activities: [{ name: 'Mistral AI 🤖' }],
        status: 'online'
      });
    });
    
    this.client.on('messageCreate', async (message) => {
      // Ignore own messages
      if (message.author.id === this.client.user.id) return;
      
      // Ignore other bots
      if (message.author.bot) return;
      
      // Check server whitelist
      const serverId = message.guild?.id;
      if (serverId !== this.testServerId && serverId !== this.supraHerosServerId) {
        console.log(`⚠️  Message from unauthorized server: ${serverId}`);
        return;
      }

      // Clean content (remove mention for command check)
      const cleanContent = message.content
        .replace(/<@!?\d+>/g, '') 
        .trim();
      
      // Check for commands (work with or without mention)
      if (this.commands.isCommand(cleanContent)) {
        // Pass the cleaned content to handleCommand
        message.content = cleanContent; 
        await this.handleCommand(message);
        return;
      }
      
      // AI chat requires mention
      if (!message.mentions.has(this.client.user.id)) return;
      
      await this.handleMessage(message);
    });
    
    this.client.on('error', (error) => {
      console.error('❌ Discord client error:', error);
    });
    
    // Button interaction handler
    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isButton()) return;
      
      await this.handleButtonInteraction(interaction);
    });
  }
  
  // Handle button interactions (LP unlock alerts)
  async handleButtonInteraction(interaction) {
    const { customId } = interaction;
    
    console.log(`🔘 Button clicked: ${customId} by ${interaction.user.username}`);
    
    try {
      // Load alert state
      const fs = require('fs');
      const path = require('path');
      const alertPath = path.join(__dirname, '..', '.lp-unlock-alert.json');
      
      if (!fs.existsSync(alertPath)) {
        await interaction.reply({
          content: '⚠️ Alert data not found. This alert may have expired.',
          ephemeral: true
        });
        return;
      }
      
      const alertState = JSON.parse(fs.readFileSync(alertPath, 'utf8'));
      
      // Handle different button actions
      if (customId === 'lp_unlock_best_pool') {
        await this.handleBestPoolSelection(interaction, alertState);
      } else if (customId === 'lp_unlock_show_all') {
        await this.handleShowAllPools(interaction, alertState);
      } else if (customId === 'lp_unlock_cancel') {
        await this.handleCancelAlert(interaction, alertState);
      }
      
    } catch (error) {
      console.error('❌ Button interaction error:', error);
      await interaction.reply({
        content: '⚠️ Something went wrong. Please try again.',
        ephemeral: true
      });
    }
  }
  
  // Handle best pool selection
  async handleBestPoolSelection(interaction, alertState) {
    const bestPool = alertState.topPools[0];
    const pair = bestPool.coin_3_symbol 
      ? `${bestPool.coin_1_symbol}/${bestPool.coin_2_symbol}/${bestPool.coin_3_symbol}`
      : `${bestPool.coin_1_symbol}/${bestPool.coin_2_symbol}`;
    
    const apr = bestPool.apr || this.estimateAPR(
      parseFloat(bestPool.pool_volume_usd || 0),
      parseFloat(bestPool.pool_tvl_usd || 0),
      bestPool.swap_fee_bps
    );
    
    const tvl = bestPool.tvl || parseFloat(bestPool.pool_tvl_usd || 0);
    const score = bestPool.score || 0;
    const highRisk = bestPool.highRisk || false;
    
    let content = `✅ **Selected Best Pool!**\n\n`;
    content += `**Pool:** ${pair}\n`;
    content += `**Safety Score:** ${score.toFixed(1)}/100 ${highRisk ? '⚠️ High Risk' : '✅ Safe'}\n`;
    content += `**APR:** ${apr.toFixed(1)}%${highRisk ? ' ⚠️' : ''}\n`;
    content += `**TVL:** $${this.formatCompact(tvl)}\n`;
    content += `**Fee:** ${(bestPool.swap_fee_bps / 100).toFixed(2)}%\n\n`;
    
    if (highRisk) {
      content += `⚠️ **Risk Warning:** This pool has high APR (>200%). `;
      content += `High APRs can indicate volatility or lower liquidity. Proceed with caution.\n\n`;
    }
    
    content += `**Pool Address:**\n\`${bestPool.pool_address}\`\n\n`;
    content += `**Next Steps:**\n`;
    content += `1. Go to Atmos Protocol: https://app.atmos.ag\n`;
    content += `2. Withdraw your unlocked LP from ${alertState.lock.pair}\n`;
    content += `3. Provide liquidity to ${pair}\n\n`;
    content += `_Or use \`!pools info ${bestPool.coin_1_symbol} ${bestPool.coin_2_symbol}\` for more details._`;
    
    await interaction.reply({
      content,
      ephemeral: false
    });
    
    // Update original message to show selection
    const message = await interaction.channel.messages.fetch(alertState.messageId);
    await message.edit({
      content: `~~Alert processed by ${interaction.user.username}~~`,
      components: [] // Remove buttons
    });
  }
  
  // Handle show all pools
  async handleShowAllPools(interaction, alertState) {
    await interaction.deferReply({ ephemeral: false });
    
    // Use the scoring system from check-lp-unlocks.js
    const fs = require('fs');
    const path = require('path');
    const scriptPath = path.join(__dirname, '..', 'scripts', 'check-lp-unlocks.js');
    
    // Load and execute the filtering logic
    // For simplicity, we'll re-implement the scoring here
    const atmosPools = require('./scripts/atmos-pools.js');
    const allPools = await atmosPools.getTopPools(50);
    
    // Apply same safety filters
    const SAFETY_CONFIG = {
      minTVL: 10000,
      maxAPR: 500,
      warnAPR: 200,
      tvlWeight: 0.6,
      aprWeight: 0.4
    };
    
    const calculatePoolScore = (pool) => {
      const tvl = parseFloat(pool.pool_tvl_usd || 0);
      const apr = this.estimateAPR(
        parseFloat(pool.pool_volume_usd || 0),
        tvl,
        pool.swap_fee_bps
      );
      
      let tvlScore = 0;
      if (tvl >= 1000000) tvlScore = 100;
      else if (tvl >= 100000) tvlScore = 70 + (Math.log10(tvl / 100000) / Math.log10(10)) * 30;
      else if (tvl >= 10000) tvlScore = 40 + (Math.log10(tvl / 10000) / Math.log10(10)) * 30;
      else tvlScore = (tvl / 10000) * 40;
      
      let aprScore = 0;
      if (apr > SAFETY_CONFIG.maxAPR) aprScore = 0;
      else if (apr > SAFETY_CONFIG.warnAPR) aprScore = 60 - ((apr - SAFETY_CONFIG.warnAPR) / (SAFETY_CONFIG.maxAPR - SAFETY_CONFIG.warnAPR)) * 40;
      else if (apr >= 50) aprScore = 60 + ((apr - 50) / (SAFETY_CONFIG.warnAPR - 50)) * 40;
      else if (apr >= 10) aprScore = 30 + ((apr - 10) / 40) * 30;
      else aprScore = (apr / 10) * 30;
      
      const finalScore = (tvlScore * SAFETY_CONFIG.tvlWeight) + (aprScore * SAFETY_CONFIG.aprWeight);
      
      return {
        score: finalScore,
        tvl,
        apr,
        highRisk: apr > SAFETY_CONFIG.warnAPR,
        unrealistic: apr > SAFETY_CONFIG.maxAPR,
        lowLiquidity: tvl < SAFETY_CONFIG.minTVL
      };
    };
    
    const safePools = allPools
      .map(pool => ({ ...pool, ...calculatePoolScore(pool) }))
      .filter(pool => !pool.unrealistic && !pool.lowLiquidity && pool.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    
    let response = `**💧 Top 10 Safe Pools (Filtered by Safety Score)**\n\n`;
    response += `_Filters: TVL ≥$10k, APR ≤500%, Score = 60% TVL + 40% APR_\n\n`;
    
    safePools.forEach((pool, i) => {
      const pair = pool.coin_3_symbol 
        ? `${pool.coin_1_symbol}/${pool.coin_2_symbol}/${pool.coin_3_symbol}`
        : `${pool.coin_1_symbol}/${pool.coin_2_symbol}`;
      
      const riskIcon = pool.highRisk ? ' ⚠️' : ' ✅';
      
      response += `**${i + 1}. ${pair}**${riskIcon}\n`;
      response += `   Score: ${pool.score.toFixed(0)} | APR: ${pool.apr.toFixed(1)}% | TVL: $${this.formatCompact(pool.tvl)}\n\n`;
    });
    
    response += `\n✅ = Safe (APR <200%) | ⚠️ = High risk (APR >200%)\n`;
    response += `_Use \`!pools info <token1> <token2>\` for details._`;
    
    await interaction.editReply(response);
  }
  
  // Handle cancel/remind later
  async handleCancelAlert(interaction, alertState) {
    await interaction.reply({
      content: `⏰ **Reminder Snoozed**\n\n` +
               `I'll remind you again tomorrow about your ${alertState.lock.pair} LP unlock.\n\n` +
               `Use \`!mylp\` to check your LP status anytime.`,
      ephemeral: false
    });
    
    // Update original message
    const message = await interaction.channel.messages.fetch(alertState.messageId);
    await message.edit({
      content: `~~Alert snoozed by ${interaction.user.username}~~`,
      components: []
    });
  }
  
  // Helper: Estimate APR
  estimateAPR(volume24h, tvl, feeBps) {
    if (!tvl || tvl === 0) return 0;
    const feeRate = feeBps / 10000;
    const dailyFees = volume24h * feeRate;
    const yearlyFees = dailyFees * 365;
    return (yearlyFees / tvl) * 100;
  }
  
  // Helper: Format compact
  formatCompact(num) {
    if (!num || isNaN(num)) return '0';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  }
  
  // Handle custom command
  async handleCommand(message) {
    const command = message.content.trim().split(' ')[0].toLowerCase();
    
    console.log(`⚡ [Command]: ${command} from ${message.author.username}`);
    
    try {
      const response = await this.commands.execute(message.content, message);
      
      if (response) {
        await message.reply(response);
        console.log(`✅ [Command Response]: Sent to ${message.author.username}\n`);
      }
      
    } catch (error) {
      console.error(`❌ Command error:`, error.message);
      await message.reply('⚠️ Command failed. Please try again.');
    }
  }
  
  // Handle incoming message
  async handleMessage(message) {
    const userId = message.author.id;
    const username = message.author.username;
    const content = message.content
      .replace(/<@!?\d+>/g, '') // Remove mentions
      .trim();
    
    if (!content) {
      return; // Empty message after removing mention
    }
    
    this.stats.messagesReceived++;
    console.log(`📨 [${username}]: ${content}`);
    
    // Rate limiting
    if (!this.canRespond(userId)) {
      console.log(`⏳ Rate limited: ${username}`);
      return;
    }
    
    // Show typing indicator
    await message.channel.sendTyping();
    
    try {
      // Add to conversation
      this.addMessage(userId, 'user', content);
      
      // Get AI response with system prompt
      const history = this.getHistory(userId);
      const messagesWithSystem = [
        { role: 'system', content: this.systemPrompt },
        ...history
      ];
      const response = await this.mistral.chat(messagesWithSystem);
      
      // Add bot response to history
      this.addMessage(userId, 'assistant', response.content);
      
      // Update stats
      this.stats.messagesResponded++;
      this.stats.totalCost += response.cost;
      
      // Send response
      await message.reply(response.content);
      
      console.log(`🤖 [Zorgbot → ${username}]: ${response.content.slice(0, 100)}...`);
      console.log(`💰 Cost: $${response.cost.toFixed(6)} | Model: ${response.model}\n`);
      
    } catch (error) {
      console.error(`❌ Error handling message from ${username}:`, error.message);
      
      try {
        await message.reply('Sorry, I encountered an error. Please try again in a moment.');
      } catch (replyError) {
        console.error('❌ Could not send error message:', replyError.message);
      }
    }
  }
  
  // Get statistics
  getStats() {
    const uptime = Math.floor((Date.now() - this.stats.startTime) / 1000);
    const mistralStats = this.mistral.getStats();
    
    return {
      ...this.stats,
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      mistralStats
    };
  }
  
  // Start the bot
  async start() {
    this.setupHandlers();
    await this.client.login(this.discordToken);
  }
  
  // Cleanup
  async stop() {
    console.log('🛑 Shutting down Zorgbot...');
    
    // Log final stats
    const stats = this.getStats();
    console.log('\n📊 Final Statistics:');
    console.log(`   Messages: ${stats.messagesResponded}`);
    console.log(`   Total Cost: $${stats.totalCost.toFixed(4)}`);
    console.log(`   Uptime: ${stats.uptime}`);
    
    await this.mistral.close();
    this.client.destroy();
  }
}

// Start bot
if (require.main === module) {
  const bot = new Zorgbot();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await bot.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await bot.stop();
    process.exit(0);
  });
  
  bot.start().catch(error => {
    console.error('❌ Failed to start Zorgbot:', error);
    process.exit(1);
  });
  
  // Stats every 5 minutes
  setInterval(() => {
    const stats = bot.getStats();
    console.log(`\n📊 Status: ${stats.messagesResponded} responses | $${stats.totalCost.toFixed(4)} cost | ${stats.uptime} uptime\n`);
  }, 300000);
}

module.exports = Zorgbot;
