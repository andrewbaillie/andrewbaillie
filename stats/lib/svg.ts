import { readFileSync, writeFileSync } from "fs";
import { RepoStats } from "../types";

export const buildSVG = (repoStats: RepoStats): void => {
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
};
