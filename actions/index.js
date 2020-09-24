const { Octokit } = require("@octokit/rest");
const github = require("@actions/github");
const moment = require("moment-timezone");
const { throttling } = require("@octokit/plugin-throttling");
const MyOctokit = Octokit.plugin(throttling);

// require("dotenv").config();
const { env } = process;
const owner = "Sid-ah";
const repo = "hygiene";
let auth = env.gh_token;

const octokit = new MyOctokit({
  auth,
  throttle: {
    onRateLimit: (retryAfter, options) => {
      octokit.log.warn(
        `Request quota exhausted for request ${options.method} ${options.url}`
      );

      if (options.request.retryCount === 0) {
        // only retries once
        console.log(`Retrying after ${retryAfter} seconds!`);
        return true;
      }
    },
    onAbuseLimit: (retryAfter, options) => {
      // does not retry, only logs a warning
      octokit.log.warn(
        `Abuse detected for request ${options.method} ${options.url}`
      );
    },
  },
});

async function getIssues() {
  try {
    const options = octokit.issues.listForRepo.endpoint.merge({
      repo,
      owner,
      state: "open",
    });

    const openIssues = await octokit.paginate(options);
    const refinedIssues =
      openIssues.length > 0
        ? openIssues.map((issue) => {
            return {
              number: issue.number,
              labels: issue.labels,
              author: issue.user.login,
              body: issue.body,
            };
          })
        : [];

    const q = `state:open+project:${owner}/${repo}/1`;
    const dataFromBoard = await octokit.search.issuesAndPullRequests({
      q,
    });
    console.log("dataFromBoard ", dataFromBoard);
    const { items } = dataFromBoard.data;
    const issueNumbersFromBoards =
      items.length > 0 ? items.map((item) => item.number) : [];
    let temp = {};
    for (let issue of refinedIssues) {
      const { number, labels, author, body } = issue;
      console.log("issueNumbersFromBoards ", issueNumbersFromBoards);
      console.log("number ", number);
      if (!issueNumbersFromBoards.includes(number)) {
        temp[number] = { inProject: false, labels, author, body };
      } else {
        temp[number] = { inProject: true, labels, author, body };
      }
    }
    return temp;
  } catch (err) {
    console.log("err ", err);
  }
}

function checkForPlans(labels) {
  if (
    !labels.includes("Internal only") &&
    !labels.includes("All Prods") &&
    !labels.includes("PRO") &&
    !labels.includes("Team") &&
    !labels.includes("GHEC") &&
    !labels.includes("GHES")
  ) {
    return "- Missing label for the plan (All Prods, PRO…)\n";
  } else {
    return "";
  }
}

function doesTierExist(labels) {
  if (
    !labels.includes("Changelog only") &&
    !labels.includes("Tier 1") &&
    !labels.includes("Tier 2") &&
    !labels.includes("Tier 3")
  ) {
    return false;
  } else {
    return true;
  }
}

function checkForReleasePhases(labels) {
  if (
    !labels.includes("Alpha") &&
    !labels.includes("Private Beta") &&
    !labels.includes("Limited Public Beta") &&
    !labels.includes("Public Beta") &&
    !labels.includes("GA") &&
    !labels.includes("Deprecation")
  ) {
    return "- Missing label for the release phase (Alpha, Beta…)\n";
  } else {
    return "";
  }
}

function checkForGHES(labels) {
  if (!labels.includes("GHES") && !labels.includes("GHES - NA")) {
    // return "- Missing 'GHES' or 'GHES - NA' label \n";
    return false
  } else if (labels.includes("GHES - NA")){
    // return "";
    return "skip"
  } else {
    return true
  }
}

function checkForGHESPhases(labels) {
  if (
    !labels.includes("GHES - Private Beta") &&
    !labels.includes("GHES - Public Beta") &&
    !labels.includes("GHES - GA")
  ) {
    // return "- Missing label for the GHES phase ('GHES - Private Beta'…)\n";
    return false 
  } else {
    // return "";
    return true
  }
}

function checkForGHESVersion(labels) {
  const arr = [];
  labels.forEach((label) => {
    const rex = /GHES 2.+/g;
    arr.push(rex.test(label));
  });
  if (checkForGHES(labels) === "skip") {
    return ""
  } else if (!arr.includes(true) && !checkForGHES(labels) && !checkForGHESPhases(labels)) {
    return "- Missigng label for GHES version (GHES 2.…) & label for GHES phase \n";
  } else if (!checkForGHESPhases(labels)) {
    return "- Missing label for the GHES release phase ('GHES - Private Beta'…)\n";
  } else {
    return ""
  }
}


