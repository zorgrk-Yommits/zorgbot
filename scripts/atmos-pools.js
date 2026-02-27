#!/usr/bin/env node

const https = require('https');
const fs = require('fs');

const GRAPHQL_URL = 'prod-gw.atmosprotocol.com';
const API_KEY = fs.readFileSync('/data/.openclaw/workspace/.atmos-api-key', 'utf8').trim();

// GraphQL Request Helper
async function graphqlRequest(query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query });
    
    const options = {
      hostname: GRAPHQL_URL,
      path: '/graphql/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'x-api-key': API_KEY
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (result.errors) {
            reject(new Error(result.errors[0].message));
          } else {
            resolve(result.data);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Format number with commas
function formatNumber(num, decimals = 2) {
  if (!num || isNaN(num)) return '0';
  return parseFloat(num).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

// Calculate APR estimate (Volume * Fee * 365 / TVL)
function estimateAPR(volume24h, tvl, feeBps) {
  if (!tvl || tvl === 0) return 0;
  const feeRate = feeBps / 10000; // Convert bps to decimal
  const dailyFees = volume24h * feeRate;
  const yearlyFees = dailyFees * 365;
  return (yearlyFees / tvl) * 100;
}

// 1. Get Top Pools
async function getTopPools(limit = 10) {
  const query = `
    {
      atmos_pools(limit: ${limit}, order_by: {pool_tvl_usd: desc}) {
        id
        pool_address
        pool_type
        pool_tvl_usd
        pool_volume_usd
        swap_fee_bps
        coin_1_symbol
        coin_2_symbol
        coin_3_symbol
        amount_1
        amount_2
        amount_3
        minted_lp_token_amount
        created_at
      }
    }
  `;

  const data = await graphqlRequest(query);
  return data.atmos_pools;
}

// 2. Get Pool by Token Pair
async function getPoolByTokens(symbol1, symbol2) {
  // Support both full names and short symbols
  const s1 = symbol1.toUpperCase();
  const s2 = symbol2.toUpperCase();
  
  const query = `
    {
      atmos_pools(
        where: {
          _or: [
            {
              _and: [
                {coin_1_symbol: {_ilike: "%${s1}%"}},
                {coin_2_symbol: {_ilike: "%${s2}%"}}
              ]
            },
            {
              _and: [
                {coin_1_symbol: {_ilike: "%${s2}%"}},
                {coin_2_symbol: {_ilike: "%${s1}%"}}
              ]
            }
          ]
        }
      ) {
        id
        pool_address
        pool_type
        pool_tvl_usd
        pool_volume_usd
        swap_fee_bps
        coin_1_symbol
        coin_2_symbol
        coin_3_symbol
        amount_1
        amount_2
        amount_3
        minted_lp_token_amount
        created_at
      }
    }
  `;

  const data = await graphqlRequest(query);
  return data.atmos_pools;
}

// 3. Get Pool Volume History
async function getPoolVolume(poolAddress) {
  const query = `
    {
      pool_volume_history(
        where: {pool_address: {_eq: "${poolAddress}"}},
        order_by: {timestamp: desc},
        limit: 7
      ) {
        id
        pool_address
        volume_usd
        timestamp
      }
    }
  `;

  const data = await graphqlRequest(query);
  return data.pool_volume_history;
}

// 4. Get Live Pool Events
async function getLiveEvents(poolAddress, limit = 20) {
  const query = `
    {
      atmos_pool_events(
        where: {pool_address: {_eq: "${poolAddress}"}},
        order_by: {created_at: desc},
        limit: ${limit}
      ) {
        id
        event_type
        pool_address
        user_address
        amount_1
        amount_2
        amount_3
        lp_token_amount
        burned_lp_token_amount
        tx_hash
        created_at
      }
    }
  `;

  const data = await graphqlRequest(query);
  return data.atmos_pool_events;
}

// 5. Get User LP Positions
async function getUserLP(walletAddress) {
  const query = `
    {
      atmos_pool_events(
        where: {
          user_address: {_eq: "${walletAddress}"},
          event_type: {_in: ["AddLiquidity", "RemoveLiquidity"]}
        },
        order_by: {created_at: desc}
      ) {
        id
        event_type
        pool_address
        lp_token_amount
        burned_lp_token_amount
        amount_1
        amount_2
        amount_3
        created_at
        atmos_pool {
          coin_1_symbol
          coin_2_symbol
          coin_3_symbol
          pool_tvl_usd
          pool_type
        }
      }
    }
  `;

  const data = await graphqlRequest(query);
  
  // Group by pool and calculate net LP balance
  const poolMap = new Map();
  
  data.atmos_pool_events.forEach(event => {
    const poolAddr = event.pool_address;
    
    if (!poolMap.has(poolAddr)) {
      poolMap.set(poolAddr, {
        poolAddress: poolAddr,
        lpBalance: 0,
        totalAdded: 0,
        totalRemoved: 0,
        pool: event.atmos_pool,
        lastActivity: event.created_at
      });
    }
    
    const position = poolMap.get(poolAddr);
    
    if (event.event_type === 'AddLiquidity') {
      const amount = parseFloat(event.lp_token_amount || 0);
      position.lpBalance += amount;
      position.totalAdded += amount;
    } else if (event.event_type === 'RemoveLiquidity') {
      const amount = parseFloat(event.burned_lp_token_amount || 0);
      position.lpBalance -= amount;
      position.totalRemoved += amount;
    }
  });
  
  // Convert to array and filter out zero balances
  const positions = Array.from(poolMap.values())
    .filter(p => p.lpBalance > 0)
    .sort((a, b) => b.lpBalance - a.lpBalance);
  
  return positions;
}

// 6. Check if LP unlock is soon (hardcoded for known locks)
function checkLPUnlocks(walletAddress) {
  // Hardcoded LP locks (from MEMORY.md)
  const knownLocks = [
    {
      wallet: '0x4c286a0451ceC8270eA09468eA38ca60Cf113992',
      pair: 'SUPRA/COSMO',
      lockedAmount: 200.247,
      unlockDate: new Date('2026-03-03T15:48:07+01:00'), // 3.3.2026 15:48:07
      poolAddress: '0x8eae6fc4c7dbb3f9717a0ba6771a0359ca095a8ab99815e899a2b97093963416' // Main SUPRA/CASH pool (assumption)
    }
  ];
  
  const userLocks = knownLocks.filter(lock => 
    lock.wallet.toLowerCase() === walletAddress.toLowerCase()
  );
  
  const now = new Date();
  const alerts = [];
  
  userLocks.forEach(lock => {
    const timeToUnlock = lock.unlockDate - now;
    const hoursToUnlock = timeToUnlock / (1000 * 60 * 60);
    const daysToUnlock = hoursToUnlock / 24;
    
    if (timeToUnlock > 0) {
      alerts.push({
        ...lock,
        hoursRemaining: hoursToUnlock,
        daysRemaining: daysToUnlock,
        unlockSoon: hoursToUnlock <= 24 // Alert if < 24h
      });
    }
  });
  
  return alerts;
}

// Display Top Pools Table
function displayTopPools(pools) {
  console.log('\n🌊 TOP POOLS BY TVL\n');
  console.log('═'.repeat(120));
  console.log(
    'Rank'.padEnd(6) +
    'Pair'.padEnd(30) +
    'TVL'.padStart(18) +
    'Volume (24h)'.padStart(18) +
    'Fee'.padStart(8) +
    'APR Est.'.padStart(12) +
    'LP Tokens'.padStart(20)
  );
  console.log('─'.repeat(120));

  pools.forEach((pool, i) => {
    const pair = pool.coin_3_symbol 
      ? `${pool.coin_1_symbol}/${pool.coin_2_symbol}/${pool.coin_3_symbol}`
      : `${pool.coin_1_symbol}/${pool.coin_2_symbol}`;
    
    const tvl = parseFloat(pool.pool_tvl_usd || 0);
    const volume = parseFloat(pool.pool_volume_usd || 0);
    const fee = pool.swap_fee_bps / 100;
    const apr = estimateAPR(volume, tvl, pool.swap_fee_bps);
    
    console.log(
      `${(i + 1).toString().padEnd(6)}` +
      `${pair.padEnd(30)}` +
      `$${formatNumber(tvl).padStart(16)}` +
      `$${formatNumber(volume).padStart(16)}` +
      `${fee.toFixed(2)}%`.padStart(8) +
      `${formatNumber(apr, 1)}%`.padStart(12) +
      `${formatNumber(pool.minted_lp_token_amount, 0).padStart(20)}`
    );
  });
  
  console.log('═'.repeat(120));
  
  // Total TVL
  const totalTVL = pools.reduce((sum, p) => sum + parseFloat(p.pool_tvl_usd || 0), 0);
  const totalVolume = pools.reduce((sum, p) => sum + parseFloat(p.pool_volume_usd || 0), 0);
  console.log(`\nTotal TVL: $${formatNumber(totalTVL)} | Total Volume: $${formatNumber(totalVolume)}\n`);
}

// Display Pool Details
function displayPoolDetails(pool) {
  const pair = pool.coin_3_symbol 
    ? `${pool.coin_1_symbol}/${pool.coin_2_symbol}/${pool.coin_3_symbol}`
    : `${pool.coin_1_symbol}/${pool.coin_2_symbol}`;
  
  const tvl = parseFloat(pool.pool_tvl_usd || 0);
  const volume = parseFloat(pool.pool_volume_usd || 0);
  const fee = pool.swap_fee_bps / 100;
  const apr = estimateAPR(volume, tvl, pool.swap_fee_bps);

  console.log('\n💧 POOL DETAILS\n');
  console.log('═'.repeat(80));
  console.log(`Pair:         ${pair}`);
  console.log(`Address:      ${pool.pool_address}`);
  console.log(`Type:         ${pool.pool_type}`);
  console.log('─'.repeat(80));
  console.log(`TVL:          $${formatNumber(tvl)}`);
  console.log(`Volume (24h): $${formatNumber(volume)}`);
  console.log(`Fee:          ${fee}%`);
  console.log(`APR Est:      ${formatNumber(apr, 1)}%`);
  console.log(`LP Tokens:    ${formatNumber(pool.minted_lp_token_amount, 0)}`);
  console.log('─'.repeat(80));
  console.log(`Reserves:`);
  console.log(`  ${pool.coin_1_symbol}: ${formatNumber(pool.amount_1, 6)}`);
  console.log(`  ${pool.coin_2_symbol}: ${formatNumber(pool.amount_2, 6)}`);
  if (pool.coin_3_symbol) {
    console.log(`  ${pool.coin_3_symbol}: ${formatNumber(pool.amount_3, 6)}`);
  }
  console.log('═'.repeat(80) + '\n');
}

// Display Volume History
function displayVolumeHistory(history, poolAddress) {
  console.log('\n📊 VOLUME HISTORY (Last 7 Days)\n');
  console.log('═'.repeat(60));
  console.log('Date'.padEnd(25) + 'Volume'.padStart(20));
  console.log('─'.repeat(60));

  history.forEach(entry => {
    const date = new Date(entry.timestamp).toLocaleString();
    const volume = parseFloat(entry.volume_usd || 0);
    console.log(
      date.padEnd(25) +
      `$${formatNumber(volume)}`.padStart(20)
    );
  });

  console.log('═'.repeat(60) + '\n');
}

// Display Live Events
function displayLiveEvents(events) {
  console.log('\n⚡ LIVE EVENTS (Last 20)\n');
  console.log('═'.repeat(100));
  console.log(
    'Event'.padEnd(15) +
    'Amount 1'.padStart(18) +
    'Amount 2'.padStart(18) +
    'Time'.padEnd(25) +
    'TX Hash'.padEnd(20)
  );
  console.log('─'.repeat(100));

  events.forEach(event => {
    const time = new Date(event.created_at).toLocaleString();
    const txShort = event.tx_hash.slice(0, 18) + '...';
    
    console.log(
      event.event_type.padEnd(15) +
      formatNumber(event.amount_1, 4).padStart(18) +
      formatNumber(event.amount_2, 4).padStart(18) +
      time.padEnd(25) +
      txShort
    );
  });

  console.log('═'.repeat(100) + '\n');
}

// Display User LP Positions
function displayUserLP(positions, walletAddress) {
  console.log(`\n💧 LP POSITIONS FOR ${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}\n`);
  console.log('═'.repeat(80));
  
  if (positions.length === 0) {
    console.log('No active LP positions found.');
  } else {
    positions.forEach((pos, i) => {
      const pair = pos.pool.coin_3_symbol 
        ? `${pos.pool.coin_1_symbol}/${pos.pool.coin_2_symbol}/${pos.pool.coin_3_symbol}`
        : `${pos.pool.coin_1_symbol}/${pos.pool.coin_2_symbol}`;
      
      console.log(`\n${i + 1}. ${pair}`);
      console.log(`   LP Balance: ${formatNumber(pos.lpBalance, 2)}`);
      console.log(`   Total Added: ${formatNumber(pos.totalAdded, 2)}`);
      console.log(`   Total Removed: ${formatNumber(pos.totalRemoved, 2)}`);
      console.log(`   Last Activity: ${new Date(pos.lastActivity).toLocaleString()}`);
      console.log(`   Pool TVL: $${formatNumber(parseFloat(pos.pool.pool_tvl_usd || 0))}`);
    });
  }
  
  console.log('═'.repeat(80));
  
  // Check for locks
  const locks = checkLPUnlocks(walletAddress);
  if (locks.length > 0) {
    console.log('\n🔒 LOCKED LP POSITIONS:\n');
    locks.forEach(lock => {
      console.log(`   ${lock.pair}: ${lock.lockedAmount} LP`);
      console.log(`   Unlocks: ${lock.unlockDate.toLocaleString()}`);
      
      if (lock.daysRemaining >= 1) {
        console.log(`   ⏳ ${lock.daysRemaining.toFixed(1)} days remaining`);
      } else {
        console.log(`   ⏳ ${lock.hoursRemaining.toFixed(1)} hours remaining`);
      }
      
      if (lock.unlockSoon) {
        console.log(`   ⚠️  UNLOCKS SOON (<24h)!`);
      }
      console.log('');
    });
  }
  
  console.log('');
}

// CLI Handler
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (!command || command === 'top') {
      const limit = parseInt(args[1]) || 10;
      const pools = await getTopPools(limit);
      displayTopPools(pools);
    }
    else if (command === 'pair' || command === 'find') {
      if (args.length < 3) {
        console.error('❌ Usage: atmos-pools.js pair <TOKEN1> <TOKEN2>');
        process.exit(1);
      }
      const pools = await getPoolByTokens(args[1], args[2]);
      if (pools.length === 0) {
        console.log(`\n❌ No pool found for ${args[1]}/${args[2]}\n`);
      } else {
        pools.forEach(displayPoolDetails);
      }
    }
    else if (command === 'volume') {
      if (args.length < 2) {
        console.error('❌ Usage: atmos-pools.js volume <POOL_ADDRESS>');
        process.exit(1);
      }
      const history = await getPoolVolume(args[1]);
      displayVolumeHistory(history, args[1]);
    }
    else if (command === 'events') {
      if (args.length < 2) {
        console.error('❌ Usage: atmos-pools.js events <POOL_ADDRESS>');
        process.exit(1);
      }
      const events = await getLiveEvents(args[1]);
      displayLiveEvents(events);
    }
    else if (command === 'info') {
      if (args.length < 2) {
        console.error('❌ Usage: atmos-pools.js info <POOL_ADDRESS>');
        process.exit(1);
      }
      const query = `
        {
          atmos_pools(where: {pool_address: {_eq: "${args[1]}"}}) {
            id
            pool_address
            pool_type
            pool_tvl_usd
            pool_volume_usd
            swap_fee_bps
            coin_1_symbol
            coin_2_symbol
            coin_3_symbol
            amount_1
            amount_2
            amount_3
            minted_lp_token_amount
            created_at
          }
        }
      `;
      const data = await graphqlRequest(query);
      if (data.atmos_pools.length === 0) {
        console.log('\n❌ Pool not found\n');
      } else {
        displayPoolDetails(data.atmos_pools[0]);
      }
    }
    else if (command === 'mylp') {
      if (args.length < 2) {
        console.error('❌ Usage: atmos-pools.js mylp <WALLET_ADDRESS>');
        process.exit(1);
      }
      const positions = await getUserLP(args[1]);
      displayUserLP(positions, args[1]);
    }
    else {
      console.log('\n🌊 Atmos Pools CLI\n');
      console.log('Usage:');
      console.log('  atmos-pools.js top [limit]              - Top pools by TVL (default: 10)');
      console.log('  atmos-pools.js pair <TOKEN1> <TOKEN2>  - Find pool for token pair');
      console.log('  atmos-pools.js info <POOL_ADDRESS>     - Pool details');
      console.log('  atmos-pools.js volume <POOL_ADDRESS>   - 24h volume + history');
      console.log('  atmos-pools.js events <POOL_ADDRESS>   - Live swap/liquidity events');
      console.log('  atmos-pools.js mylp <WALLET_ADDRESS>   - User LP positions + lock status');
      console.log('\nExamples:');
      console.log('  atmos-pools.js top 20');
      console.log('  atmos-pools.js pair SUPRA CASH');
      console.log('  atmos-pools.js info 0x8eae6fc4c7dbb3f9717a0ba6771a0359ca095a8ab99815e899a2b97093963416');
      console.log('  atmos-pools.js mylp 0x4c286a0451ceC8270eA09468eA38ca60Cf113992');
      console.log('');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Export functions for use as module
if (require.main === module) {
  main();
} else {
  module.exports = {
    getTopPools,
    getPoolByTokens,
    getPoolVolume,
    getLiveEvents,
    getUserLP,
    checkLPUnlocks,
    graphqlRequest
  };
}
