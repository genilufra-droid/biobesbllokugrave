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
- Kutia “Lexim i thelluar” u hoq nga faqja: në provën e vetme reale nuk mbaroi brenda kufirit. Mbështetja në Edge Function mbetet, por faqja nuk e përdor.
- Testi i ri `handwritten_form.test.js` mban vlerat e atij formulari (me emra të trilluar). **Ende nuk dihet çfarë ktheu vetë Gemini** për atë foto; për këtë duhet skedari “Shkarko leximin JSON”.

## 4. Çfarë u testua dhe çfarë jo

- `cd tests && npm ci && npm test` (Node 22.22): 74 teste plus kontrolli bazë, të gjitha kalojnë. 6 janë të reja (`word_import.test.js`).
- Edge Function u përkthye pa gabime dhe u provua me shërbime të simuluara: tekst Word → 200, tekst Excel → 200, tekst i lirë pa dokument → 400.
- **Nuk u testua:** leximi me Gemini real (asnjë dokument nuk u dërgua); ekrani i ri në një shfletues të vërtetë (testet përdorin jsdom); `tests/edge_function.test.ts` (Deno nuk ishte i disponueshëm); Playwright; printimi.
- **Saktësia reale e leximit nuk është matur as para, as pas.** Testet vërtetojnë përpunimin e përgjigjes, jo aftësinë e modelit për të lexuar shkrim dore. “Super e saktë” mund të thuhet vetëm pas matjes së pikës 1 më poshtë.

## 5. Hapat e radhës, sipas rëndësisë

1. **Matje me formularë realë.** 10–20 formularë të plotësuar (të anonimizuar), të regjistruar një herë me dorë si e vërteta, pastaj të lexuar nga sistemi: përqindja e fushave të sakta për foto, PDF, Word. Pa këtë, çdo ndryshim tjetër në OCR është hamendje.
2. **Deploy i Edge Function** (udhëzimet e reja dhe pranimi i Word-it). Deri atëherë Word-i refuzohet nga serveri me “Kërkesa e dokumentit nuk është e vlefshme”. Deploy-i bëhet para publikimit të faqes; funksioni i ri i pranon edhe kërkesat e faqes së vjetër.
3. **Fshirja e tre funksioneve prove** në Supabase (gjetja 7), pasi pronari të konfirmojë se nuk duhen.
4. **PDF-të e skanuara** me më shumë se dy faqe ndahen tani automatikisht në grupe nga dy faqe PARA/PAS; secili grup i vogël dërgohet si PDF dhe në panel ruhen numrat realë të faqeve. Kjo lejon një skedar të vetëm me 14 faqe / 7 formularë pa kaluar kufirin e leximit prej 6 faqesh për kërkesë. Nuk bëhet ende rasterizim në imazhe me pdf.js.
5. **Fushat e dyshimta nuk theksohen në formular.** Gemini i kthen te `uncertain`, por përdoruesi i sheh vetëm si listë paralajmërimesh sipër; një kornizë rreth fushës përkatëse do ta shpejtonte kontrollin.
6. **Koka CSP në GitHub Pages** (gjetja 9): ose `<meta http-equiv="Content-Security-Policy">` në `index.html`, ose kalimi i publikimit në Vercel. Kërkon provë në shfletues.
7. **Vendimi për privatësinë** (gjetja 10): ose punohet vërtet me kopje të anonimizuara, ose kalohet në një plan Gemini me pagesë, ku të dhënat nuk përdoren për trajnim, dhe ndryshohet teksti i konfirmimit.

## 7. Shtesë, 13 nëntor 2026 — dokumenti me disa formularë (faqja PARA / PAS)

**Problemi.** Deri tani dokumenti trajtohej si **një** formular: `aiRecord` e ktheu
gabim kur Gemini shënonte `multiple_forms: true` dhe i shtynte përdoruesin ta ndajë
PDF-në me dorë. Nuk kishte asnjë mënyrë për të ditur se në cilën faqe ose në cilën
zonë të formularit u lexua një vlerë, sa e sigurt është ajo dhe cilat vlera duhen
kontrolluar.

**Çfarë ndryshoi.**

- **Leximi** (`BioBes_Cloud/web/app.js`): `aiReadings()` kthen `document`
  (`fileName`, `pageCount`, `formCount`) dhe një listë `forms`. Çdo formular ka
  `pages.front`, `pages.back`, `header`, `plan`, `employees`, `weights`
  (`peshimi1..3`), `comments`, `uncertain`, `needsReview` dhe `warnings`. Çdo vlerë
  mban `value`, `page`, `formArea`, `confidence` (0–1) dhe `needsReview`, plus
  `readAs` kur teksti i lexuar ndryshon nga vlera e pranuar. Skema e plotë është në
  `SKEMA.md`.
- **Ndarja në formularë** bëhet vetëm kur dokumenti e tregon vetë: tabelë peshimi me
  numër mbi 6, më shumë se një bllok komentesh ose `multiple_forms: true` me faqe të
  identifikuara. Produktet, punonjësit dhe komentet e tepërta **nuk** shpikën formular
  të ri; ato raportohen si gabim, si më parë. Formulari i dytë nuk trashëgon numrin,
  datën, përgjegjësen, punonjësit, peshimet ose komentet e të parit.
