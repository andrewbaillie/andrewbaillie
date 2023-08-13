interface Langauges {
  [key: string]: number;
}

export interface RepoStats {
  totalRepos: number;
  totalCommits: number;
  additions: number;
  deletions: number;
  totalFiles: number;
  languages: Langauges;
}
