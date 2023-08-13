import { graphql } from "@octokit/graphql";
import { RepositoryNode } from "@octokit/graphql-schema";

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `Bearer ${process.env.TOKEN}`,
  },
});

const date = new Date();
date.setMonth(date.getMonth() - 1);

export const getRepoInfo = async (
  owner: string,
  branch: string,
  name: string
): Promise<RepositoryNode> => {
  return await graphqlWithAuth(
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
};
