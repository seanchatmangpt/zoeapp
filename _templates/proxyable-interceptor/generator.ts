import { action } from 'hypergen/dist/actions/index.js';
import type { ActionContext, ActionResult } from 'hypergen/dist/actions/index.js';
import path from 'path';
import render from 'hypergen/dist/render.js';

export async function proxyableInterceptor(context: ActionContext): Promise<ActionResult> {
  const { variables, utils, logger } = context;
  const filesCreated: string[] = [];
  const actionFolder = path.join(process.cwd(), '_templates', 'proxyable-interceptor');

  try {
    const rendered = await render(
      {
        actionFolder,
        ...variables,
      },
      {}
    );

    for (const fileObj of rendered) {
      const targetPath = fileObj.attributes?.to;
      if (!targetPath) continue;

      const absoluteTarget = path.isAbsolute(targetPath)
        ? targetPath
        : path.resolve(process.cwd(), targetPath);

      await utils.createDirectory(path.dirname(absoluteTarget));
      await utils.writeFile(absoluteTarget, fileObj.body);
      filesCreated.push(absoluteTarget);
    }

    logger.info(`Successfully scaffolded ${filesCreated.length} Proxyable Interceptor files.`);
    return {
      success: true,
      message: `Successfully scaffolded Proxyable Interceptor: ${variables.exportName}`,
      filesCreated
    };
  } catch (error: any) {
    logger.error(`Failed to scaffold Proxyable Interceptor: ${error.message}`);
    return {
      success: false,
      message: `Failed to scaffold Proxyable Interceptor: ${error.message}`
    };
  }
}

action({
  name: 'proxyable-interceptor',
  description: 'Create an isolated context-based proxy interceptor for the Universal Operational Membrane',
  category: 'membrane',
  parameters: [
    {
      name: 'name',
      type: 'string',
      required: true,
      description: 'Interceptor name in kebab-case',
      pattern: '^[a-z][a-z0-9-]*$'
    },
    {
      name: 'exportName',
      type: 'string',
      required: true,
      description: 'TypeScript export name'
    },
    {
      name: 'out',
      type: 'string',
      required: true,
      description: 'Output file path'
    },
    {
      name: 'description',
      type: 'string',
      required: true,
      description: 'Interceptor description'
    },
    {
      name: 'withGetTrap',
      type: 'boolean',
      required: false,
      description: 'Scaffold defineGetInterceptor'
    },
    {
      name: 'withSetTrap',
      type: 'boolean',
      required: false,
      description: 'Scaffold defineSetInterceptor'
    }
  ]
})(proxyableInterceptor);
