# Gestione Interventi On-Site & Assistenza Tecnica

Applicazione web moderna per la gestione completa degli interventi tecnici sul posto, tracciamento delle ore lavorate, generazione automatica di rapporti tecnici in formato PDF e gestione dei riscontri da parte dei richiedenti/clienti.

---

## 🌟 Funzionalità Principali

### 1. 👷‍♂️ Modalità Tecnico Manutentore
- **Presa in Carico**: accetta e pianifica gli interventi assegnandoli a sé stessi (es. Costantino, Franco, ecc.).
- **Tracciamento Ore Lavorate**: inserimento preciso dei tempi di lavoro on-site.
- **Rapporto Esecuzione Tecnica**: registrazione dettagliata dei lavori svolti, componenti sostituiti, tarature e raccomandazioni.
- **Rapporto PDF Automatico**: generazione immediata di un documento formattato ad alta risoluzione pronto per la stampa, firma e archiviazione.

### 2. 👤 Modalità Richiedente / Cliente
- **Invio Nuova Richiesta**:
  - Oggetto del guasto o lavoro richiesto
  - Stabilimento / Sede e indirizzo
  - Nome referente e recapito telefonico
  - Data e orario desiderati di accesso
  - Priorità (Bassa, Media, Alta, Urgente)
  - Caricamento immagini e foto del difetto con preview
  - Note aggiuntive (DPI, citofoni, autorizzazioni)
- **Verifica Stato Avanzamento**: monitoraggio in tempo reale (Da Pianificare, In Corso, Completato).
- **Download PDF**: possibilità di scaricare il verbale tecnico redatto dal manutentore.
- **Risposta & Riscontro Finale**: approvazione dell'intervento, valutazione a stelle (1-5) e note post-lavoro.

---

## 🚀 Avvio Locale

1. **Installazione dipendenze**:
   ```bash
   npm install --strict-ssl=false
   ```

2. **Avvio server di sviluppo**:
   ```bash
   npm run dev
   ```
   L'applicazione sarà accessibile all'indirizzo `http://localhost:3001`.

3. **Compilazione per Produzione**:
   ```bash
   npm run build
   ```

---

## ☁️ Configurazione Supabase (Opzionale)

L'applicazione include già la sincronizzazione con Supabase e un fallback automatico su memoria locale protetta.
Se desideri creare la tabella nel database Supabase:
1. Apri la console del tuo progetto Supabase (SQL Editor).
2. Esegui lo script contenuto nel file `supabase_schema.sql`.

---

## 🐙 Pubblicazione su GitHub & GitHub Pages

È già incluso il file di automazione `.github/workflows/deploy.yml`:
1. Crea un nuovo repository sul tuo profilo GitHub (es. `interventi-tech`).
2. Esegui nel terminale in questa cartella:
   ```bash
   git init
   git add .
   git commit -m "Primo rilascio Gestione Interventi On-Site"
   git branch -M main
   git remote add origin https://github.com/<TUO_UTENTE>/interventi-tech.git
   git push -u origin main
   ```
3. Nelle impostazioni del repository su GitHub (**Settings -> Pages**), sotto **Build and deployment**, seleziona **Source: GitHub Actions**.
4. Il sito verrà automaticamente compilato e pubblicato online gratis, senza usare Netlify!
