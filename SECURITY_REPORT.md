# Binance MCP Security Analysis Report

## Executive Summary

The Binance MCP server is a Model Context Protocol service that provides access to Binance cryptocurrency market data. While the service implements read-only API access and follows some security best practices, there are **critical security vulnerabilities** that must be addressed before production use.

### Severity Summary
- **🔴 CRITICAL**: 2 issues
- **🟠 HIGH**: 3 issues  
- **🟡 MEDIUM**: 4 issues
- **🟢 LOW**: 2 issues

## Critical Findings

### 🔴 CRITICAL: Known Vulnerability in Axios Dependency (CVE-2024-39338)

**Issue**: The project uses Axios version 1.6.7, which contains a critical Server-Side Request Forgery (SSRF) vulnerability.

**Impact**: An attacker could potentially:
- Bypass security controls and access internal resources
- Perform arbitrary requests from the server
- Access sensitive internal systems or data

**Fix**: 
```json
"axios": "^1.7.7"  // Update to latest patched version
```

### 🔴 CRITICAL: Container Runs as Root User

**Issue**: The Docker container runs with root privileges (uid=0).

**Impact**: If the application is compromised, an attacker gains root access within the container, making privilege escalation and container escape attacks easier.

**Fix**: Add non-root user to Dockerfile:
```dockerfile
# Create non-root user
RUN addgroup --system appgroup && \
    adduser --system --ingroup appgroup --home /app --shell /sbin/nologin appuser

# Change ownership
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser
```

## High-Risk Findings

### 🟠 HIGH: Vulnerable Express.js Version (CVE-2024-29041)

**Issue**: Uses Express 5.0.1 (pre-release) with known open redirect vulnerability.

**Impact**: Attackers could craft malicious URLs that bypass redirect allow lists.

**Fix**: Update to Express 5.0.0-beta.3 or use stable Express 4.19.2

### 🟠 HIGH: API Key Exposure Risk

**Issue**: The `get_historical_trades` function uses API keys from environment variables without validation.

**Code Location**: `/src/index.ts:82`
```typescript
headers: {
    "X-MBX-APIKEY": process.env.BINANCE_API_KEY || ""
}
```

**Impact**: 
- Empty string sent if API key not set
- No validation of API key format
- API key logged in error messages if requests fail

**Fix**: Add proper validation and error handling

### 🟠 HIGH: Insufficient Input Validation

**Issue**: User inputs are passed directly to API calls without comprehensive validation.

**Impact**: Could lead to API abuse, rate limiting issues, or unexpected behavior.

## Medium-Risk Findings

### 🟡 MEDIUM: Non-Specific Docker Base Image

**Issue**: Uses `node:lts-alpine` which is a moving target.

**Fix**: Pin to specific version like `node:20-alpine`

### 🟡 MEDIUM: No Health Check in Dockerfile

**Issue**: Container lacks health monitoring capabilities.

**Fix**: Add HEALTHCHECK instruction for better monitoring

### 🟡 MEDIUM: Outdated npm Version

**Issue**: Build logs show npm 10.9.2 with available upgrade to 11.4.2

### 🟡 MEDIUM: No Rate Limiting Implementation

**Issue**: Service doesn't implement its own rate limiting for API calls.

## Low-Risk Findings

### 🟢 LOW: Missing Security Headers

**Issue**: No security-specific HTTP headers configured.

### 🟢 LOW: Verbose Error Messages

**Issue**: Full error messages returned to users could leak implementation details.

## Positive Security Aspects

1. **Read-Only API Access**: All endpoints use GET requests only
2. **No Database**: No persistent storage reduces attack surface
3. **Multi-Stage Docker Build**: Reduces final image size and attack surface
4. **Dependencies Locked**: Uses package-lock.json for reproducible builds
5. **TypeScript**: Provides type safety and reduces runtime errors
6. **Minimal Dependencies**: Only 3 production dependencies

## API Security Analysis

### Public vs Private Endpoints

Most endpoints access public market data **except**:
- `get_historical_trades`: Requires API key authentication

### External Network Connections

All connections go to:
- `https://api.binance.com` (Official Binance API)

No other external connections detected.

## Recommendations

### Immediate Actions (Before Production)

1. **Update Dependencies**:
   ```bash
   npm update axios@latest
   npm install express@4.19.2
   ```

2. **Fix Dockerfile Security**:
   - Implement non-root user
   - Pin base image version
   - Add health check

3. **Improve API Key Handling**:
   ```typescript
   const apiKey = process.env.BINANCE_API_KEY;
   if (!apiKey || apiKey.length < 32) {
     throw new Error("Invalid or missing BINANCE_API_KEY");
   }
   ```

4. **Add Input Validation**:
   ```typescript
   // Example for symbol validation
   const symbolRegex = /^[A-Z]{3,10}$/;
   if (!symbolRegex.test(args.symbol)) {
     throw new Error("Invalid symbol format");
   }
   ```

### Medium-Term Improvements

1. **Implement Rate Limiting**: Add request throttling per client
2. **Add Security Monitoring**: Log suspicious patterns
3. **Create Security Documentation**: Document API key permissions needed
4. **Regular Dependency Updates**: Implement automated security scanning

## Testing Recommendations

1. Run regular vulnerability scans:
   ```bash
   npm audit
   docker scan binance-mcp-security-test
   ```

2. Test with restricted API keys (read-only permissions)

3. Monitor for unusual API usage patterns

## Conclusion

While the Binance MCP server implements several good security practices, the critical vulnerabilities in dependencies and Docker configuration pose significant risks. These issues must be addressed before using this service in any environment where security is a concern.

The service's read-only nature and minimal attack surface are positive aspects, but proper security hardening is essential for safe operation, especially when handling API keys that could provide access to trading accounts.

**Overall Security Score: 5/10** - Requires immediate security updates before production use.