- **Vlera e paqartë** (`[e paqartë]`) nuk bëhet kurrë vlerë për ruajtje: `value`
  mbetet `null`, `needsReview` bëhet `true` dhe e njëjta gjë shënohet në `uncertain`.
  Fushat bosh mbeten `null` (jo `0`).
- **Peshimet.** Peshimi 1–3 është faqja PARA dhe 4–6 faqja PAS. Çdo rresht mban
  `table` (numri i shtypur) dhe faqen e vet, që peshimi 4 të mos ngatërrohet me
  peshimin 1. Kolonat (Nr. thas., Kg, Ambalazhi, Shuma) nuk zhvendosen.
- **Faqja.** Një PDF/Word i tërë lexohet vetëm; nëse përmban disa formularë, çdo
  formular hapet si **kartë kontrolli më vete** (deri në 10). Paneli i ri
  **“Vendndodhja e çdo vlere”** tregon fushën, vlerën e lexuar, faqen, zonën,
  sigurinë dhe `needsReview`, me rreshtat për kontroll të theksuar.
- **Edge Function**: prompti dhe skema u zëvendësuan me strukturën `document` /
  `forms` (faqe, `formArea`, `confidence`, `needsReview`, `fields` me ID të
  dokumentuara). Rregullat e mëparshme ruhen: 12 punonjës, tabelat e peshimit,
  dyshkronjëshat, `[e paqartë]`, “asnjëherë mos ndrysho një vlerë vetëm që totali të
  dalë”. Kufiri i testit për gjatësinë e promptit u rrit me vetëdije nga 6 000 në
  8 000 karaktere.

**Testet.** `cd tests && npm ci && npm test` kalon të gjitha (exit 0). Testet e reja:
`multi_form.test.js` (8) dhe `reading_panel.test.js` (1). Testi i mëparshëm që
pritej të hidhte gabim për `multiple_forms` kalon vetëm kur dokumenti nuk jep faqe
të identifikueshme.

**Çfarë nuk u provua.** Si më parë: asnjë dokument real nuk u dërgua te Gemini dhe
nuk u mat saktësia. **Edge Function nuk është vendosur (deploy).** Deri para deploy-it
modeli i vjetër nuk e plotëson `forms`, ndaj faqja sillet me rrugën e vjetër: lexon
një formular dhe i shton faqen vetëm kur modeli e jep. Testi Deno nuk u ekzekutua
(Deno nuk ishte i disponueshëm); funksioni u përkthye dhe u kontrollua vetëm për
sintaksë me `esbuild`. Paneli u provua në jsdom, jo në shfletues të vërtetë.

## 6. Zbatim i 13 nëntorit — PDF i vetëm me 7 formularë

- Një PDF skanimi me 14 faqe, ku çdo formular ka dy faqe, ndahet në 7 grupe nga dy faqe në pajisje. Ndarja është automatike edhe kur zgjedhja mbetet “Çdo PDF = një formular”, nëse PDF-ja ka më shumë se dy faqe.
- Çdo rezultat ruan `pageOffset`, `formNumber` dhe `pageCount`; faqet e paraqitura në “Vendndodhja e çdo vlere” janë faqet e PDF-së origjinale (1–14), jo faqet relative të copës së ndarë.
- Vlerat me `confidence < 0.65` tani shënohen automatikisht `needsReview=true`, futen te `uncertain` dhe shfaqin paralajmërim; vlera nuk zëvendësohet dhe nuk hidhet poshtë pa kontroll.
- Testi i ri sintetik kontrollon 14 faqe → 7 grupe, me offsets `0,2,4,6,8,10,12`. Dokumenti real i përdoruesit nuk futet në repository.
- Kjo e përmirëson ndarjen dhe gjurmueshmërinë, jo garancinë e saktësisë së Gemini-t. Çdo formular duhet të kontrollohet dhe konfirmohet para ruajtjes.

## 7. Çfarë mbeti me dashje

- Dosjet `BioBes_Paketa_e_Fundit_Kompjuter_Cloud/BioBes_Paketa_e_Fundit/` nuk u sheshuan: workflow-i i Pages dhe ngarkimet me dorë në GitHub mbështeten te kjo rrugë.
- Në `app.js` dhe `cloud.js` mbetën disa degë `if(importState.review)` në rrugën e ruajtjes dhe të rikuperimit. Pas heqjes së ekranit të vjetër ato nuk ekzekutohen më; nuk u hoqën sepse prekin ruajtjen në cloud dhe nuk mund të provoheshin në shfletues.
- `tests/fixtures/ocr_baseline_app.js` është një kopje e ngrirë e `app.js` të vjetër, e përdorur nga një test krahasimi “para → pas”.

## 7. Skanim real i provuar (14 nëntor 2026)

U lexua i plotë skanimi real `BioBes_7_formulare_14_faqe.pdf` (14 faqe, imazhe
me dorëshkrim, faqet e ruajtura të rrotulluara 90°) dhe u kalua nëpër parserin e
prodhimit `aiReadings`. Rezultati: **7 formularë**, secili me faqen PARA dhe PAS
(1/2, 3/4, 5/6, 7/8, 9/10, 11/12, 13/14), pa kaluar asnjë vlerë nga një formular
te tjetri. Të dhënat reale mbahen jashtë repo-s (shih `.gitignore`); testi
përdor `tests/fixtures/scan_14_pages.json`, të njëjtin lexim të anonimizuar.

