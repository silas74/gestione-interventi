const fs = require('fs');
const path = require('path');
const https = require('https');

// Legge il token passato come argomento o da variabile d'ambiente
const token = process.argv[2] || process.env.GITHUB_TOKEN;
const repoName = process.argv[3] || 'gestione-interventi';

if (!token) {
  console.error('\n❌ Errore: Manca il GitHub Personal Access Token.');
  console.log('Uso: node --use-system-ca deploy-github.cjs <IL_TUO_GITHUB_TOKEN> [nome-repo]\n');
  process.exit(1);
}

function githubRequest(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`https://api.github.com${endpoint}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'User-Agent': 'Antigravity-Deployer',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      }
    };

    if (data) {
      options.headers['Content-Type'] = 'application/json';
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject({ statusCode: res.statusCode, data: parsed });
          }
        } catch (e) {
          reject({ statusCode: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Funzione ricorsiva per raccogliere i file del progetto (esclude node_modules, .git, dist)
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    if (['node_modules', '.git', 'dist'].includes(file)) return;
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

async function run() {
  try {
    console.log('🔍 Verifica autenticazione utente GitHub...');
    const user = await githubRequest('/user');
    console.log(`✅ Autenticato con successo come: ${user.login} (${user.email || 'Email non pubblica'})`);

    console.log(`\n📦 Verifica esistenza repository '${repoName}'...`);
    let repoExists = false;
    try {
      await githubRequest(`/repos/${user.login}/${repoName}`);
      repoExists = true;
      console.log(`ℹ️ Repository '${repoName}' già esistente.`);
    } catch (e) {
      if (e.statusCode === 404) {
        console.log(`🚀 Creazione nuovo repository pubblico '${repoName}' su GitHub...`);
        await githubRequest('/user/repos', 'POST', {
          name: repoName,
          description: 'Gestione Interventi Tecnici On-Site - Ore Lavorate & Rapporti PDF',
          private: false,
          auto_init: true
        });
        console.log(`✅ Repository creato con successo!`);
        // Attendi 2 secondi per l'inizializzazione
        await new Promise(r => setTimeout(r, 2000));
      } else {
        throw e;
      }
    }

    // Elenco file da caricare
    const projectRoot = __dirname;
    const files = getAllFiles(projectRoot);
    console.log(`\n📤 Caricamento di ${files.length} file del progetto su GitHub...`);

    for (const filePath of files) {
      const relativePath = path.relative(projectRoot, filePath).replace(/\\/g, '/');
      const content = fs.readFileSync(filePath).toString('base64');

      // Verifica se il file esiste già per recuperare il SHA
      let sha = undefined;
      try {
        const existing = await githubRequest(`/repos/${user.login}/${repoName}/contents/${relativePath}`);
        sha = existing.sha;
      } catch (err) {
        // Il file non esiste ancora, sha resta undefined
      }

      await githubRequest(`/repos/${user.login}/${repoName}/contents/${relativePath}`, 'PUT', {
        message: `Sync file: ${relativePath}`,
        content: content,
        sha: sha
      });

      console.log(`  ✓ Caricato: ${relativePath}`);
    }

    console.log('\n🎉 COMPLIMENTI! Tutti i file sono stati caricati su GitHub!');
    console.log(`🔗 Link repository: https://github.com/${user.login}/${repoName}`);

  } catch (err) {
    console.error('\n❌ Errore durante l\'operazione:', err);
  }
}

run();
