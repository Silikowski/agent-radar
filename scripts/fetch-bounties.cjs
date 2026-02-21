// scripts/fetch-bounties.js
require('dotenv').config();
const { Octokit } = require('@octokit/rest');
const fs = require('fs');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function fetchBounties() {
  console.log('🌰 Hunting for bounties...');
  
  // Search for issues with "bounty" or "job" label in AI/Agent repos
  // Query: label:bounty OR label:job state:open topic:ai topic:agent sort:updated
  const query = 'label:bounty,job state:open topic:ai,agents sort:updated-desc';
  
  try {
    const { data } = await octokit.search.issuesAndPullRequests({
      q: query,
      per_page: 50, // Get top 50 recent
    });

    const bounties = data.items.map(item => ({
      title: item.title,
      url: item.html_url,
      repo: item.repository_url.replace('https://api.github.com/repos/', ''),
      labels: item.labels.map(l => l.name),
      body: item.body ? item.body.substring(0, 500) + '...' : '', // Truncate body
      created_at: item.created_at,
      author: item.user.login,
      // Attempt to extract price if in title/labels
      amount: extractAmount(item.title + ' ' + item.labels.map(l => l.name).join(' ')),
    }));

    console.log(`Found ${bounties.length} bounties.`);
    fs.writeFileSync('./data/raw_bounties.json', JSON.stringify(bounties, null, 2));
    
  } catch (error) {
    console.error('Error fetching bounties:', error);
    process.exit(1);
  }
}

function extractAmount(text) {
  const match = text.match(/\$(\d+(?:,\d{3})*)/);
  return match ? parseInt(match[1].replace(',', '')) : null;
}

fetchBounties();
