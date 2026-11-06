# BioBes — raport auditimi dhe verifikimi

**Data:** 5 nëntor 2026  
**Pikënisja:** skedarët e versionuar në depon GitHub `genilufra-droid/biobesbllokugrave`; ZIP-i i përmendur në bisedë nuk ishte i bashkëngjitur.  
**Kufiri i veprimit:** u ruajt një kopje ZIP e gjendjes fillestare para redaktimeve (`BioBes_original_baseline.zip`, SHA-256 `d76b1649f0fa2e7db962e3df66a75d87a18e31e1314610a097b535d5efad59a6`). Nuk u ekzekutua SQL, nuk u bë migrim/deploy dhe nuk u ndryshua asnjë projekt Supabase/Vercel.

## Gjetjet dhe korrigjimet

| ID | Ashpërsia | Gjetja | Veprimi |
|---|---|---|---|
| A-01 | E lartë | `cloud-config.js` përmbante URL dhe çelës publik të një projekti konkret si vlera parazgjedhje, megjithëse udhëzuesit e paraqesin cloud-in si të pakonfiguruar. Çelësi publishable nuk është sekret, por konfigurimi mund ta drejtonte përdoruesin te projekti i gabuar. | Hoq vlerat e projektit; URL-ja dhe çelësi janë bosh derisa administratori të zgjedhë projektin dhe t’i vendosë vetë. U përditësuan udhëzimet. |
| A-02 | E lartë | Workflow-i i GitHub Pages nisej automatikisht pas push-it në `main`, në kundërshtim me deklaratën se paketa është e papublikuar. | U hoq aktivizimi në `push`; publikimi mund të nisë vetëm me `workflow_dispatch`. Asnjë workflow nuk u nis gjatë auditimit. |
| A-03 | Mesatare | Manifesti SHA-256 përmendte një `.gitignore` që mungonte dhe hash-i i konfigurimit cloud nuk përputhej. | U shtua `.gitignore` për sekretet/skedarët lokalë dhe u rigjenerua manifesti për skedarët e paketës. Kontrolli i hash-eve kalon mbi paketën e dorëzuar. |
| A-04 | E ulët | Nuk kishte test regresioni të ekzekutueshëm për disa rregulla të rëndësishme numerike dhe për modelin bosh. | U shtua `tests/core_checks.js`, i ekzekutueshëm lokalisht pa rrjet me `node tests/core_checks.js`. |
| A-05 | Mesatare | Screenshot-i i prodhimit tregoi përgjigje `POST 502`; Edge Function kthente të njëjtin mesazh për çdo refuzim të Gemini, pa status diagnostik në log. | Shtova logim të kufizuar vetëm me HTTP status, provider status dhe provider code; përgjigjja dallon 401/403, 404, 400 dhe 429. Nuk regjistron çelës, prompt apo përmbajtje dokumenti. Duhet deploy i veçantë për ta parë në projektin live. |
| A-06 | Performancë | Leximi i PDF/Excel me Gemini ishte i ngadaltë: pauzë prej 13 sekondash mes kërkesave, procesim sekuencial dhe dublikim i leximit të PDF-ve. | Pauza u ul në 1 sekondë, grupet lexohen me 2 kërkesa njëkohësisht, përgatitja e skedarëve është paralele, PDF-të lexohen një herë me cache dhe Edge Function-i provon fallback modele Gemini në 503/404. Ndryshimi i Edge Function kërkon deploy manual. |

## Fusha të shqyrtuara

- Regjistrimi me dy hapa, kufiri deri në 10 formularë, grupimi dhe renditja e skedarëve, ndarja e PDF-ve, konfirmimi para ruajtjes dhe ruajtja e skedarëve private u shqyrtuan statikisht në kodin cloud.
- Excel-i i njohur si modeli i miratuar trajtohet lokalisht; kodi i rrjedhës së leximit e ndan këtë rrugë nga dërgimi i dokumenteve te Gemini. Njohja e modelit përdor fushat e pritura në fletë.
- U shqyrtuan rregullat e decimalëve, llogaritja e minutave, rrumbullakosja e totalit, numrat e formularëve, IndexedDB, konfliktet mes skedave dhe rrjedha e ruajtjes cloud me kontroll revision/idempotency. Kjo është rishikim kodi, jo provë e sjelljes në shfletues apo në shërbim real.
- SQL-i dhe Edge Function u shqyrtuan në nivel kodi: tabelat me RLS, mungesa e qasjes së drejtpërdrejtë të klientit, kontrolli i listës së përdoruesve, Storage privat, kufijtë e kërkesës dhe çelësi Gemini server-side. Nuk u ekzekutuan kundër një baze reale.
- Për privatësinë, ndërfaqja kërkon konfirmim që kopja e dërguar te Gemini është anonime dhe jokonfidenciale; kjo është deklarim i përdoruesit, jo anonimizim ose verifikim automatik nga aplikacioni. Origjinalet mund të zgjidhen veçmas për arkivim privat.

