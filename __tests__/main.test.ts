import * as process from 'process';
import * as cp from 'child_process';
import * as path from 'path';
import { test } from '@jest/globals';
import * as glob from '@actions/glob';

test('test run', () => {
  process.env['INPUT_GITHUB-TOKEN'] = process.env.GITHUB_TOKEN;
  const np = process.execPath;
  const ip = path.join(__dirname, '..', 'dist', 'index.js');
  const options: cp.ExecFileSyncOptions = {
    env: process.env,
  };
  console.log(cp.execFileSync(np, [ip], options).toString());
});

const CODEOWNERS = `
/src/ @austenstone
README.md @austenstone
/.github/workflows @austenstone
`
// test the glob pattern
test('test glob', async () => {
  const codeownersBuffer = CODEOWNERS;
  let codeownersBufferFiles = codeownersBuffer.split('\n').map(line => line.split(' ')[0]);
  codeownersBufferFiles = codeownersBufferFiles.map(file => file.replace(/^\//, ''));
  const globber = await glob.create(codeownersBufferFiles.join('\n'));
  const files = await globber.glob();
  console.log(files);
});