#!/usr/bin/env node
/**
 * Check LP Unlock Alerts
 * Runs daily to check if locked LP will unlock soon (<24h)
 * Sends Discord alert with interactive buttons
 */

const atmosPools = require('./atmos-pools.js');
const fs = require('fs');
const path = require('path');

// Wallets to monitor
const MONITORED_WALLETS = [
  '0x4c286a0451ceC8270eA09468eA38ca60Cf113992' // Rene's wallet
];

// Load Discord config
function loadDiscordConfig() {
  const envPath = path.join(__dirname, '..', 'mistral-manager', '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const config = {};
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      config[key.trim()] = valueParts.join('=').trim();
    }
  });
  
  return {
    token: config.DISCORD_BOT_TOKEN,
    supraHerosId: config.DISCORD_SUPRA_HEROS_SERVER_ID,
    channelId: config.DISCORD_ALERT_CHANNEL_ID || null // Optional: dedicated alert channel
  };
}

// Send Discord alert with buttons
async function sendDiscordAlert(lock, topPools) {
  const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
  const config = loadDiscordConfig();
  
  if (!config.token) {
    console.log('⚠️ Discord token not found, skipping Discord alert');
    return false;
  }
  
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages
    ]
  });
  
  return new Promise((resolve) => {
    client.once('ready', async () => {
      console.log('✅ Discord client ready');
      
      try {
        // Find the right channel (DM or server)
        let channel;
        if (config.channelId) {
          channel = await client.channels.fetch(config.channelId);
        } else {
          // Fallback: post in Supra Heros general/alerts channel
          const guild = await client.guilds.fetch(config.supraHerosId);
          channel = guild.channels.cache.find(c => 
            c.name.includes('alert') || c.name.includes('general')
          );
        }
        
        if (!channel) {
          console.log('❌ No suitable channel found');
          client.destroy();
          resolve(false);
          return;
        }
        
        // Create embed
        const embed = new EmbedBuilder()
          .setColor('#FF6B35')
          .setTitle('🚨 LP UNLOCK ALERT!')
          .setDescription(`Your locked LP position will unlock soon!`)
          .addFields(
            { name: '💧 Pair', value: lock.pair, inline: true },
            { name: '💰 Amount', value: `${lock.lockedAmount} LP`, inline: true },
            { name: '⏰ Unlocks', value: lock.unlockDate.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }), inline: false },
            { name: '⏳ Time Remaining', value: `${lock.hoursRemaining.toFixed(1)} hours`, inline: true }
          )
          .setTimestamp();
        
        // Add top 3 safe pools
        if (topPools && topPools.length > 0) {
          const poolsText = topPools.map((pool, i) => {
            const pair = pool.coin_3_symbol 
              ? `${pool.coin_1_symbol}/${pool.coin_2_symbol}/${pool.coin_3_symbol}`
              : `${pool.coin_1_symbol}/${pool.coin_2_symbol}`;
            const riskIcon = pool.highRisk ? ' ⚠️' : ' ✅';
            const scoreLabel = ` (Score: ${pool.score.toFixed(0)})`;
            return `**${i + 1}. ${pair}**${riskIcon}\n   APR: ${pool.apr.toFixed(1)}% | TVL: $${formatCompact(pool.tvl)}${scoreLabel}`;
          }).join('\n\n');
          
          embed.addFields({
            name: '\n📊 Top Safe Pools (Filtered & Scored)',
            value: poolsText,
            inline: false
          });
          
          embed.addFields({
            name: '🛡️ Safety Filters',
            value: `Min TVL: $${SAFETY_CONFIG.minTVL.toLocaleString()} | Max APR: ${SAFETY_CONFIG.maxAPR}%\n⚠️ = High risk (APR >${SAFETY_CONFIG.warnAPR}%) | ✅ = Safe range`,
            inline: false
          });
        }
        
        // Create buttons
        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('lp_unlock_best_pool')
              .setLabel('✅ Use Best Pool')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('lp_unlock_show_all')
              .setLabel('🔄 Show All Pools')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('lp_unlock_cancel')
              .setLabel('❌ Remind Later')
              .setStyle(ButtonStyle.Secondary)
          );
        
        // Send message
        const message = await channel.send({
          embeds: [embed],
          components: [row]
        });
        
        console.log(`✅ Alert sent to channel: ${channel.name}`);
        
        // Save alert state for button handler
        const alertState = {
          messageId: message.id,
          channelId: channel.id,
          lock: lock,
          topPools: topPools,
          timestamp: Date.now()
        };
        
        fs.writeFileSync(
          path.join(__dirname, '..', '.lp-unlock-alert.json'),
          JSON.stringify(alertState, null, 2)
        );
        
        client.destroy();
        resolve(true);
        
      } catch (error) {
        console.error('❌ Failed to send Discord alert:', error.message);
        client.destroy();
        resolve(false);
      }
    });
    
    client.login(config.token).catch(error => {
      console.error('❌ Discord login failed:', error.message);
      resolve(false);
    });
  });
}

