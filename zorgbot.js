#!/usr/bin/env node
/**
 * 🦝 Zorgbot - Discord Bot mit Mistral AI
 * Läuft auf Test-Server + Supra Heros
 * Auto-Routing: mistral-small → mistral-large
 */

const { Client, GatewayIntentBits } = require('discord.js');
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
    this.systemPrompt = `You are Zorgbot, a helpful AI assistant for the Supra Heroes Discord community.

STRICT RULES:
1. ENGLISH ONLY - Always respond in English, regardless of the user's language
2. NO PERSONAL INFORMATION - Never share or ask for private keys, seed phrases, passwords, personal addresses, or sensitive data
3. SCAM PROTECTION - Warn users about suspicious links, phishing attempts, or scam requests. Never provide links to unofficial sites.
4. PROFESSIONAL & HELPFUL - Be friendly, informative, and supportive of the Supra ecosystem
5. COMMUNITY FOCUS - Help with Supra-related questions, NFTs, ecosystem projects, and general crypto knowledge

If someone asks you to share private information or suspicious links, politely decline and warn them about security risks.`;
    
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
  }
  
  // Handle custom command
  async handleCommand(message) {
    const command = message.content.trim().split(' ')[0].toLowerCase();
    
    console.log(`⚡ [Command]: ${command} from ${message.author.username}`);
    
    try {
      const response = await this.commands.execute(message.content);
      
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
