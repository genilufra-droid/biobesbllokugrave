# Kontrolli OCR në shqip — P0/P1

Ky është një raport i krijuar për këtë paketë, jo kopje e raportit të munguar. Prompti/skema origjinale e §4 nuk ishte e disponueshme; prompti dhe skema janë hartuar nga përshkrimi i dhënë, jo zbatuar verbatim. Baza e punës është commit-i `e53d91c` i PR #8 (12 punonjës, 25 rreshta peshimi). PR #8 duhet trajtuar si varësi; `main` i bazës ka një model tjetër. Nuk është bërë merge, push apo deploy.

## Çfarë është zbatuar

- Prompt në shqip, dalje JSON e strukturuar, `temperature: 0` dhe kufi 20 480 token. Fushat `weekday`, `iso_week`, `total_hours`, `record_numbers_seen`, `dates_seen`, `printed_totals` dhe `uncertain` përdoren për paralajmërime, jo për korrigjim automatik. Pozicionet dhe numrat e lexuar ruhen; një numër i munguar propozohet si më parë, me paralajmërim, dhe duhet kontrolluar nga përdoruesi.
- Data të paqarta ditë/muaj nuk hamendësohen; `6.11.26` mbetet bosh dhe paralajmërohet. Vit me dy shifra pranohet vetëm kur viti zgjidhet në intervalin ±10 vjet nga viti aktual dhe dita/muaji nuk janë të paqarta. Orët me sekonda rrumbullakosen në minutën më të afërt.
- Presja e vetme interpretohet si dhjetore, një pikë me grupim të plotë si `1.250` si mijëshe (përjashtim `0.125`), formati i përzier lexohet nga ndarësi i fundit. Pra `1,234` dhe `1.234` kanë kuptime të ndryshme dhe nuk mund të dallohet gjithmonë qëllimi real i autorit. Vlerat me njësi, negative, grupime të pavlefshme, ndarës përfundimtar pa shifra ose mbi 15 shifra domethënëse refuzohen me paralajmërim. Për Excel-in sasitë me njësi të ndarë lexohen nga fusha përkatëse.
- Lexuesi i Excel-it përdor gjeometrinë ekzistuese të PR #8: 12 punonjës, peshimet në rreshtat 27–51 dhe 61–85, komentet në 88, 90, 92, 94 dhe 96. Modeli, builder-at dhe printimi nuk u ndryshuan.
- Fotot e përzgjedhura për AI përgatiten në pajisje: orientim nga EXIF sipas dekoderit të shfletuesit, gjatësi maksimale 2400 piksel, gri, nivele automatike dhe JPEG. Nën 1200 piksel në anën më të shkurtër jepet paralajmërim. Origjinali privat nuk ndryshohet. Nëse shfletuesi nuk e dekodon formatin (p.sh. HEIC), konvertoje më parë në JPEG/PNG. Fotot e integruara brenda Excel-it nuk përpunohen nga ky hap.
- Katalogu është i çaktivizuar si parazgjedhje, me checkbox dhe pëlqim të veçantë për secilën mënyrë leximi. Dërgohen vetëm listat bazë, jo opsionet e mbledhura nga historiku; kufiri është 20 KiB UTF-8. Aplikacioni nuk vërteton ose kryen anonimizimin: mos aktivizo opsionin me emra realë ose përmbajtje konfidenciale.
- Pjesët e dy fotove etiketohen PARA/PAS sipas rendit të zgjedhur; përdoruesi duhet ta verifikojë. MAX_TOKENS dallohet nga dështimet e tjera. Retry deri në katër përpjekje për rrjet, 408, 429 dhe 5xx, me pritje të kufizuar; 400/401/403/404 të provider-it nuk riprovohen edhe kur Edge i kthen si 502. Retry mund të konsumojë kuotë; anulimi nuk garanton ndalimin e kërkesës tashmë të dërguar.

## Krahasim i simuluar para → pas

`tests/fixtures/ocr_synthetic_scan.pdf` është një PDF me dy imazhe të trilluara, pa informacion real. `ocr_mock_response.json` është përgjigje e shkruar me dorë, jo rezultat Gemini. Testi e kalon saktësisht të njëjtën përgjigje te mapper-i i commit-it bazë (kopje testimi e ngrirë te `tests/fixtures/ocr_baseline_app.js`) dhe te mapper-i i ri: `1.250,5` në peshimin 4/rreshtin 25 më parë mbetej bosh; tani bëhet `1250.5`. `6.11.26` mbetet bosh dhe paralajmërohet. Ky është test i përpunimit të përgjigjes, **jo test i aftësisë OCR**, dhe nuk tregon saktësi reale para/pas.

## Verifikim dhe kufizime

Testet Node përdorin Node 24, SheetJS/pdf-lib vendor dhe jsdom; testet Edge Deno përdorin `fetch` dhe `Deno.serve` mock. Testi i fotos përdor canvas dhe dekoder të simuluar: nuk provon EXIF, HEIC, përputhshmërinë e shfletuesit ose cilësinë reale. Nuk është kryer OCR real, testim Supabase, deploy, test në Microsoft Excel, printer, Playwright apo instalim live. Përpara përdorimit duhen kontrolle të integruara në shfletues dhe me kopje sintetike/anonime, si edhe përputhshmëria e skemës me modelin real Gemini. Nuk mund të garantohet kosto zero ose cilësi leximi.

Nga `tests/`, `npm ci` dhe `npm test` nën Node 24.22.2 përfunduan me exit 0: 61 teste plus kontrolli core. Nga rrënja e paketës `deno test --allow-env --allow-read tests/edge_function.test.ts` me Deno 2.9.6: 11 teste, exit 0. Testet janë offline/mock për shërbimet; prova e fotos nuk është një test real shfletuesi.