// Safety filters and scoring
const SAFETY_CONFIG = {
  minTVL: 10000,        // $10k minimum TVL
  maxAPR: 500,          // 500% maximum APR
  warnAPR: 200,         // Warn if APR > 200%
  tvlWeight: 0.6,       // 60% weight on TVL stability
  aprWeight: 0.4        // 40% weight on APR
};

// Helper: Calculate pool safety score (0-100)
function calculatePoolScore(pool) {
  const tvl = parseFloat(pool.pool_tvl_usd || 0);
  const apr = estimateAPR(
    parseFloat(pool.pool_volume_usd || 0),
    tvl,
    pool.swap_fee_bps
  );
  
  // TVL score (0-100): logarithmic scale, max at $1M+
  let tvlScore = 0;
  if (tvl >= 1000000) {
    tvlScore = 100;
  } else if (tvl >= 100000) {
    tvlScore = 70 + (Math.log10(tvl / 100000) / Math.log10(10)) * 30;
  } else if (tvl >= 10000) {
    tvlScore = 40 + (Math.log10(tvl / 10000) / Math.log10(10)) * 30;
  } else {
    tvlScore = (tvl / 10000) * 40; // Linear below min
  }
  
  // APR score (0-100): cap at 200%, penalize extremes
  let aprScore = 0;
  if (apr > SAFETY_CONFIG.maxAPR) {
    aprScore = 0; // Exclude unrealistic APRs
  } else if (apr > SAFETY_CONFIG.warnAPR) {
    // Penalty for high risk APR (200-500%)
    aprScore = 60 - ((apr - SAFETY_CONFIG.warnAPR) / (SAFETY_CONFIG.maxAPR - SAFETY_CONFIG.warnAPR)) * 40;
  } else if (apr >= 50) {
    // Good APR range (50-200%)
    aprScore = 60 + ((apr - 50) / (SAFETY_CONFIG.warnAPR - 50)) * 40;
  } else if (apr >= 10) {
    // Okay APR (10-50%)
    aprScore = 30 + ((apr - 10) / 40) * 30;
  } else {
    // Low APR (<10%)
    aprScore = (apr / 10) * 30;
  }
  
  // Weighted score
  const finalScore = (tvlScore * SAFETY_CONFIG.tvlWeight) + (aprScore * SAFETY_CONFIG.aprWeight);
  
  return {
    score: finalScore,
    tvlScore,
    aprScore,
    tvl,
    apr,
    highRisk: apr > SAFETY_CONFIG.warnAPR,
    unrealistic: apr > SAFETY_CONFIG.maxAPR,
    lowLiquidity: tvl < SAFETY_CONFIG.minTVL
  };
}

// Filter and sort pools by safety score
function filterAndScorePools(pools) {
  return pools
    .map(pool => ({
      ...pool,
      ...calculatePoolScore(pool)
    }))
    .filter(pool => 
      !pool.unrealistic && 
      !pool.lowLiquidity &&
      pool.score > 0
    )
    .sort((a, b) => b.score - a.score);
}

