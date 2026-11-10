# BioBes — Blloku ditor në cloud

Ky është **versioni i vetëm dhe i fundit** i sistemit. Versioni i vjetër HTML për kompjuter (`BioBes_Kompjuter`) u hoq nga paketa sepse nuk merrte korrigjimet e fundit (pauza 13 s, leximi me tabe, pa cache PDF); ai mbetet vetëm në historikun e Git.

Gjendja aktuale: `web/cloud-config.js` përmban URL-në publike dhe çelësin `publishable` të projektit të zgjedhur, dhe faqja është publikuar në GitHub Pages (`https://genilufra-droid.github.io/biobesbllokugrave/`) me workflow-in manual **Manual BioBes Pages deployment**. Publikimi vazhdon të jetë vetëm manual — asnjë deploy automatik në `push`. Ky kontroll **nuk** ka ekzekutuar SQL, nuk ka krijuar llogari dhe **nuk** ka bërë deploy të Edge Function-it; këto kërkojnë identifikim të pronarit me Supabase CLI. Nuk ka asnjë çelës sekret në paketë.

## Çfarë përmban

- `web/` — faqja për t’u vendosur në një host HTTPS, me hyrje për një llogari.
- `supabase/migrations/20261104000000_biobes_daily.sql` — tabelat, funksionet dhe politikat e sigurisë.
- `supabase/authorize_owner.sql` — autorizon llogarinë e vetme pas krijimit të saj.
- `supabase/functions/biobes-read-form/index.ts` — leximi Gemini në server, pa çelës në faqe.
- `supabase/config.toml` — kërkon JWT për funksionin.

Regjistrimet dhe dokumentet origjinale mund të ruhen në Supabase privat; formulari dhe gjenerimi PDF/Excel përgatiten në shfletues. Excel-i, kur njihet si modeli i miratuar, interpretohet lokalisht. Foto, PDF dhe modele të tjera mund të lexohen nga Gemini përmes funksionit në server, vetëm si kopje vërtet të anonimizuara e jokonfidenciale, pas dy konfirmimeve. Çelësi Gemini qëndron vetëm në server, jo në HTML.

## Regjistrimi me dy hapa

1. Hyr në llogari dhe zgjidh **Regjistro me 2 hapa**. Ngarko foto, PDF ose Excel. Mund të përpunosh deri në 10 formularë. Për fotot zgjidh nëse një apo dy faqe përbëjnë një formular; për PDF zgjidh ndarjen në një ose dy faqe. Kontrollo grupet, renditjen dhe përmbajtjen e tyre.
2. Kur njihet si modeli i miratuar i BioBes, Excel-i lexohet lokalisht, edhe kur përmban disa fletë; ai nuk i dërgohet Gemini. Për formatet e tjera ose fotografitë/tekstin me dorë, Gemini mund të propozojë të dhëna, por saktësia nuk garantohet. Para leximit me Gemini, dokumentet duhet të jenë kopje të anonimizuara dhe jokonfidenciale dhe duhen shënuar të dy konfirmimet e privatësisë dhe Free Tier.
3. Nëse do të arkivosh veçmas origjinalet me të dhëna reale, përdor **Zgjidh origjinale private** te secili grup; vetëm kopjet e ngarkuara për lexim i dërgohen Gemini. Skedarët e zgjedhur veçmas si origjinale private nuk i dërgohen Gemini. Nëse nuk zgjedh origjinale të tjera, parazgjedhja është të ruhen dokumentet e ngarkuara për lexim — dhe këto mund t'i jenë dërguar Gemini.
4. Kontrollo çdo rezultat, plotëso lokalisht përgjegjësin dhe korrigjo numrat, emrat, tabelat dhe shkrimin me dorë. Konfirmo veçmas çdo formular; vetëm pastaj zgjidh ruajtjen. Asgjë nuk ruhet si regjistrim vetëm nga leximi. Formulat dhe raportet mbeten ato të modelit të miratuar me 25 rreshta dhe dy faqe A4.