**Defekt i gjetur dhe i rregulluar.** Auditimi i totalit të shtypur (SH) lexonte
vetëm qeliza tekst; kur qelizat vinin si objekte `{value, page, formArea,
confidence}` — formati që kërkon `SKEMA.md` për `fields` — totali raportohej
gabimisht si “nuk mund të verifikohet”. Tani `auditAIObservations` i lexon të dy
format. Pas rregullimit, formulari 001 e verifikon totalin **1476** nga 20 rreshta,
kurse formulari 004 e kap mospërputhjen **1569 kundrejt 1571** pa e ndryshuar asnjë
vlerë.

**Kontroll i pavarur nga letra.** Totalet e shkruara në formularë u përdorën si
provë e leximit: 1476 − 250 = 1226 dhe 1569 − 150 = 1419 dalin nga rreshtat.
Kështu u kap edhe rreshti 5 i formularit 004 (174 për 172) dhe data e lexuar
gabim `19.11.2026` (është **9.11.2026**; presja e shtypur “/” ishte lexuar si “1”
dhe dita “e Hënë” e vërteton).

**Testet.** U shtua `tests/skanim_real.test.js` (7 teste) mbi një fixture me të
njëjtën strukturë, i lidhur në `npm test`. E gjithë seria kalon (exit 0).

**Çfarë nuk u provua ende.** Leximi u krye me sy (zmadhim 4–16×) dhe jo përmes
Gemini, sepse skanimi përmban të dhëna reale. Edge Function mbetet e pandërgjuar
(deploy) dhe matja e saktësisë me Gemini mbetet për t'u bërë me dokumente të
anonimizuara.

### 7.1 PDF-ja e skanuar me shumë faqe (i njëjti rast, rregullim)

**Defekti.** `prepareGeminiParts` hidhte gabim për çdo PDF mbi 6 faqe
(“PDF … ka më shumë se 6 faqe. Zgjidh faqet e një formulari.”). Skanimi real i
këtij rasti ka 14 faqe, pra **do të ishte refuzuar i tëri** — leximi i bërë me sy
nuk tregonte se çfarë bën aplikacioni me një skanim të vërtetë. Kufizimi ishte i
kërkesës (numri i faqeve për thirrje), por ishte vënë si kufi i dokumentit.

**Rregullimi.** Një PDF që kalon 6 faqe ndahet tani automatikisht në pjesë me
`PDFLib` (`slicePdf`), lexohet pjesë për pjesë (`planReadingCalls`) dhe
ribashkohet si **një dokument** (`mergeReadingChunks`):

- faqet e çdo pjese zhvendosen te numrat e PDF-së (`shiftPages`): 1 … 14, jo 1 … 6;
- rreshtat e peshimit, punonjësit dhe planet e një formulari të prerë mes dy
  pjesëve bashkohen te formulari i vetëm, vetëm kur formulari i mëparshëm mbaron
  pikërisht aty dhe pjesa e re nuk ka identitet (numër/fusha). Nuk ka hamendje:
  një formular me numër nuk bashkohet kurrë me një tjetër;
- kufiri i vërtetë mbetet 20 faqe (10 formularë × 2), me mesazh të qartë.

**Prova.** `tests/large_pdf.test.js` (11 teste) ndërton PDF të vërtetë me
`PDFLib` dhe kalon leximin e prodhimit deri te `aiReadings`; rrjeti
zëvendësohet, `cloudGemini` xhiron i paprekur. Me fixture-in e skanimit real
(14 faqe), leximi i ndarë në 6+6+2 jep **të njëjtin rezultat** si leximi direkt:
7 formularë, faqet 1–14, 1476 kg te formulari 001 dhe 1571 kg te 004, pa rreshta
të humbur ose të dyfishuar.

### 7.2 Një rresht i keq lexuar rrëzonte gjithë formularin (gjetur në përdorim)

**Simptoma.** Në skanimin e podit, grupet 5 dhe 6 dolën “Nuk u lexua” dhe në
fund: *“Numrat e tabelave të peshimit janë të paqartë; shkarko leximin JSON.”*

**Shkaku.** `aiReadBlock` hidhte gabim (`throw`) sapo një rresht i peshimit
mungonte numrin ose e kishte të përsëritur. Gabimi priste të gjithë grupin, pra
humbnin edhe 24 rreshtat e tjerë të lexuar saktë. Një numër i shkruar me dorë
(ose i lexuar keq) mjaftonte për të humbur formularin.

**Rregullimi.** Rreshti tani mbahet gjithmonë: kur numri mungon, përsëritet ose
është jashtë tabelës, rreshti vendoset sipas rendit, shënohet `needsReview` dhe
paralajmërimi e thotë hapur (“rreshti u vendos sipas rendit dhe duhet
kontrolluar në dokument”). Asnjë vlerë e lexuar nuk hidhet poshtë dhe as nuk
korrigjohet — vetëm shënohet.

**Prova.** `tests/weight_row_numbers.test.js` (7 teste): rresht pa numër, numër
i përsëritur, numër jo-numerik, dhe kontrolli që vetëm rreshtat e dyshimtë
shënohen. Me 24 rreshta të qartë + 1 të dyshimtë, ruhen 25 nga 25.

### 7.3 Shpejtësia e leximit (pa ndryshuar asnjë vlerë)

Leximi zgjaste ~111 s për disa grupe. Matja e daljes tregoi se vonesa nuk vinte
nga shikimi i figurës, por nga **sa tekst duhej të shkruante modeli**.

