---
name: Bug Report
about: Create a detailed bug report to help us improve system reliability and performance
title: '[BUG] '
labels: bug
assignees: ''
---

## Bug Description

### Summary
<!-- Provide a clear and concise description of the bug (minimum 30 characters) -->


### Environment
<!-- Select the environment where the bug was encountered -->
- [ ] Production
- [ ] Staging
- [ ] Development

### Affected Component(s)
<!-- Select all components that are affected by this bug -->
- [ ] Frontend UI
- [ ] Backend API
- [ ] Database
- [ ] Authentication
- [ ] File Storage
- [ ] Real-time Updates
- [ ] Analytics
- [ ] Integration Layer

---

## Technical Details

### API Endpoint
<!-- If applicable, specify the affected API endpoint (format: /api/v1/*) -->


### Response Time
<!-- If performance-related, specify the response time in milliseconds -->


### Error Logs
<!-- Include relevant error logs with timestamp and correlation ID -->
```
<timestamp> <correlation_id> <log_level>: <message>
```

---

## Impact Assessment

### Severity
<!-- Select the appropriate severity level based on system impact -->
- [ ] Critical - System Unavailable
- [ ] High - Core Feature Broken
- [ ] Medium - Feature Degraded
- [ ] Low - Minor Issue

### Performance Impact Areas
<!-- Check all performance aspects that are affected -->
- [ ] Response Time
- [ ] Resource Usage
- [ ] Database Performance
- [ ] Network Latency

---

## Additional Context

### Steps to Reproduce
1. 
2. 
3. 

### Expected Behavior
<!-- Describe what should happen -->


### Actual Behavior
<!-- Describe what actually happens -->


### Screenshots/Recordings
<!-- If applicable, add screenshots or recordings to help explain the problem -->


### System Information
- Browser Version:
- Operating System:
- Screen Resolution:
- Device Type:

---

## Validation Rules
<!-- These rules will be enforced when submitting the issue -->
- Summary must be at least 30 characters long
- Environment must be selected
- At least one affected component must be checked
- Severity level must be selected
- Logs must include timestamp and correlation ID if provided

---

<!-- 
Note: This bug report template is designed to support the Task Management System's 
quality assurance process and maintain 99.9% system availability target. Please 
provide as much detailed information as possible to help with quick resolution.
-->