const { Octokit } = require("@octokit/rest");
const github = require("@actions/github");

// require("dotenv").config();
const { env } = process;
const owner = "Sid-ah";
const repo = "hygiene";
let auth = env.gh_token;

console.log("auth ", auth);
const octokit = new Octokit({ auth });

async function getIssues() {
  try {
    const options = octokit.issues.listForRepo.endpoint.merge({
      owner,
      repo,
      state: "open",
    });

    const data = await octokit.paginate(options);

    console.log("data ", data);
  } catch (err) {
    console.log("err ", err);
  }
}

getIssues();
