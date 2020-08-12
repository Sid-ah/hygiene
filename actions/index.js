const { Octokit } = require("@octokit/rest");
const github = require("@actions/github");

require("dotenv").config();
const { env } = process;
const owner = "bklynproject";
const repo = "soccer";
let auth = env.gh_token;

const octokit = new Octokit({ auth });

async function getIssues() {
  try {
    const options = octokit.issues.listForRepo.endpoint.merge({
      repo,
      owner,
      state: "open",
    });

    const openIssues = await octokit.paginate(options);
    const issueNumbers =
      openIssues.length > 0 ? openIssues.map((issue) => issue.number) : [];

    const q = `state:open+project:${owner}/${repo}/1`;
    const dataFromBoard = await octokit.search.issuesAndPullRequests({
      q,
    });
    const { items } = dataFromBoard.data;
    const issueNumbersFromBoards =
      items.length > 0 ? items.map((item) => item.number) : [];
    let temp = {};
    for (let number of issueNumbers) {
      if (!issueNumbersFromBoards.includes(number)) {
        temp[number] = false;
      } else {
        temp[number] = true;
      }
    }
    console.log("temp ", temp);
  } catch (err) {
    console.log("err ", err);
  }
}

getIssues();
