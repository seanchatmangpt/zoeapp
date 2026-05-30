---
to: <%= out.replace(/\.ts$/, ".test.ts") %>
if: <%= withTest %>
---
import { describe, expect, it } from "vitest";
import { <%= exportName %> } from "./<%= out.split("/").pop().replace(/\.ts$/, "") %>";

describe("<%= exportName %>", () => {
  it("defines a Citty command", () => {
    expect(<%= exportName %>).toBeTruthy();
  });
});
