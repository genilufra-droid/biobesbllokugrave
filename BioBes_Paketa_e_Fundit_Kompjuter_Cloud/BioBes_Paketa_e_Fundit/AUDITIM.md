# BioBes — auditimi i 11 nëntorit 2026

Ky dokument zëvendëson tre raportet e vjetra (`RAPORT_AUDITIMI.md`, `RAPORT_OCR_AUDITIMI.md`, `RAPORT_OCR_SHQIP.md`), të cilat përshkruanin degë dhe PR që nuk ekzistojnë më. Ato mbeten në historikun e Git.

## 1. Çfarë u gjet

| # | Gjetja | Rëndësia | Gjendja |
|---|---|---|---|
| 1 | Pesë skedarë të faqes (`app.js`, `cloud.js`, `index.html`, `reset-password.*`, 3,4 MB) ishin kopjuar edhe në rrënjën e paketës. Faqja publikohet vetëm nga `BioBes_Cloud/web/`, pra kopjet nuk përdoreshin dhe mund të mbeteshin pas pa u vënë re. | E lartë | **U fshinë** |
| 2 | Dy ekrane bënin të njëjtën punë: “Regjistro me 2 hapa” (1–10 formularë) dhe “Lexo formular” (1 formular). | E lartë për përdoruesin | **U bashkuan** në “Lexo formularë” |
| 3 | Word nuk lexohej fare. | E lartë | **U shtua** `.docx` (shih §3) |
| 4 | Ekrani i ngarkimit kërkonte dy zgjedhje grupimi dhe dy konfirmime para se të shihej butoni i ngarkimit. | Mesatare | **U thjeshtua** (shih §2) |
| 5 | Udhëzimet e leximit për Gemini nuk thoshin asgjë për shifrat që ngatërrohen në shkrimin me dorë, për shenjat e përsëritjes, për kolonat e tabelës dhe për dyshkronjëshat e shqipes. | E lartë për saktësinë | **U shtuan** në Edge Function; **kërkon deploy** |
| 6 | Dokumentacioni thoshte se Edge Function dhe baza nuk ishin vendosur. Në Supabase ato janë të vendosura: funksioni `biobes-read-form` (versioni 10, identik me kodin e repos para këtij auditimi) dhe tabelat `biobes_daily_*` me RLS. | Mesatare | Dokumentet u korrigjuan |
| 7 | Në Supabase janë aktive edhe tre funksione prove: `biobes-read-form-prove`, `biobes-ocr-diagnostike`, `biobes-ocr-shpejt-prove`. Kodi i tyre nuk është në repo. | Mesatare | **Nuk u prekën** — fshirja është e pakthyeshme dhe pret miratimin e pronarit |
| 8 | Historiku i migrimeve në Supabase është bosh: SQL-ja është ekzekutuar me dorë. Baza funksionon, por Supabase CLI nuk e di cili migrim është zbatuar. | E ulët | E hapur |
| 9 | `web/vercel.json` vendos kokat e sigurisë (CSP etj.) vetëm në Vercel. Faqja shërbehet nga GitHub Pages, ku këto koka nuk dërgohen. Projekti i vetëm në Vercel (`bio-bes-warehouse`) nuk është i lidhur me këtë repo. | Mesatare | E hapur |
| 10 | Konfirmimi “dokumentet nuk përmbajnë emra dhe firma” nuk mund të jetë i vërtetë për një formular të plotësuar me dorë, që ka emra punonjësish dhe firma. | Vendim i pronarit | E hapur (shih §5) |

## 2. Çfarë ndryshoi për përdoruesin

- Menuja ka një hyrje më pak. Rruga është: **Lexo formularë → zgjidh skedarët → Lexo formularët → kontrollo → ruaj.**
- Butoni i ngarkimit është gjëja e parë në ekran. Dy zgjedhjet e grupimit (foto dyshe / PDF me disa faqe) janë te “Si grupohen faqet”, të mbyllura si parazgjedhje, me të njëjtat vlera fillestare si më parë.
- Një konfirmim në vend të dyve. Teksti i tij përmban të dyja deklaratat (dokumente anonime; projekt Free Tier pa faturim), pra asgjë nuk është hequr nga ajo që përdoruesi deklaron. Shënimi i gjatë ligjor është te “Privatësia dhe kostot – lexo një herë”.
- Pranohen foto, PDF, Excel dhe Word (`.docx`, `.docm`, `.dotx`). Për `.doc`, `.rtf` dhe `.odt` del mesazhi “ruaje si .docx ose PDF”.

## 3. Çfarë ndryshoi për saktësinë e leximit

