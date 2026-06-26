# Monitoring Guide — GameDayWire

Comprehensive monitoring setup for health checks, uptime monitoring, log management, alerting, and performance tracking.

---

## Table of Contents

1. [Health Check Endpoint](#1-health-check-endpoint)
2. [External Uptime Monitoring](#2-external-uptime-monitoring)
3. [Log Management](#3-log-management)
4. [Alert Configuration](#4-alert-configuration)
5. [Performance Monitoring](#5-performance-monitoring)
6. [PM2 Process Monitoring](#6-pm2-process-monitoring)
7. [Docker Monitoring](#7-docker-monitoring)
8. [Error Tracking](#8-error-tracking)

---

## 1. Health Check Endpoint

The system provides a comprehensive health check at `/api/health` that verifies all critical components.

### 1.1 Endpoint

```
GET /api/health
```

### 1.2 Response Format

**Healthy response:**

```json
{
  "status": "ok",
  "timestamp": "2026-06-19T08:00:00Z",
  "uptime_seconds": 86400,
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "ok",
      "latency_ms": 5,
      "message": "Connection established successfully"
    },
    "serpapi": {
      "status": "ok",
      "last_success": "2026-06-19T07:30:00Z",
      "message": "API responsive"
    },
    "groq": {
      "status": "ok",
      "last_success": "2026-06-19T07:50:00Z",
      "message": "API responsive"
    },
    "cache": {
      "hit_rate": 0.85,
      "status": "ok",
      "message": "Cache directory writable and healthy"
    },
    "disk": {
      "free_mb": 10240,
      "status": "ok",
      "message": "Sufficient disk space available"
    },
    "last_trend_monitor": {
      "last_run": "2026-06-19T06:00:00Z",
      "success": true,
      "trends_found": 12,
      "message": "Healthy"
    }
  },
  "alerts": []
}
```

**Degraded response** (non-critical failure):

```json
{
  "status": "degraded",
  "checks": {},
  "alerts": []
}
```

**Critical response** (database, SerpAPI, or Groq failure):

```json
{
  "status": "critical",
  "checks": {
    "database": {
      "status": "error",
      "latency_ms": 0,
      "message": "Connection failed: DATABASE_ERROR"
    }
  },
  "alerts": [
    {
      "severity": "critical",
      "message": "Database connection lost",
      "since": "2026-06-19T07:55:00Z"
    }
  ]
}
```

### 1.3 Checking Health from the Command Line

```bash
# Basic health check
curl -s http://localhost:3001/api/health | node -e "
const j = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log('Status:', j.status);
console.log('Uptime:', Math.floor(j.uptime_seconds/3600), 'hours');
Object.entries(j.checks).forEach(([k,v]) => console.log(k + ':', v.status));
j.alerts.forEach(a => console.log('ALERT:', a.severity, '-', a.message));
"

# Verbose health check
curl -s "http://localhost:3001/api/health?verbose=true"
```

### 1.4 Automated Health Check Script

```bash
#!/bin/bash
# health-check.sh — Run as a cron job every 5 minutes
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health)
if [ "$HEALTH" != "200" ]; then
  echo "Health check failed with HTTP $HEALTH" | mail -s "GameDayWire DOWN" admin@yourdomain.com
  # Optionally restart services
  # pm2 restart sporty-backend
fi
```

---

## 2. External Uptime Monitoring

### 2.1 UptimeRobot Setup

Recommended: **UptimeRobot** (free tier: 50 monitors at 5-minute intervals)

1. Create an account at https://uptimerobot.com
2. Add a new monitor:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** `GameDayWire API`
   - **URL:** `https://yourdomain.com/api/health`
   - **Monitoring Interval:** 5 minutes
   - **Select:** Monitor HTTPS + SSL Certificate
3. Set up alert contacts:
   - Email: For non-critical notifications
   - SMS/Webhook: For critical downtime alerts

### 2.2 Alternative Services

| Service             | Free Tier                  | Features                        |
| ------------------- | -------------------------- | ------------------------------- |
| **Better Uptime**   | 1 monitor, 1-min interval  | Status page, Slack integration  |
| **Pulsetic**        | 3 monitors, 5-min interval | SSL monitoring, phone alerts    |
| **Checkly**         | 5 monitors, 5-min interval | Playwright-based browser checks |
| **Healthchecks.io** | Unlimited (open source)    | Ping-based, cron job monitoring |

### 2.3 SSL Certificate Monitoring

Monitor SSL certificate expiry through:

- **UptimeRobot** (SSL check included)
- **SSL Labs** (https://www.ssllabs.com/ssltest/)
- **Certbot expiry check:**
  ```bash
  sudo openssl x509 -enddate -noout -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem
  ```

---

## 3. Log Management

### 3.1 Log Locations

| Log Type       | Location                           | Purpose                  |
| -------------- | ---------------------------------- | ------------------------ |
| Backend app    | `logs/backend/app.log`             | Application-level events |
| Backend errors | `logs/backend/error.log`           | Error stack traces       |
| PM2 output     | `logs/pm2/backend-out.log`         | Backend stdout           |
| PM2 errors     | `logs/pm2/backend-error.log`       | Backend stderr           |
| Cron jobs      | `logs/cron/*.log`                  | Cron job execution logs  |
| API requests   | `logs/api/requests.log`            | Request/response logging |
| SEO audit      | `logs/audit/audit_*.log`           | Weekly audit results     |
| Nginx access   | `/var/log/nginx/sporty-access.log` | Web traffic              |
| Nginx errors   | `/var/log/nginx/sporty-error.log`  | Web server errors        |

### 3.2 Viewing Logs

```bash
# Tail application logs
tail -f logs/backend/app.log

# Tail cron job logs
tail -f logs/cron/trend_monitor.log

# Tail PM2 logs
pm2 logs sporty-backend

# Search for errors
grep -r "ERROR\|error\|Error" logs/backend/error.log

# View last 50 lines of cron log
tail -50 logs/cron/morning_article.log

# Watch all logs in real-time (Linux)
multitail logs/backend/app.log logs/cron/*.log
```

### 3.3 Log Rotation

**Using system logrotate:**

```bash
# /etc/logrotate.d/sporty
/var/www/sporty/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}

/var/log/nginx/sporty-*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data adm
    postrotate
        nginx -s reopen
    endscript
}
```

**Using built-in cleanup script:**

```bash
# Run daily via cron
node scripts/cleanup.js

# Manual cleanup (remove logs older than 30 days)
find logs/ -name "*.log" -mtime +30 -delete

# Clean PM2 logs
pm2 flush
```

### 3.4 Structured Logging

The backend logs in structured JSON format for easy parsing:

```json
{"level":"info","message":"Article generated successfully","timestamp":"2026-06-19T08:00:00Z","service":"GroqWriter","duration_ms":15200,"article_slug":"lebron-james-stats-2025-2026-season"}
{"level":"error","message":"SerpAPI rate limit reached","timestamp":"2026-06-19T07:00:00Z","service":"TrendFinder","error_code":"E001","retry_after":3600}
```

Query logs using standard command-line tools:

```bash
# Extract all error-level logs
grep '"level":"error"' logs/backend/app.log

# Count errors by service
grep -oP '"service":"\K[^"]+' logs/backend/error.log | sort | uniq -c | sort -rn

# Find slow operations (>10 seconds)
grep -oP '{"level":"info".*"duration_ms":\d+' logs/backend/app.log | node -e "
const fs = require('fs');
const data = fs.readFileSync('/dev/stdin','utf8');
data.trim().split('\n').forEach(line => {
  const j = JSON.parse(line);
  if (j.duration_ms > 10000) console.log(j.message, '-', j.duration_ms + 'ms');
});
"
```

---

## 4. Alert Configuration

### 4.1 Alert Severity Levels

| Severity     | Trigger                                      | Channel         | Response Time |
| ------------ | -------------------------------------------- | --------------- | ------------- |
| **Critical** | Database down, SerpAPI/Groq unreachable      | Email + Webhook | Immediate     |
| **Error**    | Article generation fails twice consecutively | Email           | Within 1 hour |
| **Warning**  | SEO audit finds issues                       | Email (digest)  | Daily review  |
| **Info**     | Backup completed, cron success               | Log only        | Weekly review |

### 4.2 Notification Channels

**Email Alerts:**

```env
# .env configuration
ADMIN_EMAIL=admin@yourdomain.com
ENABLE_NOTIFICATIONS=true
```

**Webhook Alerts (Slack/Discord):**

```bash
# Test the webhook notification
curl -X POST http://localhost:3001/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: <signature>" \
  -d '{"event": "test_alert", "severity": "critical", "message": "Test alert from monitoring system"}'
```

### 4.3 Alert Conditions

Configure alerts for the following conditions:

1. **Health check returns non-ok status** — Immediate notification
2. **Consecutive generation failures** (2+ in a row) — Error notification
3. **Backup failure** — Error notification (weekly)
4. **Disk space below 500MB** — Warning notification
5. **SSL certificate expires within 30 days** — Warning notification
6. **No articles published in 48 hours** — Error notification
7. **SEO audit finds critical issues** — Warning notification

---

## 5. Performance Monitoring

### 5.1 Key Metrics

| Metric                   | Target         | How to Measure        |
| ------------------------ | -------------- | --------------------- |
| API response time        | < 200ms median | Log analysis          |
| Article generation time  | < 60 seconds   | GroqWriter logs       |
| Database query time      | < 50ms         | Prisma query logging  |
| Cache hit rate           | > 80%          | Cache service metrics |
| Uptime                   | > 99.9%        | UptimeRobot           |
| Next.js ISR revalidation | < 24 hours     | Frontend logs         |

### 5.2 Monitoring Generation Performance

```bash
# Check generation times from logs
grep '"service":"GroqWriter"' logs/backend/app.log | node -e "
const fs = require('fs');
const data = fs.readFileSync('/dev/stdin','utf8');
const durations = data.trim().split('\n').map(l => JSON.parse(l).duration_ms).filter(Boolean);
const avg = durations.reduce((a,b) => a+b, 0) / durations.length;
console.log('Articles generated:', durations.length);
console.log('Average time:', Math.round(avg/1000) + 's');
console.log('Max time:', Math.round(Math.max(...durations)/1000) + 's');
console.log('Min time:', Math.round(Math.min(...durations)/1000) + 's');
"
```

### 5.3 Database Performance

Enable Prisma query logging for debugging:

```bash
# Set log level to see queries
DEBUG="prisma:query" pnpm --filter backend start

# Check for slow queries
grep '"duration_ms":[5-9][0-9][0-9]' logs/backend/app.log
```

### 5.4 Resource Monitoring

```bash
# CPU and memory usage
htop

# Disk usage
df -h

# PM2 resource usage per process
pm2 monit

# Docker resource usage
docker stats

# Find the biggest log files
du -sh logs/*/ | sort -rh
```

---

## 6. PM2 Process Monitoring

### 6.1 Basic PM2 Commands

```bash
# List all processes
pm2 status

# View detailed metrics
pm2 show sporty-backend
pm2 show sporty-frontend

# Real-time monitoring dashboard
pm2 monit

# View recent logs
pm2 logs sporty-backend --lines 50

# View error logs only
pm2 logs sporty-backend --err --lines 20
```

### 6.2 PM2 Metrics

```
┌─────┬──────────────┬──────┬─────────┬─────────┬───────┬────────┐
│ id  │ name         │ mode │ status  │ cpu     │ memory│ restarts │
├─────┼──────────────┼──────┼─────────┼─────────┼───────┼────────┤
│ 0   │ sporty-backend │ fork │ online  │ 2%     │ 85 MB │ 0       │
│ 1   │ sporty-frontend│ fork │ online  │ 1%     │ 120 MB│ 0       │
└─────┴──────────────┴──────┴─────────┴─────────┴───────┴────────┘
```

### 6.3 Automatic Restart Configuration

The PM2 ecosystem file configures:

- **max_restarts:** 10 attempts
- **restart_delay:** 5 seconds between attempts
- **max_memory_restart:** 500MB threshold
- **cron_restart:** (optional) Force restart daily at 04:00 UTC
  ```javascript
  cron_restart: '0 4 * * *';
  ```

---

## 7. Docker Monitoring

### 7.1 Docker Commands

```bash
# Check container status
docker-compose ps

# View logs for a specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx

# Resource usage
docker stats

# Container health status
docker inspect --format='{{.State.Health.Status}}' sporty_backend_1
```

### 7.2 Docker Health Check

The backend container has a built-in health check that runs every 30 seconds:

```yaml
healthcheck:
  test:
    [
      'CMD',
      'node',
      '-e',
      "fetch('http://localhost:3001/api/health').then(r => process.exit(r.ok?0:1))",
    ]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 15s
```

---

## 8. Error Tracking

### 8.1 Application Error Logging

Errors are logged to `system_logs` table in the database with severity levels:

```sql
-- Query recent critical errors
SELECT * FROM system_logs
WHERE severity = 'critical'
ORDER BY created_at DESC
LIMIT 10;
```

```sql
-- Query error distribution by type
SELECT log_type, COUNT(*) as count
FROM system_logs
WHERE severity IN ('error', 'critical')
  AND created_at > datetime('now', '-7 days')
GROUP BY log_type
ORDER BY count DESC;
```

### 8.2 Monitoring Error Codes

| Error Code | Condition                  | Action                           |
| ---------- | -------------------------- | -------------------------------- |
| E001       | SerpAPI rate limit         | Wait for reset or upgrade plan   |
| E002       | SerpAPI empty results      | Expand query parameters          |
| E003       | Groq API timeout           | Retry with exponential backoff   |
| E004       | Quality gate failure       | Review content guide settings    |
| E005       | Duplicate article detected | Regenerate with different angle  |
| E006       | Keyword difficulty high    | Select alternative keyword       |
| E007       | Insufficient data points   | Expand SerpAPI news results      |
| E008       | Database write failure     | Check disk space and permissions |

### 8.3 Error Rate Alerts

Set up alerts when error rate exceeds thresholds:

```bash
# Count errors in the last hour
grep -c '"severity":"error"' logs/backend/app.log
```

### 8.4 Subscriber Metrics

| Metric                     | Notes                                                          |
| -------------------------- | -------------------------------------------------------------- |
| Total subscribers          | Tracked in-memory (resets on server restart)                   |
| Subscription storage       | In-memory `Set<string>` in the Next.js API route handler       |
| Production recommendation  | Replace with persistent storage (DB + SendGrid / Mailchimp)    |
| Newsletter signups         | Logged to console on each subscription                         |
| Email validation           | Client-side regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) + server-side validation |

**Monitoring command:**

```bash
# Check subscriber count from server logs
grep "New subscriber" logs/frontend/app.log | tail -5

# Count total unique subscribers
grep -c "New subscriber" logs/frontend/app.log
```

### 8.5 Common Monitoring Resolutions

| Issue                 | Check                                | Resolution                                     |
| --------------------- | ------------------------------------ | ---------------------------------------------- |
| Health check critical | Run `curl localhost:3001/api/health` | Check service status, restart if needed        |
| Database errors       | Check `logs/backend/error.log`       | Verify database connection and credentials     |
| SerpAPI errors        | Check API dashboard                  | Verify key and plan quota                      |
| Groq errors           | Check Groq dashboard                 | Verify key and rate limits                     |
| Cron not running      | Check `logs/cron/*.log`              | Run dry-run test, check node-cron registration |
| High memory usage     | `pm2 monit`                          | Restart process, investigate memory leak       |
| Disk space low        | `df -h`                              | Rotate logs, clean cache, prune backups        |