| Burimi i tepricës | Para | Pas |
|---|---|---|
| `formArea` me fjalë për çdo qelizë (22% e daljes) | “PESHIMI 1 · faqja PARA · rreshti 7 · Kg” | kodi `w1.r7.kg`, zbërthehet në pajisje |
| `confidence` për çdo qelizë, edhe kur s'kishte dyshim | e detyrueshme | vetëm kur ka pasiguri |
| 12 punonjës për çdo formular, edhe bosh | 12 objekte × 538 bajt | vetëm rreshtat me vlera |
| Grupe njëherësh | 2 | 4 (`BATCH_WORKERS`) |
| Skanim i përsëritur | rilexohej gjithmonë | cache me hash SHA-256, 7 ditë |

**Kursimi i matur i daljes: 31%** (92 010 → 63 473 bajt për skanimin real).

**Cache-i.** Çelësi është hash-i i përmbajtjes, i lidhur me `READ_CACHE_VERSION`:
kur ndryshon prompt-i ose skema, leximet e vjetra hidhen vetë. Ruhet vetëm dalja
e modelit, në pajisje; dokumenti nuk ruhet. Maksimumi 40 leximе, 7 ditë.

**Rreziqet që u mbyllën gjatë punës.**
1. Faqet krejt bosh prodhojnë PDF me bajt identikë dhe cache-i i njësonte —
   testet tani përdorin faqe me përmasa të ndryshme.
2. Pa `crypto.subtle` (kontekst jo i sigurt) hash-i bie në FNV-1a, kështu që
   cache-i nuk shkakton gabim.
3. `formArea` e panjohur kalon si tekst, nuk hidhet dhe nuk shpiket.

**Prova.** `tests/read_speed.test.js` (11 teste): zbërthimi i kodeve, ndërtimi i
zonës kur mungon, punonjësit e pjesshëm, cache-i (ruajtje, skadim, hash i
ndryshëm për skedar tjetër) dhe kontrolli që skanimi real jep ende 1476/1571 kg
me po ato data.

### 7.4 Kuota e Gemini (429) nuk harxhohet kot

