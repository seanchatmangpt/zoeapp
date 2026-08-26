test:
    npm test

dev:
    npm start

polish:
    npm run format && npm run lint && npm run typecheck

ci: polish test
