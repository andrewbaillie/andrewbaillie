import { graphql } from "@octokit/graphql";
import { Commit, RepositoryNode } from "@octokit/graphql-schema";
import repoList from "./repoList.json";
import { Octokit } from "@octokit/core";

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
]);

interface Langauges {
  [key: string]: number;
}

interface RepoStats {
  totalCommits: number;
  additions: number;
  deletions: number;
  commitIds: string[];
  languages: Langauges;
}

const repoStats: RepoStats = {
  totalCommits: 0,
  additions: 0,
  deletions: 0,
  commitIds: [],
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

  const { owner, name, branch } = repoList[0];

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
    const target = result.repository.ref?.target as Commit;
    const nodes = target.history.nodes as Commit[];

    nodes.forEach((node) => {
      repoStats.totalCommits++;
      repoStats.additions += node.additions;
      repoStats.deletions += node.deletions;
      repoStats.commitIds.push(node.oid);
    });

    if (repoStats.commitIds) {
      const fileList = await Promise.all(
        repoStats.commitIds.map(async (commit) => {
          return await getFilesInCommit(owner, name, commit);
        })
      );

      const flatFileList = fileList.flat();

      for (let i = 0; i < flatFileList.length; i++) {
        repoStats.languages[flatFileList[i] as string] =
          repoStats.languages[flatFileList[i] as string] + 1 || 1;
      }
    }
  }

  console.log(repoStats);
})();
