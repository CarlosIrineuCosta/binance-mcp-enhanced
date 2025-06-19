# Binance MCP Enhanced - Technical Analysis Edition

> **Enhanced fork** of [binance-mcp](https://github.com/snjyor/binance-mcp) by [@snjyor](https://github.com/snjyor)  
> Original work licensed under Apache 2.0 License

A powerful cryptocurrency analysis MCP server that adds advanced technical analysis capabilities to the original Binance MCP implementation.

## What's New

### Technical Indicators
- **Moving Averages**: SMA, EMA with customizable periods
- **Momentum**: RSI, MACD for trend strength analysis
- **Volatility**: Bollinger Bands, ATR for risk assessment
- **Volume**: VWAP for institutional trading levels

### Market Analysis
- **Trend Detection**: Automatic bullish/bearish/neutral classification
- **Support & Resistance**: Dynamic level identification
- **Price Statistics**: Returns, volatility, Sharpe ratio calculations
- **Market Conditions**: Overbought/oversold detection

### Multi-Symbol Tools
- **Performance Comparison**: Compare up to 5 symbols
- **Correlation Analysis**: Find related trading pairs
- **Volatility Ranking**: Identify high/low volatility assets

### Security Enhancements
- Updated all dependencies to latest secure versions
- Non-root Docker container execution
- Comprehensive input validation
- Sanitized error messages

## Installation

### Docker (Recommended)

```bash
# Build the enhanced image
docker build -t binance-mcp-enhanced .

# Run the container
docker run -i --rm binance-mcp-enhanced
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

## Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "binance-enhanced": {
    "command": "docker",
    "args": ["run", "-i", "--rm", "binance-mcp-enhanced"]
  }
}
```

### Testnet Mode

For paper trading and testing:

```json
{
  "binance-testnet": {
    "command": "docker",
    "args": [
      "run", "-i", "--rm",
      "-e", "BINANCE_TESTNET=true",
      "binance-mcp-enhanced"
    ]
  }
}
```

## Enhanced Tools Usage

### Calculate Technical Indicators

```
Calculate indicators for BTCUSDT on 1h timeframe:
- Indicators: ["sma", "ema", "rsi", "macd"]
- Period: 20
```

Response includes current values and signals (overbought/oversold, bullish/bearish).

### Analyze Market

```
Analyze BTCUSDT market on 4h timeframe with support/resistance levels
```

Provides comprehensive market analysis including trend, statistics, and key levels.

### Compare Symbols

```
Compare performance of ["BTCUSDT", "ETHUSDT", "BNBUSDT"] on daily timeframe
```

Returns comparative metrics and rankings.

## Original Features

All original features from [@snjyor's binance-mcp](https://github.com/snjyor/binance-mcp) remain available:

- Real-time price data
- Order book information
- Historical trades
- K-line/candlestick data
- 24hr statistics
- Exchange information
- Symbol price ticker
- And more...

## Attribution & License

**Original Work**: [binance-mcp](https://github.com/snjyor/binance-mcp) by [@snjyor](https://github.com/snjyor)  
**License**: Apache 2.0 License (maintained)  
**Enhancements**: Technical analysis capabilities and security improvements  

This enhanced version maintains full compatibility with the original API while adding powerful analysis tools for cryptocurrency trading.

See [LICENSE](LICENSE) and [NOTICE](NOTICE) files for complete attribution details.

## Contributing

This is a personal enhancement fork. For the original project, please contribute to [@snjyor's repository](https://github.com/snjyor/binance-mcp).