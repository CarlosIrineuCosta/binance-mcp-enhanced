#!/usr/bin/env node

/**
 * Binance MCP Enhanced - With Technical Analysis
 * Based on original work by @snjyor
 * Enhanced with technical indicators and market analysis tools
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from "zod";
import axios from "axios";
import * as ta from "./technical-analysis.js";

const BASE_URL = process.env.BINANCE_TESTNET === 'true' 
    ? "https://testnet.binance.vision"
    : "https://api.binance.com";

// Input validation schemas
const symbolSchema = z.string().regex(/^[A-Z]{2,20}$/, "Invalid symbol format");
const limitSchema = z.number().int().positive().max(5000);
const timestampSchema = z.number().int().positive();
const periodSchema = z.number().int().positive().max(200);

// API Key validation
function validateApiKey(): string {
    const apiKey = process.env.BINANCE_API_KEY;
    if (!apiKey) {
        throw new Error("BINANCE_API_KEY environment variable not set");
    }
    if (apiKey.length < 32 || apiKey.length > 128) {
        throw new Error("Invalid BINANCE_API_KEY format");
    }
    return apiKey;
}

// Sanitize error messages to avoid leaking sensitive information
function sanitizeError(error: any): string {
    if (error?.response?.status === 401) {
        return "Authentication failed. Please check your API key.";
    }
    if (error?.response?.status === 429) {
        return "Rate limit exceeded. Please try again later.";
    }
    if (error?.response?.status >= 500) {
        return "Binance API server error. Please try again later.";
    }
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
        return "Unable to connect to Binance API. Please check your network connection.";
    }
    return "An error occurred while fetching data.";
}

// Create axios instance with security configurations
const axiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'User-Agent': 'Binance-MCP-Enhanced/1.1.0'
    },
    maxRedirects: 0,
    validateStatus: (status) => status >= 200 && status < 300
});

function registerOriginalTools(server: McpServer) {
    // Order Book
    server.tool(
        "get_order_book",
        {
            symbol: symbolSchema.describe("Trading pair symbol, e.g. BTCUSDT"),
            limit: limitSchema.optional().describe("Order book depth, default 100, max 5000")
        },
        async (args: { symbol: string; limit?: number }) => {
            try {
                const response = await axiosInstance.get(`/api/v3/depth`, {
                    params: {
                        symbol: args.symbol,
                        limit: args.limit || 100
                    }
                });
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Failed to get order book: ${sanitizeError(error)}` }],
                    isError: true
                };
            }
        }
    );

    // Recent Trades
    server.tool(
        "get_recent_trades",
        {
            symbol: symbolSchema.describe("Trading pair symbol, e.g. BTCUSDT"),
            limit: limitSchema.max(1000).optional().describe("Number of trades to return, default 500, max 1000")
        },
        async (args: { symbol: string; limit?: number }) => {
            try {
                const response = await axiosInstance.get(`/api/v3/trades`, {
                    params: {
                        symbol: args.symbol,
                        limit: args.limit || 500
                    }
                });
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Failed to get recent trades: ${sanitizeError(error)}` }],
                    isError: true
                };
            }
        }
    );

    // Historical Trades
    server.tool(
        "get_historical_trades",
        {
            symbol: symbolSchema.describe("Trading pair symbol, e.g. BTCUSDT"),
            limit: limitSchema.max(1000).optional().describe("Number of trades to return, default 500, max 1000"),
            fromId: z.number().optional().describe("Trade ID to start from")
        },
        async (args: { symbol: string; limit?: number; fromId?: number }) => {
            try {
                const apiKey = validateApiKey();
                const response = await axiosInstance.get(`/api/v3/historicalTrades`, {
                    params: {
                        symbol: args.symbol,
                        limit: args.limit || 500,
                        fromId: args.fromId
                    },
                    headers: {
                        "X-MBX-APIKEY": apiKey
                    }
                });
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Failed to get historical trades: ${sanitizeError(error)}` }],
                    isError: true
                };
            }
        }
    );

    // Aggregate Trades
    server.tool(
        "get_aggregate_trades",
        {
            symbol: symbolSchema.describe("Trading pair symbol, e.g. BTCUSDT"),
            fromId: z.number().optional().describe("Aggregate trade ID to start from"),
            startTime: timestampSchema.optional().describe("Start timestamp (milliseconds)"),
            endTime: timestampSchema.optional().describe("End timestamp (milliseconds)"),
            limit: limitSchema.max(1000).optional().describe("Number of aggregate trades to return, default 500, max 1000")
        },
        async (args: { symbol: string; fromId?: number; startTime?: number; endTime?: number; limit?: number }) => {
            try {
                const response = await axiosInstance.get(`/api/v3/aggTrades`, {
                    params: {
                        symbol: args.symbol,
                        fromId: args.fromId,
                        startTime: args.startTime,
                        endTime: args.endTime,
                        limit: args.limit || 500
                    }
                });
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Failed to get aggregate trades: ${sanitizeError(error)}` }],
                    isError: true
                };
            }
        }
    );

    // K-line/Candlestick Data
    server.tool(
        "get_klines",
        {
            symbol: symbolSchema.describe("Trading pair symbol, e.g. BTCUSDT"),
            interval: z.enum(["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w", "1M"])
                .describe("K-line interval"),
            startTime: timestampSchema.optional().describe("Start timestamp (milliseconds)"),
            endTime: timestampSchema.optional().describe("End timestamp (milliseconds)"),
            timeZone: z.string().optional().describe("Time zone, default UTC"),
            limit: limitSchema.max(1000).optional().describe("Number of K-lines to return, default 500, max 1000")
        },
        async (args: { symbol: string; interval: string; startTime?: number; endTime?: number; timeZone?: string; limit?: number }) => {
            try {
                const response = await axiosInstance.get(`/api/v3/klines`, {
                    params: {
                        symbol: args.symbol,
                        interval: args.interval,
                        startTime: args.startTime,
                        endTime: args.endTime,
                        timeZone: args.timeZone,
                        limit: Math.min(args.limit || 500, 1000)
                    }
                });
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Failed to get K-line data: ${sanitizeError(error)}` }],
                    isError: true
                };
            }
        }
    );

    // UI K-lines
    server.tool(
        "get_ui_klines",
        {
            symbol: symbolSchema.describe("Trading pair symbol, e.g. BTCUSDT"),
            interval: z.enum(["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w", "1M"])
                .describe("K-line interval"),
            startTime: timestampSchema.optional().describe("Start timestamp (milliseconds)"),
            endTime: timestampSchema.optional().describe("End timestamp (milliseconds)"),
            timeZone: z.string().optional().describe("Time zone, default UTC"),
            limit: limitSchema.max(1000).optional().describe("Number of K-lines to return, default 500, max 1000")
        },
        async (args: { symbol: string; interval: string; startTime?: number; endTime?: number; timeZone?: string; limit?: number }) => {
            try {
                const response = await axiosInstance.get(`/api/v3/uiKlines`, {
                    params: {
                        symbol: args.symbol,
                        interval: args.interval,
                        startTime: args.startTime,
                        endTime: args.endTime,
                        timeZone: args.timeZone,
                        limit: Math.min(args.limit || 500, 1000)
                    }
                });
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Failed to get UI K-line data: ${sanitizeError(error)}` }],
                    isError: true
                };
            }
        }
    );

    // Average Price
    server.tool(
        "get_avg_price",
        {
            symbol: symbolSchema.describe("Trading pair symbol, e.g. BTCUSDT")
        },
        async (args: { symbol: string }) => {
            try {
                const response = await axiosInstance.get(`/api/v3/avgPrice`, {
                    params: {
                        symbol: args.symbol
                    }
                });
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Failed to get average price: ${sanitizeError(error)}` }],
                    isError: true
                };
            }
        }
    );

    // 24hr Ticker
    server.tool(
        "get_24hr_ticker",
        {
            symbol: symbolSchema.optional().describe("Trading pair symbol, e.g. BTCUSDT"),
            symbols: z.array(symbolSchema).optional().describe("Array of multiple trading pair symbols"),
            type: z.enum(["FULL", "MINI"]).optional().describe("Ticker type, default FULL")
        },
        async (args: { symbol?: string; symbols?: string[]; type?: string }) => {
            try {
                if (args.symbol && args.symbols) {
                    throw new Error("Provide either symbol or symbols, not both");
                }
                
                let params: any = { type: args.type || "FULL" };
                if (args.symbol) {
                    params.symbol = args.symbol;
                } else if (args.symbols) {
                    params.symbols = JSON.stringify(args.symbols);
                }

                const response = await axiosInstance.get(`/api/v3/ticker/24hr`, {
                    params
                });
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Failed to get 24hr ticker: ${sanitizeError(error)}` }],
                    isError: true
                };
            }
        }
    );

    // Trading Day Ticker
    server.tool(
        "get_trading_day_ticker",
        {
            symbol: symbolSchema.optional().describe("Trading pair symbol, e.g. BTCUSDT"),
            symbols: z.array(symbolSchema).optional().describe("Array of multiple trading pair symbols"),
            timeZone: z.string().optional().describe("Time zone, default UTC"),
            type: z.enum(["FULL", "MINI"]).optional().describe("Ticker type, default FULL")
        },
        async (args: { symbol?: string; symbols?: string[]; timeZone?: string; type?: string }) => {
            try {
                if (args.symbol && args.symbols) {
                    throw new Error("Provide either symbol or symbols, not both");
                }
                
                let params: any = { 
                    timeZone: args.timeZone || "UTC",
                    type: args.type || "FULL"
                };
                if (args.symbol) {
                    params.symbol = args.symbol;
                } else if (args.symbols) {
                    params.symbols = JSON.stringify(args.symbols);
                }

                const response = await axiosInstance.get(`/api/v3/ticker/tradingDay`, {
                    params
                });
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Failed to get trading day ticker: ${sanitizeError(error)}` }],
                    isError: true
                };
            }
        }
    );

    // Price Ticker
    server.tool(
        "get_price",
        {
            symbol: symbolSchema.optional().describe("Trading pair symbol, e.g. BTCUSDT"),
            symbols: z.array(symbolSchema).optional().describe("Array of multiple trading pair symbols")
        },
        async (args: { symbol?: string; symbols?: string[] }) => {
            try {
                if (args.symbol && args.symbols) {
                    throw new Error("Provide either symbol or symbols, not both");
                }
                
                let params = {};
                if (args.symbol) {
                    params = { symbol: args.symbol };
                } else if (args.symbols) {
                    params = { symbols: JSON.stringify(args.symbols) };
                }

                const response = await axiosInstance.get(`/api/v3/ticker/price`, {
                    params
                });
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Failed to get price ticker: ${sanitizeError(error)}` }],
                    isError: true
                };
            }
        }
    );

    // Book Ticker
    server.tool(
        "get_book_ticker",
        {
            symbol: symbolSchema.optional().describe("Trading pair symbol, e.g. BTCUSDT"),
            symbols: z.array(symbolSchema).optional().describe("Array of multiple trading pair symbols")
        },
        async (args: { symbol?: string; symbols?: string[] }) => {
            try {
                if (args.symbol && args.symbols) {
                    throw new Error("Provide either symbol or symbols, not both");
                }
                
                let params = {};
                if (args.symbol) {
                    params = { symbol: args.symbol };
                } else if (args.symbols) {
                    params = { symbols: JSON.stringify(args.symbols) };
                }

                const response = await axiosInstance.get(`/api/v3/ticker/bookTicker`, {
                    params
                });
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Failed to get book ticker: ${sanitizeError(error)}` }],
                    isError: true
                };
            }
        }
    );

    // Rolling Window Ticker
    server.tool(
        "get_rolling_window_ticker",
        {
            symbol: symbolSchema.optional().describe("Trading pair symbol, e.g. BTCUSDT"),
            symbols: z.array(symbolSchema).optional().describe("Array of multiple trading pair symbols"),
            windowSize: z.enum(["1m", "2m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "2d", "3d", "7d", "30d"]).optional().describe("Window size, default 1d"),
            type: z.enum(["FULL", "MINI"]).optional().describe("Ticker type, default FULL")
        },
        async (args: { symbol?: string; symbols?: string[]; windowSize?: string; type?: string }) => {
            try {
                if (args.symbol && args.symbols) {
                    throw new Error("Provide either symbol or symbols, not both");
                }
                
                let params: any = { 
                    windowSize: args.windowSize || "1d",
                    type: args.type || "FULL"
                };
                if (args.symbol) {
                    params.symbol = args.symbol;
                } else if (args.symbols) {
                    params.symbols = JSON.stringify(args.symbols);
                }

                const response = await axiosInstance.get(`/api/v3/ticker`, {
                    params
                });
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Failed to get rolling window ticker: ${sanitizeError(error)}` }],
                    isError: true
                };
            }
        }
    );
}

function registerEnhancedTools(server: McpServer) {

    // Enhanced Technical Analysis Tools
    
    // Technical Indicators Tool
    server.tool(
        "calculate_indicators",
        {
            symbol: symbolSchema.describe("Trading pair symbol, e.g. BTCUSDT"),
            interval: z.enum(["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w", "1M"])
                .describe("K-line interval"),
            indicators: z.array(z.enum(["sma", "ema", "rsi", "macd", "bollinger", "atr", "vwap"]))
                .describe("Technical indicators to calculate"),
            period: periodSchema.optional().describe("Period for moving averages (default 20)"),
            limit: limitSchema.max(500).optional().describe("Number of candles to analyze (default 100)")
        },
        async (args: { 
            symbol: string; 
            interval: string; 
            indicators: string[]; 
            period?: number; 
            limit?: number 
        }) => {
            try {
                // Fetch kline data
                const response = await axiosInstance.get(`/api/v3/klines`, {
                    params: {
                        symbol: args.symbol,
                        interval: args.interval,
                        limit: args.limit || 100
                    }
                });

                const ohlcv = ta.klineToOHLCV(response.data);
                const closes = ohlcv.map(d => d.close);
                const period = args.period || 20;
                
                const results: any = {
                    symbol: args.symbol,
                    interval: args.interval,
                    dataPoints: ohlcv.length,
                    latest: {
                        timestamp: new Date(ohlcv[ohlcv.length - 1].timestamp).toISOString(),
                        close: ohlcv[ohlcv.length - 1].close
                    },
                    indicators: {}
                };

                // Calculate requested indicators
                for (const indicator of args.indicators) {
                    switch (indicator) {
                        case 'sma':
                            const sma = ta.calculateSMA(closes, period);
                            results.indicators.sma = {
                                period,
                                current: sma[sma.length - 1],
                                values: sma.slice(-10) // Last 10 values
                            };
                            break;
                            
                        case 'ema':
                            const ema = ta.calculateEMA(closes, period);
                            results.indicators.ema = {
                                period,
                                current: ema[ema.length - 1],
                                values: ema.slice(-10)
                            };
                            break;
                            
                        case 'rsi':
                            const rsi = ta.calculateRSI(closes, 14);
                            const currentRSI = rsi[rsi.length - 1];
                            results.indicators.rsi = {
                                period: 14,
                                current: currentRSI,
                                signal: currentRSI ? (
                                    currentRSI > 70 ? 'overbought' : 
                                    currentRSI < 30 ? 'oversold' : 'neutral'
                                ) : 'unknown',
                                values: rsi.slice(-10)
                            };
                            break;
                            
                        case 'macd':
                            const macd = ta.calculateMACD(closes);
                            const latestMACD = macd[macd.length - 1];
                            results.indicators.macd = {
                                current: latestMACD,
                                signal: latestMACD && latestMACD.MACD !== undefined && latestMACD.signal !== undefined ? (
                                    latestMACD.MACD > latestMACD.signal ? 'bullish' : 'bearish'
                                ) : 'unknown'
                            };
                            break;
                            
                        case 'bollinger':
                            const bb = ta.calculateBollingerBands(closes, period);
                            const latestBB = bb[bb.length - 1];
                            results.indicators.bollingerBands = {
                                period,
                                current: latestBB,
                                position: latestBB ? (
                                    closes[closes.length - 1] > latestBB.upper ? 'above upper' :
                                    closes[closes.length - 1] < latestBB.lower ? 'below lower' : 'within bands'
                                ) : 'unknown'
                            };
                            break;
                            
                        case 'atr':
                            const atr = ta.calculateATR(ohlcv, 14);
                            results.indicators.atr = {
                                period: 14,
                                current: atr[atr.length - 1],
                                volatility: atr[atr.length - 1] ? (
                                    atr[atr.length - 1] / closes[closes.length - 1] * 100
                                ).toFixed(2) + '%' : 'unknown'
                            };
                            break;
                            
                        case 'vwap':
                            const vwap = ta.calculateVWAP(ohlcv);
                            results.indicators.vwap = {
                                current: vwap[vwap.length - 1],
                                priceRelation: vwap[vwap.length - 1] ? (
                                    closes[closes.length - 1] > vwap[vwap.length - 1] ? 'above' : 'below'
                                ) : 'unknown'
                            };
                            break;
                    }
                }

                return {
                    content: [{ type: "text", text: JSON.stringify(results, null, 2) }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Failed to calculate indicators: ${sanitizeError(error)}` }],
                    isError: true
                };
            }
        }
    );

    // Market Analysis Tool
    server.tool(
        "analyze_market",
        {
            symbol: symbolSchema.describe("Trading pair symbol, e.g. BTCUSDT"),
            interval: z.enum(["1h", "4h", "1d"]).describe("Analysis timeframe"),
            includeSupport: z.boolean().optional().describe("Include support/resistance levels")
        },
        async (args: { symbol: string; interval: string; includeSupport?: boolean }) => {
            try {
                // Fetch more data for comprehensive analysis
                const response = await axiosInstance.get(`/api/v3/klines`, {
                    params: {
                        symbol: args.symbol,
                        interval: args.interval,
                        limit: 200
                    }
                });

                const ohlcv = ta.klineToOHLCV(response.data);
                const closes = ohlcv.map(d => d.close);
                
                // Perform comprehensive analysis
                const analysis: any = {
                    symbol: args.symbol,
                    interval: args.interval,
                    timestamp: new Date().toISOString(),
                    price: {
                        current: closes[closes.length - 1],
                        change24h: ((closes[closes.length - 1] - closes[closes.length - 25]) / closes[closes.length - 25] * 100).toFixed(2) + '%'
                    }
                };

                // Trend analysis
                analysis.trend = {
                    direction: ta.detectTrend(closes),
                    strength: 'moderate' // Could be enhanced with ADX
                };

                // Price statistics
                analysis.statistics = ta.calculatePriceStats(ohlcv);

                // Support and resistance
                if (args.includeSupport) {
                    const levels = ta.findSupportResistance(ohlcv);
                    analysis.levels = {
                        support: levels.filter(l => l.type === 'support').slice(0, 3),
                        resistance: levels.filter(l => l.type === 'resistance').slice(0, 3)
                    };
                }

                // Market conditions
                const rsi = ta.calculateRSI(closes);
                const currentRSI = rsi[rsi.length - 1];
                analysis.conditions = {
                    rsi: currentRSI,
                    momentum: currentRSI ? (
                        currentRSI > 70 ? 'overbought' :
                        currentRSI < 30 ? 'oversold' : 'neutral'
                    ) : 'unknown',
                    volatility: analysis.statistics.stdDev > 2 ? 'high' : 
                               analysis.statistics.stdDev > 1 ? 'moderate' : 'low'
                };

                return {
                    content: [{ type: "text", text: JSON.stringify(analysis, null, 2) }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Failed to analyze market: ${sanitizeError(error)}` }],
                    isError: true
                };
            }
        }
    );

    // Multi-Symbol Comparison Tool
    server.tool(
        "compare_symbols",
        {
            symbols: z.array(symbolSchema).min(2).max(5).describe("Symbols to compare (2-5)"),
            interval: z.enum(["1h", "4h", "1d"]).describe("Comparison timeframe"),
            metric: z.enum(["performance", "volatility", "correlation"]).describe("Comparison metric")
        },
        async (args: { symbols: string[]; interval: string; metric: string }) => {
            try {
                const comparisons: any[] = [];
                
                // Fetch data for all symbols
                const symbolData = await Promise.all(
                    args.symbols.map(async (symbol) => {
                        const response = await axiosInstance.get(`/api/v3/klines`, {
                            params: {
                                symbol,
                                interval: args.interval,
                                limit: 100
                            }
                        });
                        return {
                            symbol,
                            ohlcv: ta.klineToOHLCV(response.data)
                        };
                    })
                );

                // Perform comparisons based on metric
                const result: any = {
                    metric: args.metric,
                    interval: args.interval,
                    timestamp: new Date().toISOString(),
                    symbols: {}
                };

                for (const data of symbolData) {
                    const closes = data.ohlcv.map(d => d.close);
                    const stats = ta.calculatePriceStats(data.ohlcv);
                    
                    switch (args.metric) {
                        case 'performance':
                            result.symbols[data.symbol] = {
                                currentPrice: closes[closes.length - 1],
                                return24h: stats.avgReturn * 24,
                                winRate: stats.winRate,
                                sharpeRatio: stats.sharpeRatio
                            };
                            break;
                            
                        case 'volatility':
                            const atr = ta.calculateATR(data.ohlcv);
                            result.symbols[data.symbol] = {
                                stdDev: stats.stdDev,
                                atr: atr[atr.length - 1],
                                atrPercent: (atr[atr.length - 1] / closes[closes.length - 1] * 100).toFixed(2) + '%',
                                maxDrawdown: stats.minReturn
                            };
                            break;
                            
                        case 'correlation':
                            // Simple correlation calculation (could be enhanced)
                            result.symbols[data.symbol] = {
                                trend: ta.detectTrend(closes),
                                rsi: ta.calculateRSI(closes)[ta.calculateRSI(closes).length - 1]
                            };
                            break;
                    }
                }

                // Rank symbols by metric
                if (args.metric === 'performance') {
                    result.ranking = Object.entries(result.symbols)
                        .sort((a: any, b: any) => b[1].sharpeRatio - a[1].sharpeRatio)
                        .map(([symbol]) => symbol);
                }

                return {
                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Failed to compare symbols: ${sanitizeError(error)}` }],
                    isError: true
                };
            }
        }
    );
}

async function main() {
    const server = new McpServer({
        name: "binance-mcp-enhanced",
        version: "1.1.0",
        description: "Binance Cryptocurrency Market Data MCP Service with Technical Analysis"
    });

    // Register all tools
    registerOriginalTools(server);
    registerEnhancedTools(server);
    
    let transport = new StdioServerTransport();
    await server.connect(transport);
    
    const cleanup = async () => {
        await transport.close();
        process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

    if (process.env.NODE_ENV !== 'production') {
        console.log("Binance MCP Enhanced service has started");
        console.log("Testnet mode:", process.env.BINANCE_TESTNET === 'true' ? 'ENABLED' : 'DISABLED');
    }
}

function handleError(error: Error) {
    if (process.env.NODE_ENV !== 'production') {
        console.error("An error occurred:", error);
    }
    process.exit(1);
}

main().catch(handleError);