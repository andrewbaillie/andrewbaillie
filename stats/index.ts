import { Octokit } from "@octokit/core";
import { graphql } from "@octokit/graphql";
import { Commit, RepositoryNode } from "@octokit/graphql-schema";
import { readFileSync, writeFileSync } from "fs";
import repoList from "./repoList.json";

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `Bearer ${process.env.TOKEN}`,
  },
});

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
  ["eslintignore", "Ignore"],
  ["npmignore", "Ignore"],
  ["gitignore", "Ignore"],
  ["nvmrc", "Config"],
  ["prettierrc", "Config"],
  ["lintstagedrc", "Config"],
  ["github/CODEOWNERS", "Config"],
]);

interface Langauges {
  [key: string]: number;
}

interface RepoStats {
  totalRepos: number;
  totalCommits: number;
  additions: number;
  deletions: number;
  totalFiles: number;
  languages: Langauges;
}

const repoStats: RepoStats = {
  totalRepos: 0,
  totalCommits: 0,
  additions: 0,
  deletions: 0,
  totalFiles: 0,
  languages: {},
};

const getFilesInCommit = async (owner: string, repo: string, ref: string) => {
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

(async () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);

  // Get commits from last month
  await Promise.all(
    repoList.map(async (repo) => {
      const { owner, name, branch } = repo;
      const commitIds: string[] = [];

      const result: RepositoryNode = await graphqlWithAuth(
        `
    query repoStats($name: String!, $owner: String!, $branch: String!, $since: GitTimestamp!, $authorId: ID!) {
      repository(name: $name, owner: $owner) {
        ref(qualifiedName: $branch) {
          target {
            ... on Commit {
              history(first: 100, since: $since, author: {id: $authorId}) {
                totalCount
                pageInfo {
                  hasNextPage
                  endCursor
                }
                nodes {
                  oid
                  additions
                  deletions
                }
              }
            }
          }
        }
      }
    }
  `,
        {
          owner,
          branch,
          name,
          since: date.toISOString(),
          authorId: process.env.AUTHORID,
        }
      );

      if (result) {
        repoStats.totalRepos++;
        const target = result.repository.ref?.target as Commit;
        const nodes = target.history.nodes as Commit[];

        nodes.forEach((node) => {
          repoStats.totalCommits++;
          repoStats.additions += node.additions;
          repoStats.deletions += node.deletions;
          commitIds.push(node.oid);
        });

        // Use commit ids to retrieve file extensions and map to type
        if (commitIds) {
          const fileList = await Promise.all(
            commitIds.map(async (commit) => {
              return await getFilesInCommit(owner, name, commit);
            })
          );

          const flatFileList = fileList.flat();

          for (let i = 0; i < flatFileList.length; i++) {
            repoStats.totalFiles++;
            repoStats.languages[flatFileList[i] as string] =
              repoStats.languages[flatFileList[i] as string] + 1 || 1;
          }
        }
      }
    })
  );

  console.log(repoStats);

  // Generate SVG
  let svg = readFileSync("./template.svg").toString();
  let languageList = "";
  let yPos = 57;
  let index = 0;
  const colours = ["005F73", "94D2BD", "E9D8A6", "CA6702", "AE2012", "9B2226"];

  const sortedList = Object.entries(repoStats.languages).sort(
    ([, a], [, b]) => b - a
  );

  for (const [lang, count] of Object.entries(repoStats.languages)) {
    languageList += `
    <g transform="translate(415, ${yPos})">
        <text x="0" y="12.5">${lang}</text>
        <line class="bar" x1="87" y1="8" x2="${(
          93 +
          (224 * count) / sortedList[0][1]
        ).toFixed(1)}" y2="8" stroke="#${colours[index]}" />
        <text x="382" y="12.5" text-anchor="end">${(
          (count / repoStats.totalFiles) *
          100
        ).toFixed(1)}%</text>
    </g>
    `;

    yPos += 24;
    index++;
  }

  svg = svg
    .replace("{TOTALCOMMITS}", repoStats.totalCommits.toString())
    .replace("{TOTALADDITIONS}", repoStats.additions.toString())
    .replace("{TOTALDELETIONS}", repoStats.deletions.toString())
    .replace("{TOTALREPOS}", repoStats.totalRepos.toString())
    .replace("{LANGUAGELIST}", languageList);

  writeFileSync("./output.svg", svg);

  console.log("Done");
})();
