test:
    npm test

dev:
    npm start

polish:
    npm run format && npm run lint && npm run typecheck

ci: polish test

# Check DATABASE.md consistency against supabase/migrations (exit 1 on drift)
check-db-docs:
    python3 scripts/check_db_docs.py
