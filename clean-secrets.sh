#!/bin/bash
# Script to safely remove any cached .env or secret files from Git tracking before pushing to GitHub

echo "🔒 Securing repository and removing sensitive files from Git tracking..."

# Remove any tracked .env files from git cache without deleting local files
git rm --cached -r .env 2>/dev/null || true
git rm --cached -r .env.local 2>/dev/null || true
git rm --cached -r .env.* 2>/dev/null || true
git rm --cached -r *.pem 2>/dev/null || true
git rm --cached -r *.key 2>/dev/null || true
git rm --cached -r credentials*.json 2>/dev/null || true
git rm --cached -r service-account*.json 2>/dev/null || true
git rm --cached -r firebase-admin*.json 2>/dev/null || true
git rm --cached -r migrated_prompt_history/ 2>/dev/null || true

echo "✅ Sensitive files untracked from Git!"
echo "Run the following commands to push securely:"
echo "  git add .gitignore"
echo "  git commit -m 'Secure API keys and exclude env files from GitHub'"
echo "  git push origin main"
