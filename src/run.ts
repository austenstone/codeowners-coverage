import * as core from '@actions/core';
import * as github from '@actions/github';
import * as glob from "@actions/glob";
import { readFileSync } from 'fs';

interface Input {
  token: string;
}

export function getInputs(): Input {
  const result = {} as Input;
  result.token = core.getInput('github-token');
  return result;
}

const run = async (): Promise<void> => {
  try {
    const input = getInputs();
    const octokit: ReturnType<typeof github.getOctokit> = github.getOctokit(input.token);
    octokit.log.info('');

    const content = readFileSync('CODEOWNERS', 'utf8');
    // console.log('content', content);

    const allFiles = await (await glob.create('*')).glob();
    // core.info(`All Files: ${allFiles}`);

    const codeownerGlob = await glob.create(content);
    const filesCovered = await codeownerGlob.glob();
    core.info(`CODEOWNER Files: ${filesCovered.length}`);

    const filesNotCovered = allFiles.filter(f => !filesCovered.includes(f));
    core.warning(`Files not covered: ${filesNotCovered.length}`);

    const coveragePercent = (filesCovered.length / allFiles.length) * 100;
    core.info(`Files covered: ${Math.round(coveragePercent * 100) / 100}%`);
  } catch (error) {
    core.startGroup(error instanceof Error ? error.message : JSON.stringify(error));
    core.info(JSON.stringify(error, null, 2));
    core.endGroup();
  }
};

export default run;
