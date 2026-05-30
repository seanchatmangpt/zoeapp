import { MembraneContext } from './context';

export class ProxyableBridge {
  /**
   * Wraps a target object in a JS Proxy governed by the MembraneContext
   */
  static wrap<T extends object>(
    target: T,
    context: MembraneContext,
    options: {
      onMutation?: (prop: string | symbol, value: any) => void;
      flowName?: string;
    } = {}
  ): T {
    const handler: ProxyHandler<T> = {
      set: (obj, prop, value, receiver) => {
        const commandId = `cmd_set_${String(prop)}_${Date.now()}`;
        const originalVal = Reflect.get(obj, prop, receiver);

        // Optimistically set the value
        Reflect.set(obj, prop, value, receiver);
        if (options.onMutation) {
          options.onMutation(prop, value);
        }

        const input = {
          property: String(prop),
          value,
          flowName: options.flowName,
          fromState: originalVal,
          toState: value
        };

        // Run async membrane checking in background
        context.run('property-mutator', commandId, input, async () => {
          return true;
        }).then((res) => {
          if (!res.success) {
            // Rollback optimistic write if membrane denies/fails
            Reflect.set(obj, prop, originalVal, receiver);
          }
        });

        return true;
      },

      get: (obj, prop, receiver) => {
        return Reflect.get(obj, prop, receiver);
      }
    };

    return new Proxy(target, handler);
  }
}
