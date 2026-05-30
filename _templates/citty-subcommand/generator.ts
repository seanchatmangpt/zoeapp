import { action } from 'hypergen/dist/actions/index.js';
import type { ActionContext, ActionResult } from 'hypergen/dist/actions/index.js';
import path from 'path';
import render from 'hypergen/dist/render.js';
import fs from 'fs';

export async function cittySubcommand(context: ActionContext): Promise<ActionResult> {
  const { variables, utils, logger } = context;
  const filesCreated: string[] = [];
  const actionFolder = path.join(process.cwd(), '_templates', 'citty-subcommand');

  try {
    const relPathRaw = path.relative(path.dirname(variables.parentFile), path.dirname(variables.childOut));
    let relPath = path.join(relPathRaw, path.basename(variables.childOut, '.ts'));
    if (!relPath.startsWith('.')) relPath = './' + relPath;

    const rendered = await render(
      {
        actionFolder,
        relPath,
        ...variables,
      },
      {}
    );

    for (const fileObj of rendered) {
      const targetPath = fileObj.attributes?.to || fileObj.attributes?.target;
      if (!targetPath) continue;

      const absoluteTarget = path.isAbsolute(targetPath)
        ? targetPath
        : path.resolve(process.cwd(), targetPath);

      if (fileObj.attributes?.inject === 'true' || fileObj.attributes?.inject === true) {
        // Injection/patch logic
        if (!fs.existsSync(absoluteTarget)) {
          logger.error(`Parent target file not found for injection: ${absoluteTarget}`);
          continue;
        }

        const content = await fs.promises.readFile(absoluteTarget, 'utf8');
        const afterAnchor = fileObj.attributes.after;
        if (!content.includes(afterAnchor)) {
          logger.error(`Anchor string "${afterAnchor}" not found in parent file: ${absoluteTarget}`);
          continue;
        }

        const patchedContent = content.replace(afterAnchor, `${afterAnchor}\n${fileObj.body.trimEnd()}`);
        await utils.writeFile(absoluteTarget, patchedContent);
        logger.info(`Injected subcommand registration into: ${absoluteTarget}`);
      } else {
        // Normal file creation logic
        await utils.createDirectory(path.dirname(absoluteTarget));
        await utils.writeFile(absoluteTarget, fileObj.body);
        filesCreated.push(absoluteTarget);
      }
    }

    logger.info(`Successfully scaffolded subcommand ${variables.childName}.`);
    return {
      success: true,
      message: `Successfully scaffolded Citty subcommand: ${variables.childName}`,
      filesCreated
    };
  } catch (error: any) {
    logger.error(`Failed to scaffold Citty subcommand: ${error.message}`);
    return {
      success: false,
      message: `Failed to scaffold Citty subcommand: ${error.message}`
    };
  }
}

action({
  name: 'citty-subcommand',
  description: 'Add a subcommand to an existing Citty command module',
  category: 'cli',
  parameters: [
    {
      name: 'parentFile',
      type: 'string',
      required: true,
      description: 'Parent command file path containing // <citty-subcommands>'
    },
    {
      name: 'childName',
      type: 'string',
      required: true,
      description: 'Child command name in kebab-case',
      pattern: '^[a-z][a-z0-9-]*$'
    },
    {
      name: 'childExport',
      type: 'string',
      required: true,
      description: 'TypeScript export name for child command'
    },
    {
      name: 'childOut',
      type: 'string',
      required: true,
      description: 'Output path for child command module'
    },
    {
      name: 'description',
      type: 'string',
      required: true,
      description: 'Subcommand description'
    },
    {
      name: 'lazy',
      type: 'boolean',
      required: false,
      description: 'Use lazy subcommand imports'
    }
  ]
})(cittySubcommand);
