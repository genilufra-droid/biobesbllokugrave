# BioBes — skema e leximit të formularëve (PARA / PAS, me disa formularë)

Ky dokument përshkruan saktësisht çfarë kthen leximi i një dokumenti BioBes dhe si
ndahet një PDF ose një grup fotosh që përmban **disa formularë të bashkuar**.

## 1. Rregullat e përgjithshme

- Dokumenti numërohet faqe për faqe (1, 2, 3 …) sipas rendit në skedar.
- Çdo formular ka **faqen PARA** dhe **faqen PAS**. Faqja PARA përmban të dhënat e
  ditës, planin, punonjësit dhe peshimet 1–3; faqja PAS përmban **KOMENTE** dhe
  peshimet 4–6 (të shtypura si PESHIMI 1–3 në anën e pasme të modelit).
- Faqet grupohen vetëm kur dokumenti e tregon vetë: tabelë peshimi me numër mbi 6,
  më shumë se një bllok komentesh ose numra formularësh të ndryshëm. Në dyshim,
  dokumenti lexohet si **një** formular dhe paralajmërohet.
- Informacioni i një formulari **nuk kalohet** te tjetri: numri, data, përgjegjësja,
  punonjësit, peshimet dhe komentet mbeten brenda formularit ku janë lexuar.
- Nuk hamendësohet dhe nuk plotësohet asnjë vlerë që nuk shihet.

## 2. Vlera, faqja, zona, siguria, needsReview

Për çdo vlerë kthehet:

| Fusha | Kuptimi |
|---|---|
| `value` | Vlera e lexuar, si tekst siç duket në letër. `null` kur fusha është bosh. |
| `page` | Numri i faqes ku ndodhet vlera (1, 2, 3 …). `null` kur nuk dihet. |
| `formArea` | Zona e formularit, p.sh. `Produkti 2 · Sasia e porositur`, `Punonjësi 4 · Fillim Pune`, `PESHIMI 2 (faqja PAS) · Kg`, `KOMENTE`. |
| `confidence` | Nivel sigurie nga 0 deri në 1 (numër). `null` kur modeli nuk jep siguri. |
| `needsReview` | `true` kur vlera duhet kontrolluar nga njeriu. |
| `readAs` | Shfaqet vetëm kur teksti i lexuar ndryshon nga vlera e pranuar (p.sh. `125 kg`). |

Vlera e paqartë nuk bëhet kurrë vlerë: shkruhet `"[e paqartë]"`, `value` mbetet
`null`, `needsReview` bëhet `true` dhe e njëjta gjë shënohet në `uncertain`.

## 3. ID-të e fushave (`fields`)

| ID | Zona |
|---|---|
| `nr`, `date`, `weekday`, `iso_week`, `room` | Të dhënat e ditës (faqja PARA) |
| `responsible.name`, `responsible.signature`, `assistant.name`, `assistant.signature` | Përgjegjëset |
| `total_hours` | Orë Gjithsej e faqes PARA |
| `plan.<1-3>.product|status|planned|actual|unit|packaging|client|comment` | Plani i punës |
| `employees.<1-12>.name|start|end|total_hours|comment|signature` | Punonjësit (Emri e Mbiemri, Fillim Pune, Mbarim Pune, Orë Gjithsej, Komente, Firma) |
| `weighings.<1-6>.product`, `weighings.<1-6>.source` | Tabelat e peshimit |
| `weighings.<1-6>.rows.<rreshti>.bags|kg|packaging|sum` | Rreshtat (Nr. thas., Kg, Ambalazhi, Shuma) |
| `weighings.<1-6>.total.bags|kg|packaging|sum` | Totali i shtypur (SH) |
| `comments` | KOMENTE e faqes PAS |

Peshimi 1–3 është në faqen PARA; peshimi 4–6 në faqen PAS. Numri i tabelës mbahet
gjithmonë siç është shtypur dhe rreshtat nuk zhvendosen midis kolonave.

## 4. Struktura e rezultatit

