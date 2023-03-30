# CODEOWNERS Coverage Action

An [Action](https://docs.github.com/en/actions) that checks if files are covered by the [CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners) file.

## Usage
Create a workflow (eg: `.github/workflows/seat-count.yml`). See [Creating a Workflow file](https://help.github.com/en/articles/configuring-a-workflow#creating-a-workflow-file).

<!-- 
### PAT(Personal Access Token)

You will need to [create a PAT(Personal Access Token)](https://github.com/settings/tokens/new?scopes=admin:org) that has `admin:org` access.

Add this PAT as a secret so we can use it as input `github-token`, see [Creating encrypted secrets for a repository](https://docs.github.com/en/enterprise-cloud@latest/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-a-repository). 
### Organizations

If your organization has SAML enabled you must authorize the PAT, see [Authorizing a personal access token for use with SAML single sign-on](https://docs.github.com/en/enterprise-cloud@latest/authentication/authenticating-with-saml-single-sign-on/authorizing-a-personal-access-token-for-use-with-saml-single-sign-on).
-->

#### Example
```yml
name: CODEOWNERS
on:
  workflow_dispatch:

jobs:
  run:
    name: Run Action
    runs-on: ubuntu-latest
    steps:
      - uses: austenstone/codeowners-coverage@main
```

#### Example changed files in PR
Pass the files in to check only specific files. Combine with [tj-actions/changed-files](https://github.com/tj-actions/changed-files) to check only files changed.
```yml
name: CODEOWNERS
on:
  push:
  pull_request:

jobs:
  run:
    name: Check Coverage
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - id: changed-files
        uses: tj-actions/changed-files@v29.0.3
      - uses: austenstone/codeowners-coverage@main
        with:
          ignore-default: 'true'
          files: ${{ steps.changed-files.outputs.all_changed_files }}
```

## ➡️ Inputs
Various inputs are defined in [`action.yml`](action.yml):

| Name | Description | Default |
| --- | - | - |
| github&#x2011;token | Token to use to authorize. | ${{&nbsp;github.token&nbsp;}} |
| include-gitignore | Weither to filter our files in .gitignore | true |
| ignore-default | Weither to ignore the default rule `*` in CODEOWNERS file | false |
| files          | Filter check to only specific files | N/A
<!-- 
## ⬅️ Outputs
| Name | Description |
| --- | - |
| output | The output. |
-->

## Further help
To get more help on the Actions see [documentation](https://docs.github.com/en/actions).
