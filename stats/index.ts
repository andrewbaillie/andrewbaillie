import { Commit } from "@octokit/graphql-schema";
import { getRepoInfo } from "./lib/graphql";
import { getFilesInCommit } from "./lib/api";
import { buildSVG } from "./lib/svg";

import repoList from "./repoList.json";
import { RepoStats } from "./types";

const repoStats: RepoStats = {
  totalRepos: 0,
  totalCommits: 0,
  additions: 0,
  deletions: 0,
  totalFiles: 0,
  languages: {},
};

(async () => {
  await Promise.all(
    repoList.map(async (repo) => {
      const { owner, name, branch } = repo;
      const commitIds: string[] = [];

      // Get commits from last month
      const result = await getRepoInfo(owner, branch, name);

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

  buildSVG(repoStats);

  console.log("Done");
})();
