import { action } from 'hypergen/dist/actions/index.js';
import type { ActionContext, ActionResult } from 'hypergen/dist/actions/index.js';
import path from 'path';
import render from 'hypergen/dist/render.js';

export async function cittyWasmCommand(context: ActionContext): Promise<ActionResult> {
  const { variables, utils, logger } = context;
  const filesCreated: string[] = [];
  const actionFolder = path.join(process.cwd(), '_templates', 'citty-wasm-command');

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

    logger.info(`Successfully scaffolded ${filesCreated.length} Citty WASM command files.`);
    return {
      success: true,
      message: `Successfully scaffolded Citty WASM command: ${variables.exportName}`,
      filesCreated
    };
  } catch (error: any) {
    logger.error(`Failed to scaffold Citty WASM command: ${error.message}`);
    return {
      success: false,
      message: `Failed to scaffold Citty WASM command: ${error.message}`
    };
  }
}

action({
  name: 'citty-wasm-command',
  description: 'Create a reusable Citty command module backed by Truex WASM/OTEL',
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
      name: 'wasmEngineMethod',
      type: 'string',
      required: true,
      description: 'The exported WASM method to execute'
    }
  ]
})(cittyWasmCommand);
