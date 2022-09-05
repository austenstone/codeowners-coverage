import * as core from '@actions/core';
import * as github from '@actions/github';
import * as glob from "@actions/glob";
import { readFileSync } from 'fs';

interface Input {
  token: string;
  'include-gitignore': boolean;
  'ignore-default': boolean;
}

export function getInputs(): Input {
  const result = {} as Input;
  result.token = core.getInput('github-token');
  result['include-gitignore'] = core.getBooleanInput('include-gitignore');
  result['ignore-default'] = core.getBooleanInput('ignore-default');
  return result;
}

const run = async (): Promise<void> => {
  try {
    const input = getInputs();
    const octokit: ReturnType<typeof github.getOctokit> = github.getOctokit(input.token);
    octokit.log.info('');

    const allFiles = await (await glob.create('*')).glob();
    core.info(`ALL Files: ${allFiles.length}`);

    const codeownersBuffer = readFileSync('CODEOWNERS', 'utf8');
    let codeownersBufferFiles = codeownersBuffer.split('\n').map(line => line.split(' ')[0]);
    if (input['ignore-default'] === true) {
      codeownersBufferFiles = codeownersBufferFiles.filter(file => file !== '*');
    }
    const codeownersGlob = await glob.create(codeownersBufferFiles.join('\n'));
    const codeownersFiles = await codeownersGlob.glob();
    core.info(`CODEOWNER Files: ${codeownersFiles.length}`);

    const gitIgnoreBuffer = readFileSync('.gitignore', 'utf8');
    const gitIgnoreGlob = await glob.create(gitIgnoreBuffer);
    const gitIgnoreFiles = await gitIgnoreGlob.glob();
    core.info(`.gitignore Files: ${gitIgnoreFiles.length}`);
  
    let filesCovered = codeownersFiles;
    let allFilesClean = allFiles;
    if (input['include-gitignore'] === true) {
      allFilesClean = allFiles.filter(file => !gitIgnoreFiles.includes(file));
      filesCovered = filesCovered.filter(file => !gitIgnoreFiles.includes(file));
    }

    const filesNotCovered = allFilesClean.filter(f => !filesCovered.includes(f));
    core.info(`Files not covered: ${filesNotCovered.length}`);

    const coveragePercent = (filesCovered.length / allFilesClean.length) * 100;
    core.notice(`CODEOWNERS coverage: ${coveragePercent.toFixed(2)}%`, {
      title: 'Coverage',
      file: './CODEOWNERS'
    });

    if (github.context.eventName === 'pull_request') {
      // const pr = github.context.payload.pull_request;
    }
  } catch (error) {
    core.startGroup(error instanceof Error ? error.message : JSON.stringify(error));
    core.info(JSON.stringify(error, null, 2));
    core.endGroup();
  }
};

export default run;
