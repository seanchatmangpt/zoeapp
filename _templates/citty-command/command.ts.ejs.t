---
to: <%= out %>
---
import { defineCommand } from "citty";

export const <%= exportName %> = defineCommand({
  meta: {
    name: "<%= name %>",
    description: "<%= description %>",<% if (alias && alias.length > 0) { %>
    alias: [<%= alias.split(",").map((a) => `"${a.trim()}"`).join(", ") %>],<% } %><% if (hidden) { %>
    hidden: true,<% } %>
  },
<% if (withPlugins) { %>
  plugins: [
    // <citty-plugins>
  ],
<% } %><% if (withArgs) { %>
  args: {
    // <citty-args>
  },
<% } %><% if (withHooks) { %>
  setup(ctx) {
    // <citty-setup>
  },

  cleanup(ctx) {
    // <citty-cleanup>
  },
<% } %><% if (typeof withSubcommands !== "undefined" && String(withSubcommands) === "true") { %>
  subCommands: {
    // <citty-subcommands>
  },
<% } else { %>
  async run(ctx) {
    // Implement command behavior.
    // Keep command behavior outside generated templates when possible.
    console.log("Command <%= name %> is wired.");
  },
<% } %>
});

export default <%= exportName %>;
