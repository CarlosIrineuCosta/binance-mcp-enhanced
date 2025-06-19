# Binance MCP Enhanced - Project Tracking

## Project Overview
Enhanced fork of [binance-mcp](https://github.com/snjyor/binance-mcp) by @snjyor (Apache 2.0 License)  
Repository: https://github.com/CarlosIrineuCosta/binance-mcp-enhanced

## Completed Features

### Phase 1: Technical Indicators ✅ COMPLETED
- [x] Simple Moving Average (SMA) with customizable periods
- [x] Exponential Moving Average (EMA) with customizable periods  
- [x] Relative Strength Index (RSI) with overbought/oversold signals
- [x] MACD (Moving Average Convergence Divergence) with signal detection
- [x] Bollinger Bands with squeeze/expansion detection
- [x] Volume Weighted Average Price (VWAP) for institutional levels
- [x] Average True Range (ATR) for volatility measurement

### Phase 2: Market Analysis Tools ✅ COMPLETED
- [x] Support and Resistance Level detection (dynamic)
- [x] Trend Detection (bullish/bearish/neutral classification)
- [x] Price Statistics (returns, volatility, Sharpe ratio)
- [x] Market Conditions (overbought/oversold detection)
- [x] Multi-symbol comparison (up to 5 symbols)
- [x] Performance ranking and correlation analysis

### Security Enhancements ✅ COMPLETED
- [x] Updated dependencies (axios 1.7.7, zod 3.23.8, Node 20 LTS)
- [x] Input validation with Zod schemas
- [x] Docker security (non-root user uid=1001, hardened permissions)
- [x] API key validation and sanitized error handling
- [x] 0 npm audit vulnerabilities

### Infrastructure ✅ COMPLETED
- [x] GitHub repository setup with main/secure branches
- [x] Docker image rebuild and deployment
- [x] Claude Desktop integration (Windows)
- [x] Testnet mode support
- [x] Apache 2.0 compliance with proper attribution

## Enhanced MCP Tools

### calculate_indicators
Calculate multiple technical indicators on price data
- Parameters: symbol, interval, indicators[], period, limit
- Returns: Current values + signals (overbought/oversold, bullish/bearish)

### analyze_market  
Comprehensive market analysis with trend detection
- Parameters: symbol, interval, includeSupport
- Returns: Trend direction, statistics, market conditions

### compare_symbols
Multi-symbol comparison and ranking
- Parameters: symbols[], interval, metric
- Returns: Comparative analysis with rankings

## Next Phase Planning

### Phase 3: Data Export & Storage (Future)
- [ ] CSV Export functionality
- [ ] Local SQLite storage option
- [ ] Historical data caching
- [ ] Custom timeframe aggregation

### Phase 4: Advanced Features (Future)
- [ ] Custom alerts framework
- [ ] Strategy backtesting helpers
- [ ] Advanced correlation matrices
- [ ] Portfolio analysis tools

## File Naming Convention

**Project tracking files:**
- `Project-tracking.md` - Main project status and feature tracking
- `PROJECT-[Name].md` - High-level project overview (if needed)
- `.claude/CLAUDE.md` - Global user preferences (not project-specific)

## Technical Notes

**Current Architecture:**
- Main branch: Enhanced version with all features
- Secure branch: Minimal security-focused version
- Docker: Multi-stage build with non-root execution
- API: Maintains full backward compatibility

**Dependencies:**
- technicalindicators: ^3.1.0 (for calculations)
- axios: ^1.7.7 (security update)
- zod: ^3.23.8 (input validation)

**Testing:**
- Security: 0 npm audit vulnerabilities
- Docker: uid=1001(appuser) gid=1001(appgroup)
- Integration: Claude Desktop Windows + Docker Desktop

## Attribution
Original work: https://github.com/snjyor/binance-mcp by @snjyor  
License: Apache 2.0 (maintained)  
All modifications documented for transparency