// import * as process from 'process';
// import * as cp from 'child_process';
// import * as path from 'path';
import { test } from '@jest/globals';
import { runAction } from '../src/run';
import * as github from '@actions/github';

// test('test run', () => {
//   process.env['INPUT_INCLUDE-GITIGNORE'] = 'false';
//   process.env['INPUT_IGNORE-DEFAULT'] = 'false';
//   process.env['INPUT_GITHUB-TOKEN'] = process.env.GITHUB_TOKEN;
//   const np = process.execPath;
//   const ip = path.join(__dirname, '..', 'dist', 'index.js');
//   const options: cp.ExecFileSyncOptions = {
//     env: process.env,
//   };
//   console.log(cp.execFileSync(np, [ip], options).toString());
// });

test('run action', async () => {
  const token = process.env.GITHUB_TOKEN || '';
  const octokit: ReturnType<typeof github.getOctokit> = github.getOctokit(token);
  return runAction(octokit, {
    token,
    'include-gitignore': false,
    'ignore-default': false,
    files: ''
  });
});