**Simptoma.** Grupet 5–7 dolën “Nuk u lexua” me
*“Gemini nuk e përfundoi kërkesën. (RESOURCE_EXHAUSTED #429)”*.

**Diagnoza.** 429 me `RESOURCE_EXHAUSTED` është kuota e llogarisë, jo gabim i
dokumentit. Kodi e trajtonte si kufi të përkohshëm: **1 kërkesë + 4 riprovime**
me pritje 5, 10 e 15 s. Për tre grupe harxhoheshin deri në 11 kërkesa për zero
rezultat, ndërsa Google thoshte “prit”. `Retry-After` nuk lexohej fare.

**Rregullimi.**
1. `RESOURCE_EXHAUSTED`/`QUOTA` → **ndalet menjëherë**, pa riprovuar, me mesazh
   që thotë se kuota u shpenzua dhe se dokumentet nuk humbën.
2. 429 e zakonshme (jo kuotë) → riprovohet, dhe `Retry-After` respektohet
   (30–60 s në vend të 5 s).
3. Kur kuota bie në një grup, **grupet e tjera nuk provohen**; raporti thotë sa u
   lexuan dhe sa mbeten.
4. Grupet e lexuara **nuk hidhen**: “Lexo formularët” riprovoi vetëm të mbeturit.

**Prova.** `tests/quota_429.test.js` (7 teste). Matja: tre grupe me kuotë të
shpenzuar → **3 kërkesa në vend të 11**.

## 8. Publikimet live (14 nëntor 2026)

Skedari që shërbehet është `BioBes_Cloud/web/app.js` (dhe `cloud.js`) përmes
workflow-it **“BioBes Pages”** (`workflow_dispatch`, burimi `main`).

| Commit | Çfarë u publikua | Deploy |
|---|---|---|
| `088436e` | Rresht peshimi i keq lexuar nuk rrëzon gjithë formularin (#19) | success |
| `a409707` | Zona si kod, cache leximi, 4 grupe paralel | success |
| `f82b7ce` | Kuota 429 ndalon menjëherë, `Retry-After`, grupet e lexuara ruhen | success |

**Si verifikohet që live-i është kodi i duhur** (pa pasur nevojë për shfletues):
lexohet skedari në commit-in e publikuar dhe kontrollohen shenjat e ndryshimit:

```
gh api "repos/<owner>/<repo>/contents/<path>/app.js?ref=<commit>" --jq .content | base64 -d
```

Për `a409707` u kontrollua prania e `BATCH_WORKERS=4`, `aiAreaCode` dhe
`READ_CACHE_VERSION`; për `f82b7ce` prania e `RESOURCE_EXHAUSTED`, `quota` dhe
`retry-after` në `cloud.js`. Të dy skedarët kaluan `node --check`.

**Kujdes për shfletuesin.** GitHub Pages ruan cache; pas publikimit duhet
rifreskim i fortë (Ctrl+Shift+R), përndryshe shfaqet versioni i vjetër.

**Rendi i punës.** Të tre commit-et u dërguan drejt në `main` me fast-forward,
pa PR të ndërmjetëm (kërkesë e përdoruesit për t'i pasur live). Për këtë arsye
dega e punës dhe `main` janë identike dhe GitHub nuk pranon PR prej saj:
*“No commits between main and …”*.

### 7.5 “Leximi kaloi kohën” — shkaktuar nga pritjet e 429

**Simptoma.** Pas rregullimit të kuotës, grupet 5–7 dolën “Në pritje” dhe në fund
*“Leximi kaloi kohën”*, me butonin “Kontrollo të lexuarit” të zhdukur.

**Shkaku — defekt i futur në 7.4.** Kur hoqa `try/finally` e vjetër, pritjet e
429 mbetën pa kufi kohor *brenda* thirrjes: `Retry-After` i madh, ose 30 s + 60 s
+ 90 s, bënte **180 s pritje**, ndërsa kufiri i jashtëm i klientit ishte **140 s**.
Kështu leximi aborterohej vetë dhe mesazhi i vërtetë humbte në “kaloi kohën”.

**Rregullimi.**
1. `cloudGemini` merr një **buxhet kohor** (125 s brenda kufirit 140 s). Çdo
   pritje llogaritet brenda tij dhe mbahet gjithmonë 15 s për një provë të fundit.
2. Kur buxheti nuk e mban një pritje, thirrja **ndalon dhe kthen gabimin e
   vërtetë** — nuk e lë arbitrin e jashtëm ta presë si gabim kohe.
3. Gabimi i kohës tani ka mesazh të vetin (`e.timeout`) dhe nuk mbulon arsyen e
   vërtetë kur diçka tjetër dështoi më parë.
4. Kur kuota bie, raporti thotë “u lexuan X nga Y, Z mbeten” dhe **grupet e
   lexuara mbeten** për riprovim.

**Prova.** `tests/read_timeout.test.js` (6 teste): buxhet zero, buxhet i vogël,
`Retry-After` 120 s që nuk pritet, `Retry-After` 2 s që respektohet, kuota që
mbetet kuota, dhe 400 që nuk shndërrohet në gabim kohe.

### 7.6 Pastrim pas ndalesës për kuotë

Dy mbetje nga 7.4/7.5:

1. **Flamur i vdekur.** `batchState.quota` vendosej por nuk lexohej askund dhe
   nuk pastrohej kurrë — shtet i fshehtë që do të ngatërronte më vonë. U hoq;
   vendimi për ndalesë merret nga `quotaHit` brenda vetë ciklit.
2. **Grupet e paprovuara.** Kur kuota binte në grupin 2, grupet 3–7 mbeteshin
   “në pritje” pa asnjë shpjegim. Tani raporti thotë qartë *“u lexuan X nga Y,
   Z mbeten të palexuar”*, lista ripikturohet menjëherë dhe riprovimi lexon
   **vetëm** të mbeturit — grupet e lexuara nuk preken.

**Prova.** `tests/read_timeout.test.js` u zgjerua në 8 teste, me kontrollin që
grupet `ready` nuk kthehen në pritje dhe që flamuri i vdekur nuk ekziston më.

### 7.7 I njëjti defekt te tabelat e peshimit

**Simptoma.** Grupet 5, 6 dhe 7 dolën *“Nuk u lexua — Numrat e tabelave të
peshimit janë të paqartë; shkarko leximin JSON”*, ndërsa grupet 1–4 u lexuan.

**Shkaku.** I njëjti model si te rreshtat (7.1/7.2), por në nivel tabele: në
**dy vende** kodi hidhte gabim sapo `weighings[].index` mungonte, përsëritej,
ishte tekst, ose dilte jashtë 1–6:

- `aiBlocks` (ndarja e dokumentit në formularë)
- `aiReadBlock` (leximi brenda formularit)

Një tabelë me numër të keq priste të gjithë grupin, edhe pse të gjashtë tabelat
mund të ishin të sakta. Grupet 5–7 ishin formulari 005 (i grisur), 006 dhe 007,
ku numrat e tabelave ishin më të dobët.

**Rregullimi.** `aiNormalizeTables()` — e njëjta logjikë për të dyja vendet:
tabela mbahet, merr **vendin e parë të lirë**, shënohet dhe paralajmërohet:
*“Peshimi: numri 1 është i përsëritur për një tabelë me vlera; u vendos si
PESHIMI 2 sipas rendit dhe duhet kontrolluar në dokument.”*
Asnjë vlerë nuk hidhet dhe as nuk korrigjohet.

**Prova.** `tests/weight_table_numbers.test.js` (9 teste): pa numër, i
përsëritur, tekst, jashtë tabelës, vetëm tabela e keqe shënohet, gjashtë tabela
të sakta mbeten gjashtë, dhe skanimi real pa regres. Testi i vjetër
`rejects duplicate weighing indexes` u zëvendësua me `keeps both tables…`, sepse
mbrojnte sjelljen që e humbte të dhënën.

### 7.8 Pse vazhdoi gabimi pas rregullimit (mësim për publikimin)

Pas #22 gabimi *“Numrat e tabelave të peshimit janë të paqartë”* vazhdoi në faqen
live, edhe pse `main` e kishte rregullimin.

**Shkaku: publikimi mungonte.** Workflow-i “BioBes Pages” është vetëm
`workflow_dispatch`; bashkimi i PR-së **nuk e nis vetë**. Publikimi i fundit
ishte 48 minuta para bashkimit, pra live-i shërbente ende kodin e vjetër.

**Rregull praktik:** pas çdo bashkimi që prek `BioBes_Cloud/web/`, duhet nisur
me dorë “BioBes Pages”, dhe verifikuar që `headSha` i ekzekutimit është commit-i
i ri — jo vetëm që statusi është `success`.

### 7.9 Një formular me problem nuk rrëzon grupin

Edhe pas 7.7 mbeti një rrugë e gjerë: `aiReadBlock` hidhte gabim për çdo tepricë
të vërtetë (mbi 3 produkte, mbi 12 punonjës, mbi 60 tabela), dhe `aiReadings`
e linte të hidhej — duke humbur **të gjithë formularin** e jo vetëm pjesën
problematicе.

Tani çdo formular lexohet veçmas brenda `try`: nëse dështon, shënohet
*“Formulari N nuk u lexua: [arsyeja]. Të tjerët e grupit u ruajtën”*, formulaрët
e tjerë mbeten, dhe shënimi shfaqet te kartat e ruajtura (jo vetëm në listën e
përgjithshme, ku nuk shihej).

### 7.10 Kontrolli aritmetik i formularit: SHUMA = KG − AMBALAZHI

**Rasti që e nxori (përdoruesi, 14 nëntor 2026).** Në një tabelë peshimi letra
kishte KG 1476 dhe AMBALAZHI 320, pra shuma duhet të dilte 1156, kurse ishte
shkruar 122. Sistemi e pranonte 122 pa asnjë fjalë: kontrolli që ekzistonte (7.3)
krahasohej vetëm rreshtat me totalin e shtypur të *së njëjtës kolonë*, nuk e
lidhte kolonën e shumës me KG − Ambalazhi.

**Çfarë bën tani (në pajisje, pa model):** `weighCheckCalc(rows,printed)` llogarit
`KG − Ambalazhi` dhe e krahason me shumën që është shkruar — për totalin e
tabelës dhe, veçmas, për çdo rresht që ka të tre vlerat. Rezultati shfaqet në
tri vende:

1. **Nën secilën tabelë** (`weighCheckHTML`): *“Kontrolli automatik: 1476 − 320 =
   1156 kg, por e shkruara është 122 ✗ diferenca 1034 kg. Vlera nuk u ndryshua.”*
   Përditësohet menjëherë kur ndryshon një qelizë (`updateDerived`).
2. **Në krye të kartës së peshimeve**: numri i mospërputhjeve dhe lista e tyre.
3. **Në paralajmërimet e regjistrimit** (`weighCheckIssues` nga `aiReadBlock`),
   që shfaqen te kartat e ruajtura dhe te paneli i kontrollit.

**Përbërja e krahasimit:** përparësi ka totali i shtypur (SH) i kolonës *Shuma*;
kur letra nuk e ka, krahasohet shuma e rreshtave. Nëse totali i tabelës nuk del,
raportohet **një** herë në nivel tabele me shifrat e letrës (jo një herë për çdo
rresht), dhe rreshtat përmenden vetëm kur tabela në tërësi del mirë.

**Rregulli i paprekshëm:** kontrolli vetëm krahaso — asnjë shifër e letrës nuk
zëvendësohet dhe as “korrigjohet” që totali të dalë. `printedTotal` (totali i
shtypur SH i tabelës) ruhet tani edhe në regjistrim (`newGroup`, `normalizeRecord`),
që kontrolli të punojë edhe pas rihapjes së formularit, jo vetëm në momentin e
leximit.

**Testet:** `tests/weight_arithmetic.test.js` — 12 teste, mes tyre rasti real
(1476 − 320 ≠ 122), mungesa e KG/Ambalazhit, vlera `[e paqartë]` që nuk
llogaritet si zero, presja dhjetore, ruajtja e vlerave pas normalizimit.

### 7.11 Rrjeta e sigurisë për kontrollin aritmetik (15 nëntor 2026)

Pas publikimit të 7.10 përdoruesi raportoi se faqja “nuk lexon dhe nuk bën
totalet”. Riprodhimi me skedarët e live-it (jo me kopje lokale) dha: 7 formularë
të lexuar, 1476/1571 kg si më parë, të gjashtë rrugët e faqes pa gabim dhe
totalet që përditësohen gjatë shkrimit — pra defekti nuk u riprodhua.

Sidoqoftë, kontrolli i ri **nuk duhet të jetë kurrë në rrugën kritike** të leximit
apo të totaleve. Prandaj u shtua:

- `weighCheckSafe` / `weighIssuesSafe` — çdo thirrje e kontrollit është në `try`;
  nëse dështon, leximi, tabelat dhe totalet vazhdojnë pa të.
- Përditësimi i kutisë së kontrollit në `updateDerived` është në `try` më vete, që
  një gabim aty të mos ndalojë përditësimin e SH-së.
- Ura e `printed_totals` është në `try`.
- Provë e detyruar: duke e bërë kontrollin të hedhë gabim me qëllim, faqja
  lexon 7 formularë, ruan 180 kg dhe pas shkrimit tregon 200 kg — asgjë nuk
  bllokohet.

**Cache-i i shfletuesit (mos e nënvlerëso).** Versioni i vjetër i `app.js` mund
të mbetet në disk pas publikimit. Tani `index.html` i thërret skriptet me
`?v=546040a-d2`, pra çdo publikim i ri detyron shkarkim të ri. Nëse ende shfaqet
sjellje e vjetër, duhet pastruar cache-i i faqes (Ctrl+Shift+R ose dritare
private) dhe faqja duhet rifreskuar një herë pa internet për të hequr service
worker-in e vjetër.

### 7.12 Kuota u shpenzua: rruga për të vazhduar (15 nëntor 2026)

Përdoruesi pa: *“Kuota e leximit me Gemini për sot është shpenzuar
(RESOURCE_EXHAUSTED) … U lexuan 1 nga 7 grupe; 6 mbeten të palexuar.”*

**Ky nuk është defekt.** Kuota falas e Gemini është ditore dhe ndahet për të
gjithë çelësin; 7 grupe me nga 2 faqe = 7 kërkesa. Kur mbaron, asnjë kod nuk e
kapërcen.

**Defekti ishte tjetër:** mesazhi thoshte *“Shtyp Lexo formularët”*, por ai buton
i riprovon **të gjithë** grupet — përfshirë ata që ishin lexuar me sukses. Pra
udhëzimi nuk të çonte te ajo që duhej bërë.

Tani:

- **Buton i veçantë** *“Lexo vetëm N grupet e mbetura”* (`batchReadPending`), që
  shfaqet vetëm kur ka grupe të palexuara pranë atyre të lexuara. Ai i kthen në
  pritje vetëm ata që s’u lexuan, i pastron gabimet e vjetra dhe i riprovon —
  **të lexuarit nuk preken dhe nuk harxhojnë kuotë**.
- Mesazhi i kuotës thotë tani kur rinovohet (**pas mesnate me orën e Paqësorit,
  rreth orës 09:00 me orën e Shqipërisë**) dhe që vetëm të mbeturit kërkojnë kuotë
  të re.
- Cache-i i leximit (`readCacheGet`, 7 ditë) do të thotë që edhe nëse një grup i
  lexuar riprovohet gabimisht, përgjigjja vjen nga pajisja, pa kërkesë të re.

**Testet:** `tests/batch_resume.test.js` — 6 teste: sa grupe mbeten, që
riprovimi prek vetëm të palexuarit, që butoni shfaqet vetëm kur ka kuptim, që
rezultatet e lexuara nuk hidhen, dhe që mesazhi thotë rrugën.

### 7.13 Kërkesa për lexim lokal pa Gemini (15 nëntor 2026)

Përdoruesi kërkoi ta heqë varësinë nga Gemini: *“ma hiq, kaloj lokal, jo Gemini”*.

**Prova e bërë para se të premtohej gjë.** Nga PDF-ja reale u nxor faqja 1
(imazh 1754 × 1240, JPEG i mbështjellë në Flate) dhe u provua OCR lokal:

- **Nuk ka shtresë teksti:** PDF-ja nuk përmban asnjë `/Font` — janë 14 imazhe të
  skanuara. Pra nuk mjafton të “lexosh tekstin e PDF-së”; duhet OCR mbi imazh.
- **Tesseract.js** (motori OCR që punon në pajisje) nuk niset në këtë mjedis:
  binarët WASM dhe të dhënat e gjuhës nuk arrihen (rrjeti i hapur kufizohet te
  npm/PyPI/GitHub). Prova mbeti pa përfunduar — **nuk u mat saktësia**.
- Dorëshkrimi në këto formularë është shkrim i lidhur shqip mbi tabelë; OCR
  klasik e lexon shumë dobët. Për krahasim, Gemini e lexon me gabime të pakta,
  por edhe ai gabon (174 vs 1569, tabelat 5–7).

**Vendimi:** nuk u dynd asnjë motor i pasigurt në faqen live që lexon të dhëna
reale pune. Në vend të tij, mesazhi i kuotës tani e drejton përdoruesin te
“Lexo në pajisje” (shih 7.14) dhe te rruga e vazhdimit.

**Kushti për lexim lokal që ia vlen:** duhet të mbajë të njëjtat rregulla — asnjë
vlerë e hamendësuar, `[e paqartë]` për atë që nuk lexohet, `needsReview`, dhe
një masë saktësie e matur mbi skanimin real përpara se të shpallet i gatshëm.

### 7.14 OCR lokal i matur: 0 nga 10 — dhe çfarë u ndërtua në vend të tij

Zgjedhja e përdoruesit: **B** — Gemini kryesor, lokal si rezervë. Para se të
ndërtohej, OCR-ja u mat mbi skanimin e tij real (14 faqe, dorëshkrim shqip).

**Prova.**

- Faqja 1 u nxor nga PDF-ja (imazh 1754 × 1240, JPEG brenda Flate; PDF-ja nuk ka
  asnjë `/Font`, pra nuk ka shtresë teksti).
- Imazhi ishte i rrotulluar 180°; me orientimin e saktë (270°) u gjet rrjeta e
  tabelës: 6 vija vertikale, 46 horizontale, hap ~29 px.
- Tesseract.js u nis me skedarë lokalë (`tesseract.js-core` + `@tesseract.js-data/eng`)
  dhe u provua qelizë për qelizë në kolonat e tabelës PESHIMI 1, me
  `tessedit_char_whitelist: 0123456789` dhe `psm 7` (një rresht teksti).

**Rezultati: 0 nga 10 vlera të sakta** në kolonën KG (22, 21, 22, 188, 23, 26,
73, 95, 72, 88). Pa pritje orientimi, besueshmëria e faqes së plotë ishte 29–32%.

**Përfundim:** OCR klasik nuk e lexon këtë dorëshkrim. Ta hidhte në faqe do të
thoshte t’i jepte përdoruesit numra të gabuar pa paralajmërim — më keq se kuota.

**Çfarë u ndërtua në vend të tij: “Kontrollo pa Gemini”.**

- Buton pranë “Lexo formularët”. Nuk bën **asnjë** kërkesë rrjeti (test i
  detyruar: `fetch` hedh gabim nëse thirret; thirret 0 herë).
- Krijon formularë **bosh** — një për çdo 2 faqe të grupit, me faqet e shënuara
  (“faqja 1–2 e 14”). Asnjë vlerë nuk shpiket.
- Numri i formularit merret vetëm kur është i qartë në emrin e skedarit
  (`BioBes_041.pdf`, `…formulari_7…`); numri i zhveshur nuk hamendësohet.
- Data merret vetëm kur është e qartë; intervali `06-12.11.26` lexohet si
  12.11.2026 (dita e mbarimit), jo si 06.12.2026. Viti 2-shifror pranohet vetëm
  2020–2040.
- Formulari hyn në të njëjtën faqe kontrolli: kontrolli **KG − Ambalazhi**
  punon, origjinali hapet pranë tij si URL lokale (pa upload), dhe ruajtja bën
  çdo kontrolle si zakonisht.
- Paralajmërimet e thonë hapur pse: *“u krijua BOSH … as Gemini (kuota) as OCR
  lokal (prova dha 0/10 saktë në dorëshkrim)”*.

**Testet:** `tests/batch_manual.test.js` — 8 teste (pa vlera të shpikura, numri
dhe data vetëm kur janë të qarta, 14 faqe → 7 formularë bosh, zero kërkesa
rrjeti, aritmetika gati).

---

## 7.15 Matja e dytë e OCR-së lokale — motori tjetër (PaddleOCR), 2 formulare

Matja e §7.14 përdori Tesseract dhe dha 0/10. Ajo matje u përsërit me një motor
krejt tjetër — **PaddleOCR PP-OCRv4** (modelet `ch_PP-OCRv4_rec_infer.onnx`,
11 MB) mbi **ONNX Runtime Web (WASM)** — pikërisht si do të ekzekutohej në
shfletues, pa server dhe pa rrjet.

**Përgatitja e imazhit (e njëjta për të gjitha matjet):**

1. Faqja nxirret nga PDF-ja me `pymupdf` në 150 dpi (1240×1754 px).
2. Vijat e tabelës zbulohen **me kod** (densiteti i pikselave të errët për
   rresht/kollonë), jo me sy: 21 vija horizontale, hap 29–30 px.
3. Prerja zgjerohet 3–4 px **jashtë** vijave (shkrimi del jashtë rreshtit; pa
   këtë, shifra e parë pritet — shih më poshtë).
4. Dekodimi kufizohet **vetëm në shifra** (`0123456789`), që modeli të mos
   zgjidhë `s` kur heziton mes `5` dhe `s`.

**Rezultati 1 — formulari 001, 20 rreshta (prerja më e mirë nga 27 variante):**

| Metoda | Saktësi |
|---|---|
| Tesseract (§7.14) | 0/10 |
| PaddleOCR, prerje brenda vijave | 8/20 |
| PaddleOCR, prerje +4 px jashtë vijave | 16/20 |
| **PaddleOCR, dekodim vetëm-shifra + jashtë vijave** | **16/20 = 80%** |

Shembull i gabimit që u rregullua: `88 → 8`, `95 → 95` vetëm kur prerja
zgjerohet. Shembuj të mbetur: `73 → 3`, `72 → 2`, `52 → 32`.

**Rezultat 2 — formulari 004, 10 rreshta, ditë dhe shkrim tjetër:** **8/10 = 80%.**
Gabimet: `130 → 180`, `152 → 52`.

**Rezultat 3 — testi i ndershmërisë (më i rëndësishmi).** Nëse i njëjti
rresht pritet në 10 mënyra të pavarura dhe merret vota e shumicës:

| | 001 | 004 |
|---|---|---|
| Konsensus (≥9/10 prerje pajtohen) | 14/20 rreshta | 5/10 rreshta |
| Saktësia **kur ka konsensus** | 13/14 = **93%** | 4/5 = **80%** |
| Rreshta pa konsensus | 6/20 | 5/10 |

Përfundim: motori **e di kur nuk është i sigurt** — rreshtat pa konsensus janë
pikërisht ata që lexohen gabim. Kjo do të lejonte një rrugë të ndershme:
*Auto vetëm kur ka konsensus; përndryshe `[e paqartë]` + `needsReview`.*

**Pse nuk u vu në prodhim (ende):**

- 80% nuk mjafton për të dhëna page reale; pragu i kërkuar është ≥95%.
- 93% me konsensus është premtues, por konsensusi mbulon vetëm 63% të rreshtave
  në 001 dhe 50% në 004 — mbi gjysmën e punës do të duhej të bëhej me dorë.
- 2/30 rreshta u lexuan **gabim me vetëbesim të plotë** (88%), pra rreziku i
  vlerës së gabuar të besuar ende ekziston.
- Modeli është 11 MB; bashkë me ONNX Runtime Web (~10 MB WASM) faqja rritet
  ndjeshëm, dhe `fontkit`/`pdf-lib`/`xlsx` janë tashmë në `vendor/`.

**Statusi:** matje e kryer dhe e dokumentuar; rruga që punon mbetet
“Lexo formularët” (Gemini) + “Kontrollo pa Gemini” (manual). Kalimi në prodhim
i kërkon trajnim mbi formulare të etiketuara ose një model më të madh.
