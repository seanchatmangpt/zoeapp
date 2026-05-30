#!/bin/bash
set -e

rm -f scripts/truex.next.ts scripts/cli/commands/doctor.ts scripts/cli/commands/wizard.ts scripts/cli/commands/telco.ts scripts/cli/commands/explain.ts scripts/cli/commands/truex.ts scripts/cli/commands/replay.ts scripts/cli/commands/pack.ts scripts/cli/commands/edge.ts scripts/cli/commands/smoke.ts scripts/cli/commands/supa.ts scripts/cli/smoke/lie-detector.ts

CMD_OPTS="--alias= --hidden=false --withArgs=false --withHooks=false --withPlugins=false --withSubcommands=false --withTest=false --lazySubcommands=true"
SMOKE_OPTS="--alias= --hidden=false --withArgs=false --withHooks=false --withPlugins=false --withSubcommands=true --withTest=false --lazySubcommands=true"

# Root command
npx hypergen action citty-root --name=truex --out=scripts/truex.next.ts --description="Truex operator CLI" --version="0.1.0" --lazy=true

# Subcommands
npx hypergen action citty-command --name=doctor --exportName=doctorCommand --out=scripts/cli/commands/doctor.ts --description="Doctor command" $CMD_OPTS
npx hypergen action citty-command --name=wizard --exportName=wizardCommand --out=scripts/cli/commands/wizard.ts --description="Wizard command" $CMD_OPTS
npx hypergen action citty-command --name=telco --exportName=telcoCommand --out=scripts/cli/commands/telco.ts --description="Telco command" $CMD_OPTS
npx hypergen action citty-command --name=explain --exportName=explainCommand --out=scripts/cli/commands/explain.ts --description="Explain command" $CMD_OPTS
npx hypergen action citty-command --name=truex --exportName=truexCommand --out=scripts/cli/commands/truex.ts --description="Truex command" $CMD_OPTS
npx hypergen action citty-command --name=replay --exportName=replayCommand --out=scripts/cli/commands/replay.ts --description="Replay command" $CMD_OPTS
npx hypergen action citty-command --name=pack --exportName=packCommand --out=scripts/cli/commands/pack.ts --description="Pack command" $CMD_OPTS
npx hypergen action citty-command --name=edge --exportName=edgeCommand --out=scripts/cli/commands/edge.ts --description="Edge command" $CMD_OPTS
npx hypergen action citty-command --name=smoke --exportName=smokeCommand --out=scripts/cli/commands/smoke.ts --description="Smoke command" $SMOKE_OPTS
npx hypergen action citty-command --name=supa --exportName=supaCommand --out=scripts/cli/commands/supa.ts --description="Supa command" $CMD_OPTS

# Add lie-detector to smoke
npx hypergen action citty-subcommand --parentFile=scripts/cli/commands/smoke.ts --childName=lie-detector --childExport=smokeLieDetectorCommand --childOut=scripts/cli/smoke/lie-detector.ts --description="Lie detector subcommand" --lazy=true

# Also add the top-level subcommands to the root command using citty-subcommand
for cmd in doctor wizard telco explain truex replay pack edge smoke supa; do
  npx hypergen action citty-subcommand --parentFile=scripts/truex.next.ts --childName=$cmd --childExport=${cmd}Command --childOut=scripts/cli/commands/${cmd}.ts --description="${cmd} command" --lazy=true
done

echo "Scaffolding complete!"