function checkForIssuePresentInProjectBoard(issue) {
  if (issue["inProject"] === false) {
    return "- Issue missing from the project board\n";
  } else {
    return "";
  }
}

function openButShipped(labels) {
  if (labels.includes("shipped! :ship:")) {
    return "- issue still open while it has the label shipped\n";
  } else {
    return "";
  }
}

// async function checkOpenForMoreThan30days() {
//   const columns = await octokit.projects.listColumns({
//     project_id: 5168299,
//   });
//   const months = [
//     "January",
//     "February",
//     "March",
//     "April",
//     "June",
//     "July",
//     "August",
//     "September",
//     "October",
//     "November",
//     "December",
//   ];

//   const filteredColumns = columns.data.filter((column) => {
//     const firstWord = column.name ? column.name.split(" ")[0] : "";
//     if (months.includes(firstWord)) {
//       return column;
//     }
//   });
//   const openIssues = {}
//   // console.log("filteredColumns ", filteredColumns);
//   for (const column of filteredColumns) {
//     const { name, id } = column;
//     const startingTime = moment(name, "MMM YYYY");
//     // console.log("convert to moment startingTime ", startingTime);
//     const currentTime = moment();
//     // console.log("convert to moment currentTime ", currentTime);
//     const differenceInDays = currentTime.diff(startingTime, "days");
//     // console.log(differenceInDays);
//     if (differenceInDays > 30) {
//       const cardsResp = await octokit.projects.listCards({
//         column_id: id,
//       });
//       const cards = cardsResp.data;
//       for (const card of cards) {
//         const { content_url } = card;
//         const issueNumber = content_url.split("issues/")[1];
//         if (issueNumber) {
//           const respLabels = await octokit.issues.listLabelsOnIssue({
//             owner,
//             repo,
//             issue_number: issueNumber,
//           });
//           const labels = respLabels.data.map((label) => label.name);
//           if (labels.includes("Shipped! :ship:")) {
//             console.log("shipped and open for more than 30 days");
//             openIssues[issueNumber] = "- Shipped label applied while issue is still open for more than 30 days\n";
//           } else {
//             openIssues[issueNumber] = "";
//           }
//         }
//       };
//     }
//   };
//   return openIssues;
// }

async function postComment() {
  const issues = await getIssues();
  // const openForMoreThan30Days = await checkOpenForMoreThan30days();
  // console.log('openForMoreThan30Days', openForMoreThan30Days)
  Object.keys(issues).forEach(async (issueNumber) => {
    const issue = issues[issueNumber];
    const { labels, body } = issue;
    const labelsName = labels.map((label) => label.name);
    if (doesTierExist(labelsName)) {
      const first = checkForPlans(labelsName);
      const third = checkForReleasePhases(labelsName);
      const fourth = checkForGHESVersion(labelsName);
      const fifth = checkForIssuePresentInProjectBoard(issue);
      const sixth = openButShipped(labelsName);
      // notifyCustomerFeedback({
      //   body,
      //   labelsName,
      //   originalIssueNumber: issueNumber,
      // });
      const warnings =
        first +
        third +
        fourth +
        fifth +
        sixth 
  
      if (warnings.length > 0) {
  
        const message = `@${issue.author}, This release issue is missing some information that helps to categorize or define the timeframe for the ship.\n\n${warnings}
        `;
        console.log('the issue nummber is ' + issueNumber)
        console.log(message);
        // await octokit.issues.createComment({
        //   owner,
        //   repo,
        //   issue_number: issueNumber,
        //   body: message,w
        // });
      }
    }
  });
}

postComment();

// async function notifyCustomerFeedback({ body, labelsName }) {
//   try {
//     if (labelsName.includes("shipped! :ship:")) {
//       const rex = /https:\/\/github.com\/github\/customer-feedback\/issues\/[0-9]+/g;
//       const arr = rex.exec(body);
//       const str = arr ? arr[0] : "";
//       if (str.length > 0) {
//         const issueNumber = str.split(
//           "https://github.com/github/customer-feedback/issues/"
//         )[1];
//         console.log("about to create a comment in the customer feedback issue");
//         // octokit.issues.createComment({
//         //   owner: "",
//         //   repo: "",
//         //   issue_number: issueNumber,
//         //   body: `this feature has been shipped: ${owner}/${repo}/issues/${originalIssueNumber}`,
//         // });
//       }
//     }
//   } catch (err) {
//     console.log("err ", err);
//   }
// }
