import { action } from 'hypergen/dist/actions/index.js';
import type { ActionContext, ActionResult } from 'hypergen/dist/actions/index.js';
import path from 'path';
import render from 'hypergen/dist/render.js';

export async function cittyCommand(context: ActionContext): Promise<ActionResult> {
  const { variables, utils, logger } = context;
  const filesCreated: string[] = [];
  const actionFolder = path.join(process.cwd(), '_templates', 'citty-command');

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

      // Handle conditional testing logic
      if (fileObj.attributes?.if === 'false') {
        continue;
      }

      const absoluteTarget = path.isAbsolute(targetPath)
        ? targetPath
        : path.resolve(process.cwd(), targetPath);

      await utils.createDirectory(path.dirname(absoluteTarget));
      await utils.writeFile(absoluteTarget, fileObj.body);
      filesCreated.push(absoluteTarget);
    }

    logger.info(`Successfully scaffolded ${filesCreated.length} Citty command files.`);
    return {
      success: true,
      message: `Successfully scaffolded Citty command: ${variables.exportName}`,
      filesCreated
    };
  } catch (error: any) {
    logger.error(`Failed to scaffold Citty command: ${error.message}`);
    return {
      success: false,
      message: `Failed to scaffold Citty command: ${error.message}`
    };
  }
}

action({
  name: 'citty-command',
  description: 'Create a reusable Citty command module',
  category: 'cli',
  parameters: [
    {
      name: 'name',
      type: 'string',
      required: true,
      description: 'Command name in kebab-case',
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
      description: 'Command description'
    },
    {
      name: 'alias',
      type: 'string',
      required: false,
      description: 'Optional comma-separated aliases'
    },
    {
      name: 'hidden',
      type: 'boolean',
      required: false,
      description: 'Hide command from help output'
    },
    {
      name: 'withArgs',
      type: 'boolean',
      required: false,
      description: 'Generate args block'
    },
    {
      name: 'withHooks',
      type: 'boolean',
      required: false,
      description: 'Generate setup/cleanup hooks'
    },
    {
      name: 'withPlugins',
      type: 'boolean',
      required: false,
      description: 'Generate plugins block'
    },
    {
      name: 'withSubcommands',
      type: 'boolean',
      required: false,
      description: 'Generate subcommands block'
    },
    {
      name: 'lazySubcommands',
      type: 'boolean',
      required: false,
      description: 'Use lazy import for subcommands'
    },
    {
      name: 'withTest',
      type: 'boolean',
      required: false,
      description: 'Generate unit test file'
    }
  ]
})(cittyCommand);
