import { action } from 'hypergen/dist/actions/index.js';
import type { ActionContext, ActionResult } from 'hypergen/dist/actions/index.js';
import path from 'path';
// Import the compiled default render engine from Hypergen
import render from 'hypergen/dist/render.js';

export async function semantic(context: ActionContext): Promise<ActionResult> {
  const { variables, utils, logger } = context;
  const { name } = variables;

  logger.info(`Generating semantic assets for: ${name}`);

  const filesCreated: string[] = [];
  const actionFolder = path.join(process.cwd(), '_templates', 'semantic');

  try {
    // Invoke Hypergen's internal parser and EJS engine
    const rendered = await render(
      {
        actionFolder,
        name,
      },
      {}
    );

    for (const fileObj of rendered) {
      const targetPath = fileObj.attributes?.to;
      // Skip templates that don't output files (such as template.yml)
      if (!targetPath) {
        continue;
      }

      const absoluteTarget = path.isAbsolute(targetPath)
        ? targetPath
        : path.resolve(process.cwd(), targetPath);

      // Ensure target directory exists
      await utils.createDirectory(path.dirname(absoluteTarget));

      // Write output file
      await utils.writeFile(absoluteTarget, fileObj.body);
      filesCreated.push(absoluteTarget);
    }

    logger.info(`Successfully scaffolded ${filesCreated.length} semantic files for ${name}`);
    return {
      success: true,
      message: `Successfully scaffolded semantic class: ${name}`,
      filesCreated
    };
  } catch (error: any) {
    logger.error(`Failed to scaffold semantic class: ${error.message}`);
    return {
      success: false,
      message: `Failed to scaffold semantic class: ${error.message}`
    };
  }
}

// Manually apply the action decorator to register the function without parser errors
action({
  name: 'semantic',
  description: 'Scaffold W3C RDF / Schema.org class interfaces, hooks, database views, and Jest tests.',
  category: 'semantic',
  parameters: [
    {
      name: 'name',
      type: 'string',
      required: true,
      description: 'Schema.org class name (e.g. CreativeWork)',
      pattern: '^[A-Z][a-zA-Z0-9]*$'
    }
  ]
})(semantic);

