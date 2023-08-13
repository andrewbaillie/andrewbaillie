# Stats

This is a quick, simple script to get some stats from your repos, I've used it to generate a SVG for my Github homepage.

## Requirements

- A Personal Access Token scoped to read `user` and `repo` options, see [this guide](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-personal-access-token-classic)
- Your Github User ID, one way to do this is using the [Github GraphQL Explorer](https://docs.github.com/en/graphql/overview/explorer) with the following query:

```
query {
  viewer {
    id
  }
}
```

- A list of repos you want to gather stats from, this is an array of javascript objects in a file named `repoList.json`.

```json
[
  {
    "name": "my-repo-name",
    "owner": "repo-owner",
    "branch": "primary-branch-name"
  }
]
```

### Setup

Run `npm install` from this directory to install the required packages.

### Running

To gather your stats run the following command:

```bash
❯ TOKEN=<your github pat> AUTHORID=<your github user id> npm start
```