Origjinalet ngarkohen në Storage privat gjatë ruajtjes, jo gjatë leximit. Regjistrimet e grupit ruhen bashkë me një operacion në bazën e të dhënave; ngarkimi i skedarëve dhe baza nuk janë një transaksion i përbashkët. Në rast gabimi, mbaji draftet dhe ndiq mesazhet e rikuperimit. Pas një ndërprerjeje të rëndë mund të mbeten skedarë të palidhur që administratori duhet t'i kontrollojë në Storage; mos fshi skedarë që lidhen me regjistrimet.

Kufiri i cloud-it është **12 MB për skedar dhe për grup dokumentesh ose origjinalesh**. Për një PDF të ndarë ruhet PDF-ja e plotë origjinale për secilin formular; për një Excel me shumë formularë ruhet një kopje për secilin. Kjo përdor më shumë hapësirë dhe secila kopje duhet të jetë brenda kufirit. Një draft i shkarkuar nuk përmban origjinalet; pasi ta rihapësh, përdor butonin në kontrollin e secilit formular për t'i zgjedhur sërish, pastaj rikonfirmo.

## Privatësia dhe kostot e Gemini

- **Aplikacioni nuk i anonimizon automatikisht dokumentet.** Hiq vërtet emrat, firmat, të dhënat personale dhe konfidenciale, përfshirë tekstin e fshehur dhe metadatat. Një mbulim i dukshëm me ngjyrë nuk mjafton domosdoshmërisht. Emrat teknikë të skedarëve/fletëve zëvendësohen, por përmbajtja mund të mbajë ende të dhëna personale.
- Sigurohu që projekti i çelësit Gemini në server është realisht **Free Tier, pa faturim të lidhur**. Aplikacioni nuk mund ta verifikojë planin, kuotën ose koston dhe nuk garanton shërbim falas apo pa kufizim. Supabase dhe Vercel kanë plane dhe kushte të veçanta, të cilat duhen kontrolluar gjithashtu.
- Google mund të përdorë ose të shqyrtojë të dhënat e dërguara në shërbimet falas. Në EEA, Zvicër dhe MB Google kërkon shërbime me pagesë kur aplikacionet API u ofrohen përdoruesve atje. Kontrollo [kushtet e Gemini](https://ai.google.dev/gemini-api/terms), [faturimin](https://ai.google.dev/gemini-api/docs/billing) dhe rregullat aktuale për vendndodhjen tënde para përdorimit. Nëse nuk plotësohen kushtet për falas, mos e përdor Gemini; Excel-i i modelit të miratuar vazhdon të lexohet lokalisht.
- Dokumentet private të arkivuara mbrohen nga rregullat e projektit të konfiguruar, por privatësia varet edhe nga administrimi i llogarive, konfigurimi dhe siguria e ofruesit. Mos ndaj çelësa sekretë në chat ose në faqe publike.

## Zgjedhja e projektit Supabase

**Rekomandimi:** përdor një projekt të ri Supabase për Bllokun Ditor nëse do ndarje më të qartë nga magazina, dhe nëse plani yt e lejon. Mund të përdoret edhe projekti ekzistues **Parcelat KO**, me objektet `biobes_daily_*` dhe një bucket të veçantë. Ky version nuk ndryshon tabelat e magazinës dhe nuk ndryshon konfigurimin global të regjistrimit; gjithsesi, kontrollo më parë politikat dhe bëj backup të projektit ekzistues. Në një projekt të përbashkët, kufizimet e tjera të Storage mund të pengojnë ngarkimin; një politikë kufizuese shtesë synon të mbrojë këtë bucket edhe nga politikat ekzistuese tepër të gjera. Administratorët e projektit dhe çdo shërbim me çelës `service_role` mund të aksesojnë të dhënat.

**Mos zbato SQL ose deploy në projektin ekzistues pa e zgjedhur dhe pa e verifikuar.** Projektet e reja, Storage, Gemini dhe hostimi mund të kenë kufizime ose kosto sipas planit dhe përdorimit.

**Projekti i zgjedhur nga pronari:** `abbgynbwfnrtemunyfzc`. `web/cloud-config.js` përmban URL-në publike të tij dhe çelësin `publishable` (asnjë sekret). Për hapat e deploy-it më poshtë përdor këtë referencë, derisa të vendosësh ndryshe.

## Vendosja, kur të jesh gati

1. **Rezervë.** Eksporto nga aplikacioni i vjetër një backup JSON dhe ruaje jashtë projektit. Nëse përdor një projekt Supabase ekzistues, bëj më parë backup dhe kontrollo emrat `biobes_daily_*` dhe bucket-in `biobes-daily-documents-private` që të mos përplasen me objekte ekzistuese.
2. **Skema.** Në Supabase Dashboard → SQL Editor të projektit të zgjedhur, ekzekuto përmbajtjen e `supabase/migrations/20261104000000_biobes_daily.sql` si një transaksion të vetëm (`begin;` para dhe `commit;` pas përmbajtjes); nëse ka gabim, bëj `rollback;`. Bucket-i duhet të mbetet **private**. Mos përdor `supabase db reset` mbi projektin ekzistues.
3. **Llogaria e vetme.** Në Supabase Auth → Users krijo një përdorues me email/fjalëkalim të fortë, ose përdor llogarinë tënde ekzistuese në atë projekt. Konfirmo emailin sipas konfigurimit të Auth. Zëvendëso `VENDOS_EMAILIN_TEND_KETU` te `supabase/authorize_owner.sql` me emailin e saktë dhe ekzekuto skedarin në SQL Editor. Nuk ka regjistrim publik nga kjo faqe. Mos e çaktivizo regjistrimin global të projektit të përbashkët pa kontrolluar aplikacionet e tjera.
4. **Funksioni Gemini.** Nga rrënja e projektit, me Supabase CLI të instaluar dhe të autentikuar, vendos referencën e projektit të zgjedhur dhe publiko vetëm këtë funksion:

   ```sh
   npx supabase@3.0.0 login
   npx supabase@3.0.0 functions deploy biobes-read-form --remote=abbgynbwfnrtemunyfzc --use-api
   ```

   Ky deploy **nuk është bërë** nga kontrolli i fundit: nuk ka `SUPABASE_ACCESS_TOKEN` në mjedis, prandaj kryhet nga pronari.

   Mos përdor `--prune`, sepse do të prekte funksione të tjera. Mbaje `verify_jwt = true`. Në Supabase Dashboard → Edge Functions → Secrets krijo **një herë** sekretin **`BIOBES_GEMINI_API_KEY`** me çelësin tënd Gemini. Serveri e merr automatikisht në çdo lexim; aplikacioni nuk ta kërkon përsëri. Ndrysho sekretin vetëm kur zëvendëson çelësin. Mos e vendos çelësin në HTML, `cloud-config.js`, Git, apo në bisedë. Funksioni përdor `SUPABASE_URL` dhe një çelës publik të ofruar nga mjedisi i Supabase; nuk përdor çelës `service_role`. Ai kontrollon token-in e përdoruesit dhe autorizimin BioBes. Kufiri fillestar është 30 kërkesa/orë dhe 150/ditë për llogarinë; ky nuk është kufi monetar. Për të provuar një model më të shpejtë, vendos një secret opsional **`BIOBES_GEMINI_MODEL`** me emrin e modelit ose një listë me presje (parazgjedhja: `gemini-3.8-flash,gemini-2.5-flash,gemini-2.0-flash`); funksioni provon modelet me radhë nëse kthen 503/404. Redeployo funksionin; mos e vendos çelësin API në këtë secret.
5. **Konfigurimi publik.** Te `web/cloud-config.js` vendos vetëm:

   ```js
   window.BIOBES_CLOUD_CONFIG = {
     supabaseUrl: 'https://REFERENCA_E_PROJEKTIT.supabase.co',
     supabasePublishableKey: 'CELLESI_PUBLIK_PUBLISHABLE_OSE_ANON'
   };
   ```

   URL-ja dhe çelësi `publishable`/`anon` janë publikë. **Mos përdor `service_role`, `sb_secret_` ose çelësin Gemini në faqe.** Konfigurimi aktual tashmë përmban projektin `abbgynbwfnrtemunyfzc`; mos e lidh me një projekt tjetër pa e zgjedhur dhe verifikuar. Kontrollo hash-et me `sha256sum -c SHA256SUMS.txt` nga rrënja e paketës; nëse ndryshon `cloud-config.js`, vetëm hash-i i atij skedari pritet të mos përputhet.
6. **Hostimi më vonë.** Publiko përmbajtjen e dosjes `web/` në një host statik me HTTPS, si aplikacion i veçantë; mos zëvendëso `bio-bes-warehouse` pa vendim të veçantë. `web/vercel.json` vendos header-a sigurie për Vercel; në host tjetër vendosi në atë host. Nëse përdor domain të personalizuar për Supabase, shtoje te `connect-src` në CSP. Plani aktual Vercel Hobby është për përdorim personal jokomercial; për përdorim biznesi kontrollo një plan të përshtatshëm ose një host tjetër.
7. **Kontroll real.** Hyr me llogarinë e autorizuar, provo një llogari tjetër që duhet të refuzohet, testo grupet me dy hapa, ruajtjen/shkarkimin privat, konfliktin nga dy skeda, PDF/Excel dhe dy faqet A4. Provo Gemini me një dokument sintetik ose vërtet të anonimizuar dhe një çelës të vlefshëm. Mos ngarko dokumente reale në Storage derisa këto kontrolle dhe lejet të kalojnë. Dokumentet reale me të dhëna personale nuk dërgohen te Gemini.
8. **Migrimi.** Në versionin e ri zgjidh **Importo backup / draft** dhe ngarko JSON-in nga aplikacioni i vjetër. Regjistrimet e reja shtohen pa zëvendësuar ato ekzistuese. Nëse një ID ose numër bie ndesh, importi ndalet pa ndryshuar të dhënat; zgjidhe konfliktin para se të vazhdosh.

## Përdorimi dhe ruajtja

- Te **Të dhënat bazë → Përgjegjëset** shto emrat një herë. Te formulari mund t’i zgjedhësh nga lista ose të shtosh një emër shpejt. Emrat janë pjesë e backup-it JSON; fshirja nga lista nuk ndryshon formularët e ruajtur.
- **Ruaj dhe i radhës** ruan formularin dhe hap një të ri me numrin pasues dhe të njëjtën datë. Për të përdorur këtë buton duhet zgjedhur ose shkruar përgjegjësja. As emrat, as sasitë, orët, firmat apo peshimet nuk kopjohen te formulari tjetër. Numri i formularëve në ditë nuk kufizohet.
- Hyrja është vetëm për llogarinë e autorizuar. Sesioni mbahet në `sessionStorage` të skedës, jo regjistrimet. Dil nga llogaria në pajisje të përbashkëta. Rivendosja e fjalëkalimit bëhet përmes Supabase Auth; kjo faqe nuk ka ende buton për të.
- Aplikacioni ngarkon regjistrimet e llogarisë në shfletues për listat dhe raportet; testo performancën nëse volumi rritet shumë. Pa internet, ndryshimet nuk ruhen. Gjatë një gabimi lidhjeje aplikacioni tregon nëse rezultati është i paqartë dhe lejon kontrollin e të njëjtës ruajtje, pa krijuar dublikatë. Ndryshimet konfliktuale nuk mbishkruhen automatikisht; drafti mund të shkarkohet dhe të rihapet si formular i ri.
- Kërkesat për Gemini në të njëjtën skedë ndahen me rreth 1 sekondë dhe grupet lexohen me deri në 2 kërkesa njëkohësisht; nëse shërbimi kthen 429, 503/UNAVAILABLE ose një gabim të përkohshëm, aplikacioni riprovon automatikisht deri në 4 herë me pritje në rritje (5s, 10s, 15s). Ky ritëm nuk garanton kuotë apo përdorim falas. Gjatë leximit shfaqen treguesi i përpunimit dhe koha e kaluar; kur përfundon ose dështon, shfaqet njoftim në aplikacion. Mund të aktivizosh edhe njoftimin në pajisje: kërkon HTTPS, lejen dhe mbështetjen e shfletuesit, dhe funksionon kur faqja është ende e hapur. Anulimi ndalon pritjen, por kërkesa që i është dërguar Google mund të vazhdojë dhe të ketë kosto.
- Leximi me Gemini lejohet vetëm për kopje të anonimizuara e jokonfidenciale, pas dy konfirmimeve, dhe e dërgon kopjen e leximit te Google. AI mund të gabojë në shkrim dore apo në modele të panjohura; të gjitha vlerat duhen kontrolluar dhe konfirmuar para ruajtjes. “Sasia” do të thotë **sasia e porositur nga klienti**, jo ajo e prodhuar.
- Dokumentet janë private, të lidhura me formularin dhe shkarkohen nga seksioni **Dokumentet origjinale**. Fshirja e formularit përpiqet të fshijë edhe skedarët; nëse pastrimi dështon, shfaqet paralajmërim për Storage.
- **Backup-i JSON dhe Excel-i i eksportuar përmbajnë të dhënat, jo skedarët origjinalë.** Shkarko dokumentet veçmas dhe organizo backup të Storage sipas nevojës. Nëse një JSON rikthehet, lidhjet me skedarët nuk rindërtohen automatikisht. Drafti JSON gjithashtu nuk përfshin dokumentet; rihapja e një drafti të grupit lejon zgjedhjen sërish të origjinaleve private për secilin formular.
- Sasitë dhe peshimet dhjetore pranojnë presje ose pikë, për shembull `12,5` ose `12.5`. Numri i thasëve dhe i ambalazheve duhet të jetë numër i plotë.
- Orët individuale ruhen me saktësi në minuta; vetëm totalet përfundimtare rrumbullakosen në orën më të afërt. PDF/Excel përdorin modelin e miratuar me 12 rreshta punonjësish, nga 25 rreshta peshash për faqe dhe pesë rreshta komentesh në pjesën e pasme.

## Gjendja e testimit

Testimet e mëparshme të projektit kanë përdorur shërbime të simuluara: ato nuk provojnë Supabase/Gemini real. Nga versionet në `tests/` ekzekutohet suite e plotë lokale pa rrjet:

```sh
cd ../tests
npm install
npm test
```

Të 49 testet Node kaluan (logjika numerike, leximi i Excel-it të miratuar, pjesët Gemini, retry/backoff, kontrollet e sigurisë dhe të performancës). `sha256sum -c SHA256SUMS.txt` kalon për paketën. Nuk u bënë: testimi Deno i `tests/edge_function.test.ts` (Deno nuk ishte i instaluar), testimet Playwright të `tests/ui.spec.js`, kontrollet SQL të `tests/sql_checks.sql` (kërkojnë një bazë testuesi) dhe deploy-i i Edge Function-it në `abbgynbwfnrtemunyfzc`. Faqja në GitHub Pages është publikuar, por ndryshimet e reja në `web/` kërkojnë një `workflow_dispatch` manual. Ndërveprimet e shfletuesit, printimi në Excel Microsoft dhe printimi në printerin tënd duhet kontrolluar veçmas. Shih `RAPORT_AUDITIMI.md` për fushat e patestuara.

Dokumentacion: [Supabase Storage dhe RLS](https://supabase.com/docs/guides/storage/security/access-control), [sekretet e Edge Functions](https://supabase.com/docs/guides/functions/secrets), [Vercel Hobby](https://vercel.com/docs/plans/hobby).
