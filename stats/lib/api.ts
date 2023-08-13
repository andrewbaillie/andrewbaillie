import { Octokit } from "@octokit/core";

const octokit = new Octokit({
  auth: process.env.TOKEN,
});

const extensionRE = /(?:\.([^.]+))?$/;

const extensionList = new Map([
  ["ts", "TypeScript"],
  ["json", "JSON"],
  ["md", "MarkDown"],
  ["js", "JavaScript"],
  ["editorconfig", "Config"],
  ["eslintignore", "Other"],
  ["npmignore", "Other"],
  ["gitignore", "Other"],
  ["svg", "Other"],
  ["nvmrc", "Config"],
  ["prettierrc", "Config"],
  ["lintstagedrc", "Config"],
  ["github/CODEOWNERS", "Config"],
]);

export const getFilesInCommit = async (
  owner: string,
  repo: string,
  ref: string
) => {
  const commitInfo = await octokit.request(
    "GET /repos/{owner}/{repo}/commits/{ref}",
    {
      owner,
      repo,
      ref,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (commitInfo.status === 200) {
    return commitInfo.data.files
      ?.map((file) => {
        const extract = extensionRE.exec(file?.filename);
        const extension = extract?.length ? extract[1] : null;

        if (extension && extensionList.get(extension)) {
          return extensionList.get(extension);
        }

        return extension;
      })
      .filter(Boolean);
  }

  return [];
};
