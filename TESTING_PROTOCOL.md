# 🚨 MANDATORY TESTING PROTOCOL 🚨

## Critical Rule for All Development

**NEVER claim a feature is "working" or "successful" without testing it with the actual user account in production first!**

## Testing Protocol

After **EVERY** development task, follow this protocol:

### 1. Local Testing
- [ ] Feature works in local development environment
- [ ] All tests pass
- [ ] No console errors
- [ ] Database migrations run successfully

### 2. Deployment
- [ ] Code committed and pushed to GitHub
- [ ] Railway deployment completes without errors
- [ ] Database migrations applied to production database
- [ ] Check Railway logs for errors

### 3. **CRITICAL: Production Testing with User Account**
- [ ] **Log out of any existing session**
- [ ] **Log in with paulinet77@gmail.com in production (https://www.yassu.ai)**
- [ ] **Test the new feature in the actual UI/UX**
- [ ] **Verify the complete user flow works end-to-end**
- [ ] **Check browser console for errors**
- [ ] **Verify authentication still works**

### 4. Only After Step 3: Report Success
- [ ] Only after successfully testing with the user account, report that the feature is working
- [ ] Provide screenshots or evidence of successful testing
- [ ] Document any issues found during testing

## Why This Matters

**Lessons Learned (Jan 6, 2026):**

1. **Database Migration Issue**: Deployed LinkedIn OAuth without applying migrations to production → ALL users unable to log in
2. **False Success Claims**: Claimed login was working without testing → User still couldn't log in, wasted time and credits

## User Account for Testing

**Email**: paulinet77@gmail.com  
**Password**: (User will provide when needed)

## Production URL

https://www.yassu.ai

## Remember

> "Working in development ≠ Working in production"
> 
> "Deployment successful ≠ Feature working"
> 
> "Code pushed ≠ Users can use it"

**Always test with the actual user account in production before claiming success!**
