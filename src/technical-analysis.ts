/**
 * Technical Analysis Functions for Binance MCP
 * Enhanced features for market analysis
 */

import { SMA, EMA, RSI, MACD, BollingerBands, ATR, VWAP } from 'technicalindicators';

export interface OHLCV {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timestamp: number;
}

export interface KlineData {
    openTime: number;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
    closeTime: number;
    quoteAssetVolume: string;
    numberOfTrades: number;
    takerBuyBaseAssetVolume: string;
    takerBuyQuoteAssetVolume: string;
}

/**
 * Convert Binance kline data to OHLCV format
 */
export function klineToOHLCV(klines: any[]): OHLCV[] {
    return klines.map(k => ({
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
        timestamp: k[0]
    }));
}

/**
 * Calculate Simple Moving Average
 */
export function calculateSMA(data: number[], period: number): (number | undefined)[] {
    return SMA.calculate({ period, values: data });
}

/**
 * Calculate Exponential Moving Average
 */
export function calculateEMA(data: number[], period: number): (number | undefined)[] {
    return EMA.calculate({ period, values: data });
}

/**
 * Calculate Relative Strength Index
 */
export function calculateRSI(data: number[], period: number = 14): (number | undefined)[] {
    return RSI.calculate({ period, values: data });
}

/**
 * Calculate MACD
 */
export function calculateMACD(data: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    return MACD.calculate({
        values: data,
        fastPeriod,
        slowPeriod,
        signalPeriod,
        SimpleMAOscillator: false,
        SimpleMASignal: false
    });
}

/**
 * Calculate Bollinger Bands
 */
export function calculateBollingerBands(data: number[], period = 20, stdDev = 2) {
    return BollingerBands.calculate({
        period,
        values: data,
        stdDev
    });
}

/**
 * Calculate Average True Range
 */
export function calculateATR(ohlcv: OHLCV[], period = 14) {
    return ATR.calculate({
        high: ohlcv.map(d => d.high),
        low: ohlcv.map(d => d.low),
        close: ohlcv.map(d => d.close),
        period
    });
}

/**
 * Calculate Volume Weighted Average Price
 */
export function calculateVWAP(ohlcv: OHLCV[]) {
    return VWAP.calculate({
        high: ohlcv.map(d => d.high),
        low: ohlcv.map(d => d.low),
        close: ohlcv.map(d => d.close),
        volume: ohlcv.map(d => d.volume)
    });
}

/**
 * Identify support and resistance levels
 */
export function findSupportResistance(ohlcv: OHLCV[], lookback = 20, threshold = 0.02) {
    const highs = ohlcv.map(d => d.high);
    const lows = ohlcv.map(d => d.low);
    
    const levels: { price: number; type: 'support' | 'resistance'; strength: number }[] = [];
    
    // Find local maxima (resistance)
    for (let i = lookback; i < highs.length - lookback; i++) {
        let isLocalMax = true;
        for (let j = i - lookback; j <= i + lookback; j++) {
            if (j !== i && highs[j] >= highs[i]) {
                isLocalMax = false;
                break;
            }
        }
        if (isLocalMax) {
            levels.push({ price: highs[i], type: 'resistance', strength: 1 });
        }
    }
    
    // Find local minima (support)
    for (let i = lookback; i < lows.length - lookback; i++) {
        let isLocalMin = true;
        for (let j = i - lookback; j <= i + lookback; j++) {
            if (j !== i && lows[j] <= lows[i]) {
                isLocalMin = false;
                break;
            }
        }
        if (isLocalMin) {
            levels.push({ price: lows[i], type: 'support', strength: 1 });
        }
    }
    
    // Cluster nearby levels
    const clustered = levels.reduce((acc, level) => {
        const existing = acc.find(l => 
            Math.abs(l.price - level.price) / level.price < threshold
        );
        if (existing) {
            existing.strength++;
            existing.price = (existing.price + level.price) / 2;
        } else {
            acc.push({ ...level });
        }
        return acc;
    }, [] as typeof levels);
    
    return clustered.sort((a, b) => b.strength - a.strength);
}

/**
 * Detect trend direction
 */
export function detectTrend(prices: number[], shortPeriod = 20, longPeriod = 50) {
    const shortSMA = calculateSMA(prices, shortPeriod);
    const longSMA = calculateSMA(prices, longPeriod);
    
    const recentShort = shortSMA[shortSMA.length - 1];
    const recentLong = longSMA[longSMA.length - 1];
    
    if (!recentShort || !recentLong) return 'unknown';
    
    if (recentShort > recentLong) {
        return 'bullish';
    } else if (recentShort < recentLong) {
        return 'bearish';
    } else {
        return 'neutral';
    }
}

/**
 * Calculate price change statistics
 */
export function calculatePriceStats(ohlcv: OHLCV[]) {
    const closes = ohlcv.map(d => d.close);
    const returns = closes.slice(1).map((close, i) => 
        (close - closes[i]) / closes[i] * 100
    );
    
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return {
        avgReturn,
        stdDev,
        sharpeRatio: avgReturn / stdDev * Math.sqrt(252), // Annualized
        maxReturn: Math.max(...returns),
        minReturn: Math.min(...returns),
        winRate: returns.filter(r => r > 0).length / returns.length * 100
    };
}