# Binance MCP Secure

> **Security-hardened version** of [binance-mcp](https://github.com/snjyor/binance-mcp) by [@snjyor](https://github.com/snjyor)  
> Original work licensed under Apache 2.0 License

A secure implementation of the Binance MCP server with critical security vulnerabilities fixed while maintaining all original functionality.

## Security Enhancements

### Critical Fixes Applied
- **Updated Dependencies**: Fixed CVE-2024-39338 (axios 1.7.7), updated zod to 3.23.8
- **Docker Security**: Non-root user execution (uid=1001), hardened permissions
- **Input Validation**: Comprehensive Zod schemas for all API inputs
- **API Key Handling**: Proper validation and sanitized error messages
- **Zero Vulnerabilities**: 0 npm audit issues

### Security Report
See [SECURITY_REPORT.md](SECURITY_REPORT.md) for complete vulnerability analysis and fixes applied.

## Installation

### Docker (Recommended)

```bash
# Build secure image
docker build -t binance-mcp-secure .

# Run container
docker run -i --rm binance-mcp-secure
```

### Local Installation

```bash
# Install dependencies
npm install

# Build
npm run build

# Run
npm start
```

## Available Tools

All 12 original Binance MCP tools with security enhancements:

| Tool | Description |
|------|-------------|
| `get_order_book` | Get order book data with input validation |
| `get_recent_trades` | Get recent trades with rate limiting protection |
| `get_historical_trades` | Get historical trades (requires secure API key) |
| `get_aggregate_trades` | Get aggregate trades with timestamp validation |
| `get_klines` | Get candlestick data with interval validation |
| `get_ui_klines` | Get UI-optimized candlestick data |
| `get_avg_price` | Get current average price |
| `get_24hr_ticker` | Get 24hr price statistics |
| `get_trading_day_ticker` | Get trading day information |
| `get_price` | Get current price with symbol validation |
| `get_book_ticker` | Get best bid/ask prices |
| `get_rolling_window_ticker` | Get rolling window statistics |

## Configuration

### Claude Desktop

```json
{
  "binance-secure": {
    "command": "docker",
    "args": ["run", "-i", "--rm", "binance-mcp-secure"]
  }
}
```

### Environment Variables

```bash
# Optional: For historical trades endpoint
export BINANCE_API_KEY="your_api_key_here"
```

## Security Testing

```bash
# Verify no vulnerabilities
npm audit

# Check Docker user
docker run --rm binance-mcp-secure id
# Should output: uid=1001(appuser) gid=1001(appgroup)
```

## Attribution & License

**Original Work**: [binance-mcp](https://github.com/snjyor/binance-mcp) by [@snjyor](https://github.com/snjyor)  
**License**: Apache 2.0 License (maintained)  
**Security Enhancements**: Critical vulnerability fixes and hardening

This secure version maintains full API compatibility while addressing all identified security issues. Contains all 12 original Binance MCP tools with comprehensive security hardening.

See [LICENSE](LICENSE) and [NOTICE](NOTICE) files for complete attribution details.

## Contributing

This is a security-focused fork. For the original project, contribute to [@snjyor's repository](https://github.com/snjyor/binance-mcp).