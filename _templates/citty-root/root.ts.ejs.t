---
to: <%= out %>
---
#!/usr/bin/env tsx
import { defineCommand, runMain } from "citty";

const main = defineCommand({
  meta: {
    name: "<%= name %>",
    version: "<%= version %>",
    description: "<%= description %>",
  },

  subCommands: {
    // <citty-subcommands>
  },
});

runMain(main);
