import { action } from 'hypergen/dist/actions/index.js';
import type { ActionContext, ActionResult } from 'hypergen/dist/actions/index.js';
import path from 'path';
import render from 'hypergen/dist/render.js';

export async function cittyRoot(context: ActionContext): Promise<ActionResult> {
  const { variables, utils, logger } = context;
  const filesCreated: string[] = [];
  const actionFolder = path.join(process.cwd(), '_templates', 'citty-root');

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

    logger.info(`Successfully scaffolded ${filesCreated.length} Citty root files.`);
    return {
      success: true,
      message: `Successfully scaffolded Citty root CLI: ${variables.name}`,
      filesCreated
    };
  } catch (error: any) {
    logger.error(`Failed to scaffold Citty root: ${error.message}`);
    return {
      success: false,
      message: `Failed to scaffold Citty root: ${error.message}`
    };
  }
}

action({
  name: 'citty-root',
  description: 'Create a root Citty CLI entrypoint',
  category: 'cli',
  parameters: [
    {
      name: 'name',
      type: 'string',
      required: true,
      description: 'CLI command name',
      pattern: '^[a-z][a-z0-9-]*$'
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
      description: 'CLI description'
    },
    {
      name: 'version',
      type: 'string',
      required: false,
      description: 'CLI version'
    },
    {
      name: 'lazy',
      type: 'boolean',
      required: false,
      description: 'Use lazy subcommand imports'
    }
  ]
})(cittyRoot);
