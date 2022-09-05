import * as core from '@actions/core';
import * as github from '@actions/github';
import * as glob from "@actions/glob";
import { readFileSync } from 'fs';

interface Input {
  token: string;
  'include-gitignore': boolean;
  'ignore-default': boolean;
  'fail-if-not-covered': boolean;
}

export function getInputs(): Input {
  const result = {} as Input;
  result.token = core.getInput('github-token');
  result['include-gitignore'] = core.getBooleanInput('include-gitignore');
  result['ignore-default'] = core.getBooleanInput('ignore-default');
  result['fail-if-not-covered'] = core.getBooleanInput('fail-if-not-covered');
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

    let gitIgnoreFiles: string[] = [];
    try {
      const gitIgnoreBuffer = readFileSync('.gitignore', 'utf8');
      const gitIgnoreGlob = await glob.create(gitIgnoreBuffer);
      gitIgnoreFiles = await gitIgnoreGlob.glob();
      core.info(`.gitignore Files: ${gitIgnoreFiles.length}`);
    } catch (error) {
      core.info('No .gitignore file found');
    }
  
    let filesCovered = codeownersFiles;
    let allFilesClean = allFiles;
    if (input['include-gitignore'] === true) {
      allFilesClean = allFiles.filter(file => !gitIgnoreFiles.includes(file));
      filesCovered = filesCovered.filter(file => !gitIgnoreFiles.includes(file));
    }
    const coveragePercent = (filesCovered.length / allFilesClean.length) * 100;
    const coverageMessage = `${filesCovered.length}/${allFilesClean.length}(${coveragePercent.toFixed(2)}%) files covered by CODEOWNERS`;
    core.notice(coverageMessage, {
      title: 'Coverage',
      file: 'CODEOWNERS'
    });
    if (input['fail-if-not-covered'] === true && coveragePercent < 100) {
      core.setFailed(coverageMessage);
    }

    const filesNotCovered = allFilesClean.filter(f => !filesCovered.includes(f));
    core.info(`Files not covered: ${filesNotCovered.length}`);

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
