---
to: <%= out %>
---
import { defineCittyPlugin } from "citty";

export const <%= exportName %> = defineCittyPlugin({
  name: "<%= name %>",

  async setup(ctx) {
    // TODO: attach reusable command context.
  },

  async cleanup(ctx) {
    // TODO: release reusable command context.
  },
});

export default <%= exportName %>;
