#!/usr/bin/env node
/**
 * 🦝 Mistral Social Media Bot
 * Cost-optimized AI responses with caching & intelligent routing
 * For Discord, X/Twitter, and other platforms
 */

const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const redis = require('redis');

class MistralBot {
  constructor(options = {}) {
    // Load API key
    const envPath = options.envPath || '.env';
    const envFile = fs.readFileSync(envPath, 'utf8');
    this.apiKey = envFile
      .split('\n')
      .find(line => line.startsWith('MISTRAL_API_KEY='))
      ?.split('=')[1]
      ?.trim();

    if (!this.apiKey) {
      throw new Error(`MISTRAL_API_KEY not found in ${envPath}`);
    }

    // Config
    this.enableCache = options.enableCache !== false;
    this.cacheTTL = options.cacheTTL || 3600; // 1 hour
    this.autoRoute = options.autoRoute !== false;
    
    // Models & Pricing (per 1K tokens)
    this.models = {
      'mistral-small-latest': {
        name: 'mistral-small-latest',
        inputCost: 0.0002,
        outputCost: 0.0006,
        maxTokens: 32000
      },
      'mistral-large-latest': {
        name: 'mistral-large-latest',
        inputCost: 0.002,
        outputCost: 0.006,
        maxTokens: 128000
      }
    };

    // Stats
    this.stats = {
      requests: 0,
      cacheHits: 0,
      totalCost: 0,
      tokensInput: 0,
      tokensOutput: 0,
      routedSmall: 0,
      routedLarge: 0
    };

    // Initialize Redis
    if (this.enableCache) {
      this.redis = redis.createClient({ 
        url: 'redis://172.17.0.4:6379',
        socket: {
          connectTimeout: 2000  // 2 second timeout
        }
      });
      this.redis.on('error', (err) => {
        console.error('Redis error:', err.message);
        this.enableCache = false;
      });
      this.redis.connect().then(() => {
        console.log('✅ Redis cache connected');
      }).catch((err) => {
        console.error('⚠️  Redis unavailable, caching disabled');
        this.enableCache = false;
      });
    }
  }

  // Generate cache key
  _cacheKey(messages, model, temperature, maxTokens) {
    const key = JSON.stringify({ messages, model, temperature, maxTokens });
    return `mistral:${crypto.createHash('sha256').update(key).digest('hex')}`;
  }

