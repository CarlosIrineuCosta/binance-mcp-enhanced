# Binance MCP Enhanced - Technical Analysis Edition

An enhanced version of the [original binance-mcp](https://github.com/snjyor/binance-mcp) by @snjyor, adding powerful technical analysis capabilities for cryptocurrency trading analysis.

## New Features

### 🎯 Technical Indicators
- **Moving Averages**: SMA, EMA with customizable periods
- **Momentum**: RSI, MACD for trend strength analysis
- **Volatility**: Bollinger Bands, ATR for risk assessment
- **Volume**: VWAP for institutional trading levels

### 📊 Market Analysis
- **Trend Detection**: Automatic bullish/bearish/neutral classification
- **Support & Resistance**: Dynamic level identification
- **Price Statistics**: Returns, volatility, Sharpe ratio calculations
- **Market Conditions**: Overbought/oversold detection

### 🔄 Multi-Symbol Tools
- **Performance Comparison**: Compare up to 5 symbols
- **Correlation Analysis**: Find related trading pairs
- **Volatility Ranking**: Identify high/low volatility assets

### 🔒 Security Enhancements
- Updated all dependencies to latest secure versions
- Non-root Docker container execution
- Comprehensive input validation
- Sanitized error messages

## Installation

### Docker (Recommended)

```bash
# Build the secure enhanced image
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

## New Tools Usage

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

All original features remain available:
- Real-time price data
- Order book information
- Historical trades
- K-line/candlestick data
- 24hr statistics
- And more...

## Attribution

This is an enhanced fork of [binance-mcp](https://github.com/snjyor/binance-mcp) by @snjyor.
Original work is licensed under Apache 2.0 License.

## License

This enhanced version maintains the Apache 2.0 License from the original project.
See LICENSE and NOTICE files for details.