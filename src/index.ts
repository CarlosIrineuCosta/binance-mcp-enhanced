#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from "zod";
import axios from "axios";

const BASE_URL = "https://api.binance.com";

// Input validation schemas
const symbolSchema = z.string().regex(/^[A-Z]{2,20}$/, "Invalid symbol format");
const limitSchema = z.number().int().positive().max(5000);
const timestampSchema = z.number().int().positive();

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
    timeout: 10000, // 10 second timeout
    headers: {
        'User-Agent': 'Binance-MCP/1.0.2'
    },
    maxRedirects: 0, // Prevent SSRF via redirects
    validateStatus: (status) => status >= 200 && status < 300
});

function registerTools(server: McpServer) {
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

    // Recent Trades List
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
                        limit: Math.min(args.limit || 500, 1000)
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

    // Historical Trades Lookup (Requires API Key)
    server.tool(
        "get_historical_trades",
        {
            symbol: symbolSchema.describe("Trading pair symbol, e.g. BTCUSDT"),
            limit: limitSchema.max(1000).optional().describe("Number of trades to return, default 500, max 1000"),
            fromId: z.number().int().positive().optional().describe("Trade ID to start from")
        },
        async (args: { symbol: string; limit?: number; fromId?: number }) => {
            try {
                // Validate API key before making request
                const apiKey = validateApiKey();
                
                const response = await axiosInstance.get(`/api/v3/historicalTrades`, {
                    params: {
                        symbol: args.symbol,
                        limit: Math.min(args.limit || 500, 1000),
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

    // Aggregate Trades List
    server.tool(
        "get_aggregate_trades",
        {
            symbol: symbolSchema.describe("Trading pair symbol, e.g. BTCUSDT"),
            fromId: z.number().int().positive().optional().describe("Aggregate trade ID to start from"),
            startTime: timestampSchema.optional().describe("Start timestamp (milliseconds)"),
            endTime: timestampSchema.optional().describe("End timestamp (milliseconds)"),
            limit: limitSchema.max(1000).optional().describe("Number of trades to return, default 500, max 1000")
        },
        async (args: { symbol: string; fromId?: number; startTime?: number; endTime?: number; limit?: number }) => {
            try {
                // Validate time range if provided
                if (args.startTime && args.endTime && args.endTime <= args.startTime) {
                    throw new Error("End time must be after start time");
                }
                
                const response = await axiosInstance.get(`/api/v3/aggTrades`, {
                    params: {
                        symbol: args.symbol,
                        fromId: args.fromId,
                        startTime: args.startTime,
                        endTime: args.endTime,
                        limit: Math.min(args.limit || 500, 1000)
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

    // Current Average Price
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

    // 24hr Price Change Statistics
    server.tool(
        "get_24hr_ticker",
        {
            symbol: symbolSchema.optional().describe("Trading pair symbol, e.g. BTCUSDT"),
            symbols: z.array(symbolSchema).optional().describe("Array of multiple trading pair symbols")
        },
        async (args: { symbol?: string; symbols?: string[] }) => {
            try {
                // Validate that only one parameter is provided
                if (args.symbol && args.symbols) {
                    throw new Error("Provide either symbol or symbols, not both");
                }
                
                let params = {};
                if (args.symbol) {
                    params = { symbol: args.symbol };
                } else if (args.symbols) {
                    params = { symbols: JSON.stringify(args.symbols) };
                }

                const response = await axiosInstance.get(`/api/v3/ticker/24hr`, {
                    params
                });
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Failed to get 24hr price statistics: ${sanitizeError(error)}` }],
                    isError: true
                };
            }
        }
    );

    // UI Klines (Candlestick Data for UI)
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

    // Trading Day Ticker
    server.tool(
        "get_trading_day_ticker",
        {
            symbol: symbolSchema.optional().describe("Trading pair symbol, e.g. BTCUSDT"),
            symbols: z.array(symbolSchema).optional().describe("Array of multiple trading pair symbols"),
            timeZone: z.string().optional().describe("Time zone, default UTC")
        },
        async (args: { symbol?: string; symbols?: string[]; timeZone?: string }) => {
            try {
                // Validate that only one parameter is provided
                if (args.symbol && args.symbols) {
                    throw new Error("Provide either symbol or symbols, not both");
                }
                
                let params: any = {};
                if (args.symbol) {
                    params.symbol = args.symbol;
                } else if (args.symbols) {
                    params.symbols = JSON.stringify(args.symbols);
                }
                if (args.timeZone) {
                    params.timeZone = args.timeZone;
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

    // Best Bid/Ask Price
    server.tool(
        "get_book_ticker",
        {
            symbol: symbolSchema.optional().describe("Trading pair symbol, e.g. BTCUSDT"),
            symbols: z.array(symbolSchema).optional().describe("Array of multiple trading pair symbols")
        },
        async (args: { symbol?: string; symbols?: string[] }) => {
            try {
                // Validate that only one parameter is provided
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

    // Rolling Window Price Change Statistics
    server.tool(
        "get_rolling_window_ticker",
        {
            symbol: symbolSchema.optional().describe("Trading pair symbol, e.g. BTCUSDT"),
            symbols: z.array(symbolSchema).optional().describe("Array of multiple trading pair symbols"),
            windowSize: z.enum(["1m", "2m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "2d", "3d", "7d", "30d"])
                .optional().describe("Window size for rolling statistics, default 1d"),
            type: z.enum(["FULL", "MINI"]).optional().describe("Response type, default FULL")
        },
        async (args: { symbol?: string; symbols?: string[]; windowSize?: string; type?: string }) => {
            try {
                // Validate that only one parameter is provided
                if (args.symbol && args.symbols) {
                    throw new Error("Provide either symbol or symbols, not both");
                }
                
                let params: any = {};
                if (args.symbol) {
                    params.symbol = args.symbol;
                } else if (args.symbols) {
                    params.symbols = JSON.stringify(args.symbols);
                }
                if (args.windowSize) {
                    params.windowSize = args.windowSize;
                }
                if (args.type) {
                    params.type = args.type;
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

    // Price Ticker
    server.tool(
        "get_price",
        {
            symbol: symbolSchema.optional().describe("Trading pair symbol, e.g. BTCUSDT"),
            symbols: z.array(symbolSchema).optional().describe("Array of multiple trading pair symbols")
        },
        async (args: { symbol?: string; symbols?: string[] }) => {
            try {
                // Validate that only one parameter is provided
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
}

async function main() {
    const server = new McpServer({
        name: "binance-mcp-secure",
        version: "1.0.2",
        description: "Binance Cryptocurrency Market Data MCP Service (Security Hardened)"
    });

    registerTools(server);
    let transport = new StdioServerTransport();
    await server.connect(transport);
    
    const cleanup = async () => {
        await transport.close();
        process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

    // Log startup in production-safe way (no console in production)
    if (process.env.NODE_ENV !== 'production') {
        console.log("MCP service has started");
    }
}

function handleError(error: Error) {
    // Don't expose stack traces in production
    if (process.env.NODE_ENV !== 'production') {
        console.error("An error occurred:", error);
    }
    process.exit(1);
}

main().catch(handleError);