```json
{
  "document": { "fileName": "skanimet_e_bashkuara.pdf", "pageCount": 4, "formCount": 2 },
  "forms": [
    {
      "formNumber": 1,
      "pages": { "front": 1, "back": 2 },
      "header": { "nr": { "value": "071", "page": 1, "formArea": "Nr. i formularit", "confidence": 0.97, "needsReview": false } },
      "employees": [
        { "row": 1,
          "name": { "value": "Arta Shembulli", "page": 1, "formArea": "Punonjësi 1 · Emri e Mbiemri", "confidence": 0.9, "needsReview": false },
          "start": { "value": "07:00", "page": 1, "formArea": "Punonjësi 1 · Fillim Pune", "confidence": 0.95, "needsReview": false },
          "end": { "value": "16:00", "page": 1, "formArea": "Punonjësi 1 · Mbarim Pune", "confidence": 0.95, "needsReview": false },
          "totalHours": { "value": "9", "page": null, "formArea": "Punonjësi 1 · Orë Gjithsej (llogaritur nga orari)", "confidence": null, "needsReview": false },
          "comment": { "value": null, "page": 1, "formArea": "Punonjësi 1 · Komente", "confidence": null, "needsReview": false },
          "signature": { "value": "firmë", "page": 1, "formArea": "Punonjësi 1 · Firma e Punonjësit", "confidence": null, "needsReview": false } }
      ],
      "weights": {
        "peshimi1": [
          { "table": 1, "row": 1,
            "nrThas": { "value": "5", "page": 1, "formArea": "PESHIMI 1 · faqja PARA · rreshti 1 · Nr. thas.", "confidence": 0.92, "needsReview": false },
            "kg": { "value": "125", "page": 1, "formArea": "PESHIMI 1 · faqja PARA · rreshti 1 · Kg", "confidence": 0.9, "needsReview": false } },
          { "table": 4, "row": 1,
            "nrThas": { "value": "2", "page": 2, "formArea": "PESHIMI 1 · faqja PAS · rreshti 1 · Nr. thas.", "confidence": 0.9, "needsReview": false },
            "kg": { "value": "50", "page": 2, "formArea": "PESHIMI 1 · faqja PAS · rreshti 1 · Kg", "confidence": 0.9, "needsReview": false } }
        ],
        "peshimi2": [], "peshimi3": []
      },
      "comments": [ { "value": "Dorëzim i plotë", "page": 2, "formArea": "KOMENTE", "confidence": 0.85, "needsReview": false } ],
      "uncertain": [ { "value": null, "page": 1, "formArea": "Punonjësi 2", "confidence": 0.3, "needsReview": true, "readAs": "Besa P." } ],
      "needsReview": true,
      "warnings": []
    }
  ]
}
```

`document.pageCount` është numri i faqeve të dokumentit, `document.formCount` numri i
formularëve të gjetur. `weights.peshimi1..3` janë tre kolonat e peshimit të modelit;
çdo rresht mban `table` (numri i shtypur, 1–6) dhe `page`, që peshimi 4 i faqes PAS
të mos ngatërrohet me peshimin 1 të faqes PARA.

## 5. Si sillet faqja e aplikacionit

- Në **Lexo formularë**, një PDF ose Word i tërë lexohet vetëm. Nëse përmban disa
  formularë, çdo formular hapet si **kartë kontrolli më vete** (deri në 10), me
  numrin e vet, paralajmërimet e veta dhe faqet PARA/PAS.
- **PDF-ja e skanuar nuk ka kufi 6 faqesh.** Një skanim me shumë faqe (p.sh. 7
  formularë në 14 faqe) dërgohet për lexim në pjesë nga 6 faqe dhe ribashkohet
  si **një dokument i vetëm**: numrat e faqeve mbeten ata të PDF-së (1 … N), jo
  të pjesës. Kufiri i vërtetë është 20 faqe (10 formularë × 2); mbi kaq, skanimi
  ndahet në dy skedarë. Kur një formular pritet mes dy pjesëve, peshimet e tij
  bashkohen te formulari i vetëm — nuk hapet formular i rremë.
- **Zona si kod.** Modeli e kthen zonën si kod të shkurtër (`w1.r3.kg`,
  `p1.planned`, `e5.start`) dhe aplikacioni e shfaq të plotë (“PESHIMI 1 · faqja
  PARA · rreshti 3 · Kg”). Kjo e shkurton daljen ~31% pa humbur asnjë informacion.
  Kur modeli nuk e dërgon zonën, ajo ndërtohet nga fusha e kërkuar.
