---
to: <%= out %>
---
import { defineCittyPlugin } from "citty";

export const <%= exportName %> = defineCittyPlugin({
  name: "<%= name %>",

  async setup(ctx) {
    // Attach reusable command context.
  },

  async cleanup(ctx) {
    // Release reusable command context.
  },
});

export default <%= exportName %>;
