import * as core from '@actions/core';
import * as github from '@actions/github';
import * as glob from "@actions/glob";
import { readFileSync } from 'fs';

interface Input {
  token: string;
  'include-gitignore': boolean;
  'ignore-default': boolean;
  'fail-if-not-covered': boolean;
  files: string;
}

export function getInputs(): Input {
  const result = {} as Input;
  result.token = core.getInput('github-token');
  result['include-gitignore'] = core.getBooleanInput('include-gitignore');
  result['ignore-default'] = core.getBooleanInput('ignore-default');
  result['fail-if-not-covered'] = core.getBooleanInput('fail-if-not-covered');
  result.files = core.getInput('files');
  return result;
}

const run = async (): Promise<void> => {
  try {
    const input = getInputs();
    const octokit: ReturnType<typeof github.getOctokit> = github.getOctokit(input.token);
    octokit.log.info('');

    let allFiles: string[] = [];
    if (input.files) {
      allFiles = input.files.split(' ');
    } else {
      allFiles = await (await glob.create('*')).glob();
    }
    core.info(`ALL Files: ${allFiles.length}`);

    const codeownersBuffer = readFileSync('CODEOWNERS', 'utf8');
    let codeownersBufferFiles = codeownersBuffer.split('\n').map(line => line.split(' ')[0]);
    if (input['ignore-default'] === true) {
      codeownersBufferFiles = codeownersBufferFiles.filter(file => file !== '*');
    }
    const codeownersGlob = await glob.create(codeownersBufferFiles.join('\n'));
    let codeownersFiles = await codeownersGlob.glob();
    codeownersFiles = codeownersFiles.filter(file => allFiles.includes(file));
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
    if (input.files) {
      filesCovered = filesCovered.filter(file => allFilesClean.includes(file));
    }
    const coveragePercent = (filesCovered.length / allFilesClean.length) * 100;
    const coverageMessage = `${filesCovered.length}/${allFilesClean.length}(${coveragePercent.toFixed(2)}%) files covered by CODEOWNERS`;
    (input['fail-if-not-covered'] === true && coveragePercent < 100 ?
      core.setFailed : core.notice
    )(coverageMessage, {
      title: 'Coverage',
      file: 'CODEOWNERS'
    });

    const filesNotCovered = allFilesClean.filter(f => !filesCovered.includes(f));
    core.info(`Files not covered: ${filesNotCovered.length}`);

    if (github.context.eventName === 'pull_request') {
      console.log('pr', JSON.stringify(github.context, null, 2));

      await octokit.rest.checks.update({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        status: 'completed',
        completed_at: new Date(),
        conclusion: 'success',
        check_run_id: github.context.runId,
        output: {
          title: 'PR Next Version publish successful!',
          summary: `A version for pull request is **published**. version: **${process.env.CURRENT_VERSION}**`,
        },
      });
      // const pr = github.context.payload.pull_request;
    }


  } catch (error) {
    core.startGroup(error instanceof Error ? error.message : JSON.stringify(error));
    core.info(JSON.stringify(error, null, 2));
    core.endGroup();
  }
};

export default run;
