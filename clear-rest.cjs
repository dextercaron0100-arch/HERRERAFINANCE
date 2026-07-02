const fs = require('fs');

async function run() {
  const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
  const projectId = config.projectId;
  const dbId = config.firestoreDatabaseId || '(default)';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/appData/master`;

  console.log(`Deleting ${url}`);
  const res = await fetch(url, { method: 'DELETE' });
  console.log(res.status, res.statusText);
  const text = await res.text();
  console.log(text);
}

run().catch(console.error);
