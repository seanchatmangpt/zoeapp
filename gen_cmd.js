const fs = require('fs');

const content = `const { execSync } = require('child_process');
const repoPath = '/Users/sac/process-intelligence';
try {
  const log = execSync('git -C ' + repoPath + ' log --reverse --pretty=format:"%H|%an|%ad|%s" --date=iso', { encoding: 'utf-8' });
  const commits = log.trim().split('\\n').filter(Boolean).map(line => {
      const [hash, author, date, message] = line.split('|');
      return { hash, author, date, message };
  });
  
  const events = commits.map((commit, i) => ({
      "ocel:activity": "Git Commit",
      "ocel:timestamp": new Date(commit.date).toISOString(),
      "ocel:vmap": { hash: commit.hash, author: commit.author, message: commit.message },
      "ocel:omap": [commit.author]
  }));

  (async function stream() {
      for (const e of events) {
          console.log(JSON.stringify(e));
          await new Promise(r => setTimeout(r, 100));
      }
  })();
} catch (e) {
  console.error("Error: ", e.message);
}`;

const b64 = Buffer.from(content).toString('base64');
const cmd = `node -e "const fs=require('fs'); fs.mkdirSync('/Users/sac/process-intelligence/livestream', {recursive:true}); fs.writeFileSync('/Users/sac/process-intelligence/livestream/aalst_broadcaster.js', Buffer.from('${b64}', 'base64').toString('utf8'));"`;

fs.writeFileSync('/Users/sac/zoeapp/exec_cmd.sh', cmd);
