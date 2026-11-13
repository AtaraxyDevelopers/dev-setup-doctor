#!/usr/bin/env node
import fs from 'node:fs/promises';
import { diagnose } from './doctor.mjs';
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log(
    'Usage: node src/cli.mjs [--config doctor.json] [--json]\nRun from the project root. Use node --env-file=.env src/cli.mjs to load a dotenv file.\nExit codes: 0 healthy, 1 failed checks, 2 invalid arguments/configuration.',
  );
} else {
  try {
    let file = 'doctor.json',
      asJSON = false;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--json') asJSON = true;
      else if (args[i] === '--config' && args[i + 1] && !args[i + 1].startsWith('--'))
        file = args[++i];
      else throw new Error('Unknown or incomplete argument. Use --help.');
    }
    let config;
    try {
      config = JSON.parse(await fs.readFile(file, 'utf8'));
    } catch {
      throw new Error(
        'Cannot read valid JSON configuration. Check --config and use examples/doctor.json as a starting point.',
      );
    }
    const result = await diagnose(config);
    if (asJSON) console.log(JSON.stringify(result, null, 2));
    else {
      for (const c of result.checks)
        console.log((c.ok ? 'PASS ' : 'FAIL ') + c.check + (c.fix ? '\n     ' + c.fix : ''));
      console.log(
        result.ok ? 'All configured checks passed.' : 'Resolve the failed checks and run again.',
      );
    }
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
