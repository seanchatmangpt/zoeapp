import { action } from 'hypergen/dist/actions/index.js';
import type { ActionContext, ActionResult } from 'hypergen/dist/actions/index.js';
import path from 'path';
import render from 'hypergen/dist/render.js';

export async function cittyBarrel(context: ActionContext): Promise<ActionResult> {
  const { variables, utils, logger } = context;
  const filesCreated: string[] = [];
  const actionFolder = path.join(process.cwd(), '_templates', 'citty-barrel');

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

      if (fileObj.attributes?.unless_exists === 'true' && await utils.exists(targetPath)) {
        logger.info(`File already exists, skipping creation: ${targetPath}`);
        continue;
      }

      const absoluteTarget = path.isAbsolute(targetPath)
        ? targetPath
        : path.resolve(process.cwd(), targetPath);

      await utils.createDirectory(path.dirname(absoluteTarget));
      await utils.writeFile(absoluteTarget, fileObj.body);
      filesCreated.push(absoluteTarget);
    }

    logger.info(`Successfully scaffolded index barrel.`);
    return {
      success: true,
      message: `Successfully scaffolded Citty command index barrel: ${variables.out}`,
      filesCreated
    };
  } catch (error: any) {
    logger.error(`Failed to scaffold Citty barrel: ${error.message}`);
    return {
      success: false,
      message: `Failed to scaffold Citty barrel: ${error.message}`
    };
  }
}

action({
  name: 'citty-barrel',
  description: 'Create a simple index barrel for command modules',
  category: 'cli',
  parameters: [
    {
      name: 'out',
      type: 'string',
      required: true,
      description: 'Output path for barrel index'
    }
  ]
})(cittyBarrel);
