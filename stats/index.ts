import { graphql } from "@octokit/graphql";
import { Commit, RepositoryNode } from "@octokit/graphql-schema";
import repoList from "./repoList.json";

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `Bearer ${process.env.TOKEN}`,
  },
});

interface Langauges {
  [key: string]: number;
}

interface RepoStats {
  totalCommits: number;
  additions: number;
  deletions: number;
  languages: Langauges;
}

const repoStats: RepoStats = {
  totalCommits: 0,
  additions: 0,
  deletions: 0,
  languages: {},
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
    });

    console.debug(repoStats);
  }
})();
