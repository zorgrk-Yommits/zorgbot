# Mistral API Manager 🦝

**Cost-optimized Mistral API client with caching & intelligent routing**

## Features

✅ **Smart Caching** - Redis-based response caching (saves 100% cost on repeated queries)  
✅ **Intelligent Routing** - Auto-route to cheaper models for simple queries  
✅ **Cost Tracking** - Real-time token & cost monitoring  
✅ **Error Handling** - Robust retry logic & graceful degradation  
✅ **Easy Integration** - Drop-in replacement for direct API calls

## Installation

```bash
pip install -r requirements.txt
```

## Quick Start

```python
from mistral_client import MistralClient
import asyncio

async def main():
    client = MistralClient(
        api_key="your_mistral_key",
        enable_cache=True
    )
    
    messages = [{"role": "user", "content": "Hello!"}]
    response = await client.chat(messages, auto_route=True)
    
    print(response["content"])
    print(f"Cost: ${response['cost']:.6f}")
    print(f"Model: {response['model']}")

asyncio.run(main())
```

## Configuration

### Environment Variables

```bash
# Required
MISTRAL_API_KEY=your_key_here

# Optional (for caching)
REDIS_URL=redis://localhost:6379
```

### Client Options

```python
client = MistralClient(
    api_key="...",           # Mistral API key
    enable_cache=True,       # Enable Redis caching
    cache_ttl=3600,          # Cache TTL in seconds (1 hour default)
    redis_url="redis://..."  # Redis connection URL
)
```

## Intelligent Routing

The client automatically routes requests to cost-efficient models:

| Query Type | Model | Cost per 1K tokens (in/out) |
|-----------|-------|------------------------------|
| Simple (<100 chars, no complexity) | mistral-small-latest | $0.0002 / $0.0006 |
| Complex (long or technical) | mistral-large-latest | $0.002 / $0.006 |

**Manual override:**
```python
# Force specific model
response = await client.chat(messages, model="mistral-large-latest", auto_route=False)
```

## Caching

Identical requests are cached in Redis to avoid redundant API calls.

**Benefits:**
- 💰 100% cost savings on cache hits
- ⚡ Near-instant responses
- 🌍 Reduced API load

**Cache key includes:**
- Messages content
- Model name
- Temperature
- Max tokens

**Clear cache:**
```python
client.clear_cache()
```

## Cost Tracking

```python
stats = client.get_stats()
print(stats)
# {
#   "requests": 10,
#   "cache_hits": 5,
#   "total_cost": 0.042,
#   "tokens_input": 1500,
#   "tokens_output": 3000,
#   "cache_hit_rate": "50.0%",
#   "avg_cost_per_request": 0.0042
# }
```

## Advanced Usage

### Conversation Context

```python
messages = [
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "Hi! How can I help?"},
    {"role": "user", "content": "What's the weather?"}
]

response = await client.chat(messages)
```

### Disable Caching for Specific Request

```python
response = await client.chat(messages, use_cache=False)
```

### Custom Temperature & Max Tokens

```python
response = await client.chat(
    messages,
    temperature=0.9,
    max_tokens=2000
)
```

## Running Redis Locally

```bash
# Docker
docker run -d -p 6379:6379 redis:alpine

# Or without Redis (caching disabled)
client = MistralClient(enable_cache=False)
```

## Cost Optimization Tips

1. **Enable caching** - Saves 100% on repeated queries
2. **Use auto-routing** - Saves ~90% on simple queries
3. **Trim context** - Only include relevant conversation history
4. **Set appropriate max_tokens** - Don't over-allocate
5. **Monitor stats** - Track `cache_hit_rate` and optimize

## Example: Cost Comparison

**Without optimization:**
- 100 requests × mistral-large-latest
- Average: 500 input + 1000 output tokens
- Cost: $0.007 per request
- **Total: $0.70**

**With optimization:**
- 50% cache hits (free)
- 30% routed to mistral-small (10x cheaper)
- 20% use mistral-large
- **Total: ~$0.15** (78% savings!)

## License

MIT