  // Intelligent routing based on query complexity
  _routeModel(messages) {
    const lastMsg = messages[messages.length - 1]?.content || '';
    
    // Complexity indicators
    const complexKeywords = [
      'analyze', 'explain in detail', 'complex', 'architecture',
      'debug', 'code', 'algorithm', 'technical', 'deep dive',
      'compare', 'evaluate', 'comprehensive'
    ];

    const length = lastMsg.length;
    const hasComplexity = complexKeywords.some(kw => lastMsg.toLowerCase().includes(kw));
    const hasCode = /```|function |class |import |def /.test(lastMsg);

    // Route to large model if:
    // - Message is long (>300 chars)
    // - Contains complexity keywords
    // - Contains code
    if (length > 300 || hasComplexity || hasCode) {
      this.stats.routedLarge++;
      return 'mistral-large-latest';
    }

    // Otherwise use small (90% cheaper!)
    this.stats.routedSmall++;
    return 'mistral-small-latest';
  }

  // Make API request
  async _apiRequest(messages, model, temperature, maxTokens) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens
      });

      const options = {
        hostname: 'api.mistral.ai',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`API error: ${res.statusCode} - ${body}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
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

  // Calculate cost
  _calculateCost(model, inputTokens, outputTokens) {
    const config = this.models[model];
    return (
      (inputTokens / 1000) * config.inputCost +
      (outputTokens / 1000) * config.outputCost
    );
  }

  // Main chat method
  async chat(messages, options = {}) {
    const {
      model = this.autoRoute ? this._routeModel(messages) : 'mistral-large-latest',
      temperature = 0.7,
      maxTokens = 1000,
      useCache = true
    } = options;

    // Check cache
    const cacheKey = this._cacheKey(messages, model, temperature, maxTokens);
    
    if (useCache && this.enableCache) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          this.stats.cacheHits++;
          const response = JSON.parse(cached);
          response.cached = true;
          return response;
        }
      } catch (e) {
        // Cache miss or error, continue
      }
    }

    // Make API request
    this.stats.requests++;
    const apiResponse = await this._apiRequest(messages, model, temperature, maxTokens);

    // Extract data
    const content = apiResponse.choices[0].message.content;
    const usage = apiResponse.usage;
    const cost = this._calculateCost(model, usage.prompt_tokens, usage.completion_tokens);

    // Update stats
    this.stats.tokensInput += usage.prompt_tokens;
    this.stats.tokensOutput += usage.completion_tokens;
    this.stats.totalCost += cost;

    // Build response
    const response = {
      content,
      model,
      usage: {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens
      },
      cost,
      cached: false
    };

    // Cache response
    if (useCache && this.enableCache) {
      try {
        await this.redis.setEx(cacheKey, this.cacheTTL, JSON.stringify(response));
      } catch (e) {
        // Ignore cache errors
      }
    }

    return response;
  }

  // Helper: Quick single message
  async ask(question, options = {}) {
    const messages = [{ role: 'user', content: question }];
    const response = await this.chat(messages, options);
    return response.content;
  }

  // Get statistics
  getStats() {
    const totalRequests = this.stats.requests + this.stats.cacheHits;
    const cacheHitRate = totalRequests > 0 
      ? ((this.stats.cacheHits / totalRequests) * 100).toFixed(1)
      : '0.0';

    const avgCost = this.stats.requests > 0
      ? (this.stats.totalCost / this.stats.requests).toFixed(6)
      : '0.000000';

    return {
      ...this.stats,
      cacheHitRate: `${cacheHitRate}%`,
      avgCostPerRequest: `$${avgCost}`,
      estimatedSavings: `$${(this.stats.cacheHits * 0.001).toFixed(6)}`
    };
  }

  // Clear cache
  async clearCache() {
    if (this.enableCache) {
      const keys = await this.redis.keys('mistral:*');
      if (keys.length > 0) {
        await this.redis.del(keys);
        console.log(`🗑️  Cleared ${keys.length} cached responses`);
      }
    }
  }

  // Cleanup
  async close() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

module.exports = MistralBot;

// CLI Test
if (require.main === module) {
  (async () => {
    const bot = new MistralBot();

    console.log('🦝 Mistral Social Media Bot - Demo\n');

    // Test 1: Simple question (auto-routed to small)
    console.log('📝 Test 1: Simple Social Media Reply');
    const response1 = await bot.chat([
      { role: 'user', content: 'Hey, what\'s up?' }
    ]);
    console.log(`Response: ${response1.content}`);
    console.log(`Model: ${response1.model} | Cost: $${response1.cost.toFixed(6)} | Cached: ${response1.cached}\n`);

    // Test 2: Repeat (should be cached)
    console.log('📝 Test 2: Repeat Question (should hit cache)');
    const response2 = await bot.chat([
      { role: 'user', content: 'Hey, what\'s up?' }
    ]);
    console.log(`Response: ${response2.content}`);
    console.log(`Model: ${response2.model} | Cost: $${response2.cost.toFixed(6)} | Cached: ${response2.cached}\n`);

    // Test 3: Complex query (auto-routed to large)
    console.log('📝 Test 3: Complex Technical Question');
    const response3 = await bot.chat([
      { role: 'user', content: 'Can you analyze and explain the architecture of a distributed caching system?' }
    ]);
    console.log(`Response: ${response3.content.slice(0, 150)}...`);
    console.log(`Model: ${response3.model} | Cost: $${response3.cost.toFixed(6)} | Cached: ${response3.cached}\n`);

    // Show stats
    console.log('📊 Statistics:');
    const stats = bot.getStats();
    Object.entries(stats).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    await bot.close();
  })();
}