## Testet e kryera

1. `node --check` për `web/app.js`, `web/cloud.js`, `web/cloud-config.js` dhe `web/notification-sw.js` — kaluan.
2. `node tests/core_checks.js` — kontrollon presjen/pikën dhjetore, kohët e vlefshme dhe ndërrimin e ditës, shumën e minutave para rrumbullakosjes, rrumbullakosjen gjysmë ore lart, interpretimin e orëve Excel, strukturën e modelit XLSX (25 rreshta për secilën nga dy faqet e printimit) dhe kontrollet statike për diagnostikimin pa rrjedhje të payload-it. Kaloi.
3. `sha256sum -c SHA256SUMS.txt` nga rrënja e paketës — kaloi për skedarët e paketës, përfshirë skedarët e rinj.
4. Syntax check dhe provat e mësipërme janë testime lokale; nuk dërguan dokumente ose të dhëna te shërbime të jashtme.

## Test coverage (suite të reja)

- `tests/core_checks.js` — kontrolli bazë numerik dhe struktura e modelit.
- `tests/ai_record.test.js` — mapimi i përgjigjes Gemini, refuzimet dhe paralajmërimet.
- `tests/parse_ai_json.test.js` — parsing i JSON-it, `finishReason` dhe përgjigjet e prishura.
- `tests/batch_workbook.test.js` — Excel i miratuar, shumë formularë dhe kufiri i 10 grupeve.
- `tests/prepare_parts.test.js` — PDF >6 faqe, PDF/Excel inline data dhe udhëzimi i ekstraktimit.
- `tests/cloud_gemini.test.js` — retry 429/503/5xx, backoff, `Retry-After` dhe abort.
- `tests/security_checks.js` — asnjë `service_role`/`sb_secret_`/çelës Gemini në paketë; `verify_jwt=true`.
- `tests/performance_checks.js` — gap 1s, concurrency 2, cache PDF, retry 4, fallback modele dhe UI pa tabe.
- `tests/edge_function.test.ts` — opsional, kërkon Deno; mock `Deno.serve`/`fetch` për 401/400/503/502/200.
- `tests/ui.spec.js` — opsional, kërkon Playwright; kontrolli i ekranit të hyrjes dhe i formularit pa tabe.
- `tests/sql_checks.sql` — opsional, kërkon një projekt testues Supabase; RLS, bucket privat, politikat dhe kufijtë.

Për të ekzekutuar suitën Node:
```sh
cd BioBes_Paketa_e_Fundit_Kompjuter_Cloud/BioBes_Paketa_e_Fundit/tests
npm install
npm test
```

## Çfarë mbetet e patestuar / kërkon vendim

- Nuk u testua në Chromium/Chrome/Edge ose në telefon: nuk kishte mjedis shfletuesi në këtë sesion. Prandaj ndërveprimet reale, IndexedDB, BroadcastChannel, pamja responsive, ngarkimi, dialogs dhe printimi nuk janë konfirmuar nga UI.
- Nuk u bë test real me Supabase: autentikim, RLS, Storage, transaction rollback, konflikt, retry pas përgjigjeje të humbur, fshirje skedarësh, 429 dhe rikuperim kërkojnë projekt testues të zgjedhur e të konfiguruar nga pronari. Mos ekzekuto migrimin në projekt ekzistues pa miratim të veçantë.
- Nuk u bë test me Gemini ose verifikim i modelit të emërtuar nga funksioni; saktësia me shkrim dore, refuzimet, timeout dhe kuotat nuk u verifikuan. Mos e përdor në prodhim pa test sintetik dhe shqyrtim të rezultateve.
- Kushtet aktuale të Gemini, Free Tier, kostot dhe kufizimet sipas vendndodhjes nuk u verifikuan live në këtë auditim. Administratori duhet t’i kontrollojë në dokumentacionin/llogarinë e vet para çdo përdorimi; aplikacioni nuk mund të garantojë shërbim falas.
- Eksporti i gjeneruar PDF/Excel, faqosja A4 në Excel-in Microsoft dhe printimi në printer real nuk u ekzekutuan. U verifikua vetëm struktura e modelit bosh.
- Për të aktivizuar cloud-in, pronari duhet të zgjedhë projektin Supabase, ta konfigurojë manualisht `cloud-config.js`, të rishikojë SQL-in dhe hostimin. Çelësat sekretë nuk duhen dërguar në bisedë ose vendosur në Git.

## Vendime që i takojnë pronarit

1. Zgjidh nëse/kur dëshiron të përdorësh një projekt të ri apo ekzistues Supabase; mos e konfiguro pa verifikim.
2. Para publikimit të ardhshëm, kontrollo me vetëdije workflow-in manual të Pages dhe hostin/headers që do të përdoren.
3. Konfirmo përshtatshmërinë e Gemini për rajonin dhe llojin e përdorimit, përfshirë Free Tier dhe kushtet e privatësisë; nëse nuk përshtatet, mos e përdor.
