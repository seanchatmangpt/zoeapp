#!/bin/bash
# ZOEAPP_RESEARCH_PROGRAM_AUDIT_SECURITY

echo "Starting Proof Cell Security Audit..."

# Run Supabase security advisor
# Fail on warn or error
supabase db advisors --local --type security --fail-on warn

if [ $? -eq 0 ]; then
  echo "Security Audit Passed."
  exit 0
else
  echo "Security Audit Failed."
  exit 1
fi