**Word.** Skedari hapet në pajisje. Paragrafët dhe tabelat kthehen në tekst sipas radhës së dokumentit; çdo rresht tabele mban numrin e pozicionit të vet (`RRESHTI 4: "3" | "2" | "1.250,5" | …`), edhe kur rreshtat bosh anashkalohen. Teksti i fshirë me “Track Changes” nuk merret. Fotot e futura në dokument (p.sh. një skanim i ngjitur në Word) dërgohen si imazhe bashkë me tekstin. Kufijtë janë ata të Excel-it: 12 MB, 12 foto, kontroll kundër arkivave të dëmtuara ose me fjalëkalim.

**Udhëzimet për Gemini** (Edge Function). U shtuan pa hequr asnjë rregull ekzistues:
- shifrat lexohen qelizë për qelizë; çiftet 1/7, 4/9, 3/8, 5/6, 0/6 që ngatërrohen shkojnë në `uncertain` me leximin e dytë;
- vlera e prishur dhe e rishkruar lexohet te e vlefshmja dhe shënohet; shenjat e përsëritjes nuk zëvendësohen me vlerën e rreshtit sipër; qeliza bosh nuk bëhet 0;
- rreshti gjendet nga numri i shtypur majtas; kolonat thasë / kg / ambalazh / shuma nuk zhvendosen;
- modeli i krahason rreshtat me totalin e shtypur dhe i rishikon shifrat e dyshimta, por nuk lejohet të ndryshojë një vlerë që totali të dalë;
- dyshkronjëshat e shqipes, `ë` dhe `ç`; katalogu përdoret vetëm si ndihmë drejtshkrimi.

**Çfarë nuk u ndryshua me qëllim.** Modelet (`gemini-3.6-flash`, pastaj `gemini-3.8-flash`), `temperature: 0` dhe `thinkingLevel: 'low'` mbetën si ishin. Niveli më i lartë i arsyetimit mund të rrisë saktësinë, por edhe kohën e përgjigjes brenda kufirit 130 s; pa matje me formularë realë nuk ka bazë për ta ndryshuar.

**Shtesë, 11 nëntor (dega e dytë): “Lexim i thelluar”.** Parazgjedhja mbetet `thinkingLevel: 'low'`. Një kuti e re te “Leximi me Gemini” e kërkon leximin me `high` vetëm për atë përpunim; Edge Function i jep modelit të parë 80 s (në vend të 55 s) dhe të dytit 45 s, brenda të njëjtit kufi 130 s. Koha e çdo leximi shfaqet te paralajmërimet e formularit dhe ruhet te “Shkarko leximin JSON” (`seconds`, `thinking`), që i njëjti formular të krahasohet në të dyja mënyrat. Nuk është provuar me Gemini real: nuk dihet ende sa fiton në saktësi dhe sa shpesh e kalon kohën. Kërkon deploy të ri të Edge Function; me funksionin e vjetër kutia nuk ka efekt.

**Korrigjim pas provës së parë me formular real (11 nëntor, dega e tretë).** Një formular i thjeshtë i shkruar me dorë doli gjysmak, dhe “Leximi i thelluar” e kaloi kohën. Shkaku i gjetur dhe i riprodhuar me test ishte në faqe, jo te Gemini: vlerat e lexuara hidheshin poshtë para se të arrinin në formular.
- Data ditë/muaj me të dyja numrat deri në 12 (p.sh. `11/11/2026`, pra çdo datë nga dita 1 deri më 12) lihej bosh; bashkë me të binin dita e javës dhe java. Tani lexohet si ditë/muaj, siç shkruhet në formular; paralajmërohet vetëm kur mund të lexohet në dy mënyra dhe në letër nuk ka ditë jave që ta vërtetojë.
- Orët e shkruara `7⁰⁰`, `7 00`, `700`, `7h`, `7` hidheshin poshtë; tani bëhen `07:00`.
- Numri me pikë pas (`300.`) hidhej poshtë; tani lexohet `300`. Vlerat me njësi (`125 kg`) vazhdojnë të refuzohen me paralajmërim.
- Kutia “Lexim i thelluar” u hoq nga faqja: në provën e vetme reale nuk mbaroi brenda kufirit. Më pas mbështetja u hoq edhe nga Edge Function.
- Testi i ri `handwritten_form.test.js` mban vlerat e atij formulari (me emra të trilluar). **Ende nuk dihet çfarë ktheu vetë Gemini** për atë foto; për këtë duhet skedari “Shkarko leximin JSON”.

**Korrigjim i dytë, 11 nëntor: leximi që kalonte kohën.** Pas korrigjimit të mësipërm, e njëjta foto dha “Leximi kaloi kohën”. Regjistri i Supabase tregoi një kërkesë që mbaroi me 504 pas rreth 71 sekondash dhe një riprovim të faqes që u ndërpre nga kufiri i saj prej 140 sekondash. Pra Gemini nuk u përgjigj brenda kohës që i jepte funksioni, dhe riprovimi nuk kishte më kohë të mjaftueshme. Pse Gemini vonoi nuk dihet: regjistri nuk e tregon.

