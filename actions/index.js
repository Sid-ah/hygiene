const { Octokit } = require("@octokit/rest");
const github = require("@actions/github");

require("dotenv").config();
const { env } = process;
const { sourceRepo, sourceRepoOwner } = env;
let auth = env.ADO_PERSONAL_ACCESS_TOKEN;

console.log("auth ", auth);
const octokit = new Octokit({ auth });

async function getIssues() {
  const options = octokit.issues.listForRepo.endpoint.merge({
    owner: sourceRepoOwner,
    repo: sourceRepo,
    state: "open",
  });

  const data = await octokit.paginate(options);

  console.log("data ", data);
}

getIssues();
