#!/usr/bin/env node
/**
 * Check $COSMO LP Position on Atmos Protocol
 * Usage: node check-cosmo-pool.js [wallet_address]
 */

const https = require('https');

const COSMO_POOL_ID = '0xaeec90cb7cbf2662cf3ac538c9ebf5237f3e87b7a8bf8b5cfb368af565257914';
const DEFAULT_WALLET = '0xf2fce3ef12fa1459219076f806f32ab8188a19d4d5d5dd72f0cd804859be12dc';

// Fetch JSON from URL
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error('Invalid JSON response'));
        }
      });
    }).on('error', reject);
  });
}

async function checkCosmoPool(walletAddress = DEFAULT_WALLET) {
  console.log('🌌 Checking $COSMO LP Position...\n');
  
  try {
    // Get token prices
    console.log('📊 Fetching token prices...');
    const pricesData = await fetchJSON('https://prod-gw.atmosprotocol.com/swapRouter/prices');
    
    if (!pricesData.success) {
      throw new Error('Failed to fetch prices');
    }
    
    const prices = pricesData.data;
    
    // Find COSMO price (address might vary, need to check)
    const cosmoAddress = '0x11188bb79cd956ab6b8ddff06d64f479358b59ddbd2058a41b447cdf21c17ab0';
    const cosmoPrice = prices[cosmoAddress] ? parseFloat(prices[cosmoAddress]) : null;
    
    // SUPRA price (approximately)
    const supraPrice = 0.0007; // USD per SUPRA (update this!)
    
    console.log('\n💰 Token Prices:');
    console.log(`   SUPRA: $${supraPrice.toFixed(6)}`);
    if (cosmoPrice) {
      console.log(`   COSMO: $${cosmoPrice.toFixed(8)}`);
    } else {
      console.log(`   COSMO: Price not found in API`);
    }
    
    console.log('\n🏊 Pool Information:');
    console.log(`   Pool ID: ${COSMO_POOL_ID.slice(0, 10)}...${COSMO_POOL_ID.slice(-8)}`);
    console.log(`   Pair: SUPRA/COSMO`);
    console.log(`   Weight: 50/50`);
    console.log(`   Link: https://app.atmos.ag/en/earn/pools/${COSMO_POOL_ID}`);
    
    console.log('\n📍 Your Wallet:');
    console.log(`   Address: ${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}`);
    console.log(`   Explorer: https://suprascan.io/address/${walletAddress}`);
    
    console.log('\n⚠️  Note: To see your LP position, you need to:');
    console.log('   1. Connect wallet on Atmos app');
    console.log('   2. Navigate to "Earn" → "Pools"');
    console.log('   3. Find SUPRA/COSMO pool');
    console.log('   4. View "My Position" section');
    
    console.log('\n💡 API Limitation:');
    console.log('   Atmos does not expose individual LP positions via public API.');
    console.log('   You need to query on-chain directly or use their UI.');
    
    console.log('\n🔍 Next Steps:');
    console.log('   1. Use Supra SDK to query LP token balance');
    console.log('   2. Calculate your share of the pool');
    console.log('   3. Track rewards accumulation');
    
    console.log('\n✅ Basic check complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run
const walletAddress = process.argv[2] || DEFAULT_WALLET;
checkCosmoPool(walletAddress);