Ndryshimet: (1) Edge Function e merr përgjigjen si rrjedhë (`streamGenerateContent`). Modeli i parë duhet të fillojë të përgjigjet brenda 40 sekondash; nëse hesht, kalohet te modeli i dytë, i cili ka pjesën tjetër të 125 sekondave. Një model që ka filluar të shkruajë nuk ndërpritet, veç kur hesht 30 sekonda ose përsërit të njëjtin tekst pa fund. (2) Nga udhëzimi u hoq kërkesa që modeli të krahasojë rreshtat me totalet dhe t'i rishohë; këtë kontroll e bën programi. (3) Kur leximi dështon, mesazhi tregon për secilin model çfarë ndodhi dhe sa sekonda zgjati; kur ia del, skedari JSON i leximit mban modelin dhe kohën. (4) Faqja nuk e përsërit më një lexim që mbaroi me 504. (5) Parametri `thinking: 'high'` u hoq edhe nga funksioni.

Kufizim: këto ndryshime u provuan vetëm me një Gemini të simuluar (`tests/edge_stream.test.js`). Nëse modeli vetë ka nevojë për më shumë se 125 sekonda për këtë foto, leximi do të dështojë përsëri, por mesazhi do të tregojë arsyen e saktë.

## 4. Çfarë u testua dhe çfarë jo

- `cd tests && npm ci && npm test` (Node 22.22): 74 teste plus kontrolli bazë, të gjitha kalojnë. 6 janë të reja (`word_import.test.js`).
- Edge Function u përkthye pa gabime dhe u provua me shërbime të simuluara: tekst Word → 200, tekst Excel → 200, tekst i lirë pa dokument → 400.
- **Nuk u testua:** leximi me Gemini real (asnjë dokument nuk u dërgua); ekrani i ri në një shfletues të vërtetë (testet përdorin jsdom); `tests/edge_function.test.ts` (Deno nuk ishte i disponueshëm); Playwright; printimi.
- **Saktësia reale e leximit nuk është matur as para, as pas.** Testet vërtetojnë përpunimin e përgjigjes, jo aftësinë e modelit për të lexuar shkrim dore. “Super e saktë” mund të thuhet vetëm pas matjes së pikës 1 më poshtë.

## 5. Hapat e radhës, sipas rëndësisë

1. **Matje me formularë realë.** 10–20 formularë të plotësuar (të anonimizuar), të regjistruar një herë me dorë si e vërteta, pastaj të lexuar nga sistemi: përqindja e fushave të sakta për foto, PDF, Word. Pa këtë, çdo ndryshim tjetër në OCR është hamendje.
2. **Deploy i Edge Function** (udhëzimet e reja dhe pranimi i Word-it). Deri atëherë Word-i refuzohet nga serveri me “Kërkesa e dokumentit nuk është e vlefshme”. Deploy-i bëhet para publikimit të faqes; funksioni i ri i pranon edhe kërkesat e faqes së vjetër.
3. **Fshirja e tre funksioneve prove** në Supabase (gjetja 7), pasi pronari të konfirmojë se nuk duhen.
4. **PDF-të e skanuara** dërgohen siç janë, pa përgatitjen që u bëhet fotove (drejtim, 2400 px, kontrast). Kthimi i faqeve në imazhe në pajisje kërkon shtimin e pdf.js (rreth 1 MB).
5. **Fushat e dyshimta nuk theksohen në formular.** Gemini i kthen te `uncertain`, por përdoruesi i sheh vetëm si listë paralajmërimesh sipër; një kornizë rreth fushës përkatëse do ta shpejtonte kontrollin.
6. **Koka CSP në GitHub Pages** (gjetja 9): ose `<meta http-equiv="Content-Security-Policy">` në `index.html`, ose kalimi i publikimit në Vercel. Kërkon provë në shfletues.
7. **Vendimi për privatësinë** (gjetja 10): ose punohet vërtet me kopje të anonimizuara, ose kalohet në një plan Gemini me pagesë, ku të dhënat nuk përdoren për trajnim, dhe ndryshohet teksti i konfirmimit.

## 6. Çfarë mbeti me dashje

- Dosjet `BioBes_Paketa_e_Fundit_Kompjuter_Cloud/BioBes_Paketa_e_Fundit/` nuk u sheshuan: workflow-i i Pages dhe ngarkimet me dorë në GitHub mbështeten te kjo rrugë.
- Në `app.js` dhe `cloud.js` mbetën disa degë `if(importState.review)` në rrugën e ruajtjes dhe të rikuperimit. Pas heqjes së ekranit të vjetër ato nuk ekzekutohen më; nuk u hoqën sepse prekin ruajtjen në cloud dhe nuk mund të provoheshin në shfletues.
- `tests/fixtures/ocr_baseline_app.js` është një kopje e ngrirë e `app.js` të vjetër, e përdorur nga një test krahasimi “para → pas”.
