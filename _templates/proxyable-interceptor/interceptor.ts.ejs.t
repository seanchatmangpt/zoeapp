---
to: <%= out %>
---
import { createProxy } from 'proxyable';

/**
 * Universal Operational Membrane Interceptor: <%= name %>
 * <%= description %>
 */
export function <%= exportName %><T extends object>(targetObj: T) {
  const { proxy, defineGetInterceptor, defineSetInterceptor } = createProxy(targetObj);

<% if (withGetTrap) { %>
  // Provide computed properties or hide inadmissible projections
  defineGetInterceptor((target, prop) => {
    // Example: Computed property projection
    // if (prop === "computedField") {
    //   return `Projected: ${String(target.id)}`;
    // }
    return target[prop as keyof T];
  });
<% } %>

<% if (withSetTrap) { %>
  // Validate and authorize operational tension before mutation
  defineSetInterceptor((target, prop, value) => {
    // Example: Type-safe boundary validation
    // if (prop === "status" && value === "published") {
    //   throw new TypeError("Direct status manipulation is inadmissible. Use PublishCommand.");
    // }
    target[prop as keyof T] = value as any;
    return true;
  });
<% } %>

  return proxy;
}
