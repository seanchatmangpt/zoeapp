import { action } from 'hypergen/dist/actions/index.js';
import type { ActionContext, ActionResult } from 'hypergen/dist/actions/index.js';
import path from 'path';
import render from 'hypergen/dist/render.js';
import fs from 'fs';

export async function cittyArg(context: ActionContext): Promise<ActionResult> {
  const { variables, utils, logger } = context;
  const actionFolder = path.join(process.cwd(), '_templates', 'citty-arg');

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

      if (fileObj.attributes?.inject === 'true') {
        if (!fs.existsSync(absoluteTarget)) {
          logger.error(`Target command file not found for argument injection: ${absoluteTarget}`);
          continue;
        }

        const content = await fs.promises.readFile(absoluteTarget, 'utf8');
        const afterAnchor = fileObj.attributes.after;
        if (!content.includes(afterAnchor)) {
          logger.error(`Anchor string "${afterAnchor}" not found in command file: ${absoluteTarget}`);
          continue;
        }

        const patchedContent = content.replace(afterAnchor, `${afterAnchor}\n${fileObj.body.trimEnd()}`);
        await utils.writeFile(absoluteTarget, patchedContent);
        logger.info(`Injected argument "${variables.name}" definition into: ${absoluteTarget}`);
      }
    }

    return {
      success: true,
      message: `Successfully scaffolded Citty argument: ${variables.name}`
    };
  } catch (error: any) {
    logger.error(`Failed to scaffold Citty argument: ${error.message}`);
    return {
      success: false,
      message: `Failed to scaffold Citty argument: ${error.message}`
    };
  }
}

action({
  name: 'citty-arg',
  description: 'Insert an argument definition into a Citty command',
  category: 'cli',
  parameters: [
    {
      name: 'commandFile',
      type: 'string',
      required: true,
      description: 'Parent command file path containing // <citty-args>'
    },
    {
      name: 'name',
      type: 'string',
      required: true,
      description: 'Argument name'
    },
    {
      name: 'type',
      type: 'string',
      required: true,
      description: 'Argument type (positional | string | boolean | enum)'
    },
    {
      name: 'description',
      type: 'string',
      required: true,
      description: 'Argument description'
    },
    {
      name: 'required',
      type: 'boolean',
      required: false,
      description: 'Is argument required'
    },
    {
      name: 'defaultValue',
      type: 'string',
      required: false,
      description: 'Default value for argument'
    },
    {
      name: 'alias',
      type: 'string',
      required: false,
      description: 'Comma-separated aliases'
    },
    {
      name: 'valueHint',
      type: 'string',
      required: false,
      description: 'Hint for argument values'
    },
    {
      name: 'enumOptions',
      type: 'string',
      required: false,
      description: 'Comma-separated options for enum type'
    }
  ]
})(cittyArg);
