import * as core from '@actions/core';
import * as github from '@actions/github';
import * as glob from "@actions/glob";
import { readFileSync } from 'fs';

interface Input {
  token: string;
  'include-gitignore': boolean;
  'ignore-default': boolean;
  files: string;
}

export function getInputs(): Input {
  const result = {} as Input;
  result.token = core.getInput('github-token');
  result['include-gitignore'] = core.getBooleanInput('include-gitignore');
  result['ignore-default'] = core.getBooleanInput('ignore-default');
  result.files = core.getInput('files');
  return result;
}

const run = async (): Promise<void> => {
  try {
    const input = getInputs();
    const octokit: ReturnType<typeof github.getOctokit> = github.getOctokit(input.token);

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
    core.notice(coverageMessage, {
      title: 'Coverage',
      file: 'CODEOWNERS'
    });

    const filesNotCovered = allFilesClean.filter(f => !filesCovered.includes(f));
    core.info(`Files not covered: ${filesNotCovered.length}`);

    if (github.context.eventName === 'pull_request') {
      const checkResponse = await octokit.rest.checks.create({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        name: 'Changed Files have CODEOWNERS',
        head_sha: github.context.payload.pull_request?.head.sha || github.context.payload.after || github.context.sha,
        status: 'completed',
        completed_at: new Date(),
        output: {
          title: 'PR Next Version publish successful!',
          summary: `A version for pull request is **published**. version: **${process.env.CURRENT_VERSION}**`,
          annotations: filesNotCovered.map(file => ({
            path: file,
            annotation_level: 'failure',
            message: 'File not covered by CODEOWNERS',
            start_line: 0,
            end_line: 1,
          })).slice(0, 50),
        },
        conclusion: coveragePercent < 100 ? 'failure' : 'success',
      });
      console.log('checkResponse', JSON.stringify(checkResponse, null, 2));
    }
  } catch (error) {
    core.startGroup(error instanceof Error ? error.message : JSON.stringify(error));
    core.info(JSON.stringify(error, null, 2));
    core.endGroup();
  }
};

export default run;