// Helper functions
function estimateAPR(volume24h, tvl, feeBps) {
  if (!tvl || tvl === 0) return 0;
  const feeRate = feeBps / 10000;
  const dailyFees = volume24h * feeRate;
  const yearlyFees = dailyFees * 365;
  return (yearlyFees / tvl) * 100;
}

function formatCompact(num) {
  if (!num || isNaN(num)) return '0';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
}

async function checkUnlocks() {
  console.log('🔍 Checking LP unlocks...\n');
  
  let alertsFound = false;
  
  for (const wallet of MONITORED_WALLETS) {
    const locks = atmosPools.checkLPUnlocks(wallet);
    
    if (locks.length === 0) {
      console.log(`   ${wallet.slice(0, 10)}...: No locks found`);
      continue;
    }
    
    // Check for locks unlocking soon
    const urgentLocks = locks.filter(lock => lock.unlockSoon);
    
    if (urgentLocks.length > 0) {
      alertsFound = true;
      
      console.log(`\n🚨 URGENT: LP Unlocking Soon!\n`);
      console.log(`Wallet: ${wallet}`);
      
      for (const lock of urgentLocks) {
        console.log(`\n   Pair: ${lock.pair}`);
        console.log(`   Amount: ${lock.lockedAmount} LP`);
        console.log(`   Unlocks: ${lock.unlockDate.toLocaleString()}`);
        console.log(`   Time Remaining: ${lock.hoursRemaining.toFixed(1)} hours`);
        console.log(`   ⚠️  ACTION REQUIRED: LP unlocks in less than 24 hours!`);
        
        // Fetch and filter pools by safety score
        console.log(`\n   📊 Fetching safe pools for re-staking...`);
        const allPools = await atmosPools.getTopPools(50);
        
        // Apply safety filters and scoring
        const safePools = filterAndScorePools(allPools);
        
        console.log(`\n   Filtered: ${allPools.length} → ${safePools.length} pools (safety filters applied)`);
        console.log(`   Filters: TVL ≥$${SAFETY_CONFIG.minTVL.toLocaleString()}, APR ≤${SAFETY_CONFIG.maxAPR}%`);
        
        const top3 = safePools.slice(0, 3);
        
        console.log(`\n   Top 3 Safe Pools (by score: ${SAFETY_CONFIG.tvlWeight*100}% TVL + ${SAFETY_CONFIG.aprWeight*100}% APR):`);
        top3.forEach((pool, i) => {
          const pair = pool.coin_3_symbol 
            ? `${pool.coin_1_symbol}/${pool.coin_2_symbol}/${pool.coin_3_symbol}`
            : `${pool.coin_1_symbol}/${pool.coin_2_symbol}`;
          const riskLabel = pool.highRisk ? ' ⚠️' : '';
          console.log(`      ${i + 1}. ${pair} - Score: ${pool.score.toFixed(1)} | APR: ${pool.apr.toFixed(1)}%${riskLabel} | TVL: $${formatCompact(pool.tvl)}`);
        });
        
        // Send Discord alert with buttons
        console.log(`\n   📢 Sending Discord alert...`);
        const sent = await sendDiscordAlert(lock, top3);
        
        if (sent) {
          console.log(`   ✅ Discord alert sent successfully!`);
        } else {
          console.log(`   ⚠️ Discord alert failed, check logs`);
        }
      }
    } else {
      console.log(`   ${wallet.slice(0, 10)}...: ${locks.length} lock(s), none urgent`);
      locks.forEach(lock => {
        console.log(`      - ${lock.pair}: ${lock.daysRemaining.toFixed(1)}d remaining`);
      });
    }
  }
  
  if (alertsFound) {
    console.log('\n📢 Alert(s) processed!\n');
    return 1; // Exit code 1 = alert triggered
  } else {
    console.log('\n✅ All good, no urgent unlocks.\n');
    return 0; // Exit code 0 = no alert
  }
}

// Run check
checkUnlocks()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(2);
  });