- **Cache i leximit.** I njëjti skedar nuk rilexohet: hash-i SHA-256 i
  përmbajtjes e gjen leximin në pajisje për 7 ditë (max 40). Cache-i hidhet vetë
  kur ndryshon `READ_CACHE_VERSION`.
- Paneli **“Vendndodhja e çdo vlere”** tregon për çdo vlerë: fushën, vlerën e lexuar,
  faqen, zonën e formularit, sigurinë dhe `needsReview`. Rreshtat për kontroll janë të
  theksuar.
- Ndarja me dorë (“çdo 2 faqe = një formular” ose “çdo faqe = një formular”) mbetet
  vetëm si mundësi e veçantë; ajo bëhet në pajisje, para leximit.

## 6. Ndihma e parapranuesit lokal OCR (`ocrHints`)

Kërkesa drejt Edge Function-it `biobes-read-form` pranon një fushë **opsionale**
`ocrHints`: një listë e shkurtër njoftimesh për faqet, të prodhuar në pajisje para
dërgimit. Ajo nuk zëvendëson leximin dhe nuk përmban asnjë vlerë të lexuar.

```json
{
  "parts": [ "…" ],
  "consent": true, "anonymous": true, "freeTier": true,
  "ocrHints": [
    { "page": 1, "type": "front", "quality": 92, "labels": ["PLANI I PUNES"], "issues": [] },
    { "page": 2, "type": "back",  "quality": 88, "labels": ["KOMENTE"],        "issues": ["skanim i pjerrët"] }
  ]
}
```

| Fusha | Kuptimi |
|---|---|
| `page` | Numri i faqes brenda kërkesës (1 … 30). Numër i plotë, i detyrueshëm. |
| `type` | `front`, `back` ose `unknown`. Çdo vlerë tjetër bëhet `unknown`. |
| `quality` | Vlerësim 0–100 i cilësisë së skanimit; `null` kur nuk matet. Kufizohet në interval. |
| `labels` | Deri në 14 etiketa të shtypura të njohura në faqe (max 40 karaktere secila). |
| `issues` | Deri në 5 shënime të shkurtra për cilësinë (max 60 karaktere secila). |

Rregullat e pranimit: lista lejohet vetëm me deri në 30 elemente; çdo element duhet
të jetë objekt me `page` të vlefshme. Nëse `ocrHints` është i keqformuar, kërkesa
refuzohet me **400** (nuk anashkalohet në heshtje). Njoftimet i shtohen promptit si
një bllok tekstual që fillon me “PARAPRANUES LOKAL OCR (i pabesueshëm: vetëm
ndihmë, jo burim i vërtetë)” dhe mbaron me “Lexo gjithmonë vetë dokumentin; nëse
hints kundërshton figures, beso figures”. Modeli udhëzohet të verifikojë
përmbajtjen, prandaj një hint i gabuar nuk e prish leximin.

Dy prodhues e mbushin këtë fushë:

- **Në shfletues** (`ocrHintsFromPageCounts` në `web/app.js`): numëron faqet e PDF-së
  dhe supozon rendin PARA/PAS vetëm kur numri i faqeve është çift (ose kur zgjidhen
  dy foto bashkë). Nuk lexon tekst, nuk mat cilësi, nuk dërgon vlera.
- **Në pajisje, me CLI** (`tools/ocr_prepass.py`): RapidOCR/PP-OCRv5, pa internet,
  në CPU. Njeh etiketat e shtypura, mat DPI, pjerrësinë, turbullirën dhe
  mbushjen me bojë, grupo faqet në formulare dhe shkruan `ocrHints` me `--hints-only`.

## 7. Kufijtë

- Deri në 10 formularë për dokument; më shumë ndahet në përpunime të veçanta.
- Për një formular: 3 produkte, 12 punonjës, 6 tabela peshimi (25 rreshta secila).
- Vlera që nuk shihet mbetet `null`; nuk plotësohet me zero, me rreshtin sipër ose me
  vlerën e një formulari tjetër.
- Leximi me Gemini duhet kontrolluar nga njeriu përpara ruajtjes; shih `AUDITIM.md`.
