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
- Paneli **“Vendndodhja e çdo vlere”** tregon për çdo vlerë: fushën, vlerën e lexuar,
  faqen, zonën e formularit, sigurinë dhe `needsReview`. Rreshtat për kontroll janë të
  theksuar.
- Ndarja me dorë (“çdo 2 faqe = një formular” ose “çdo faqe = një formular”) mbetet
  vetëm si mundësi e veçantë; ajo bëhet në pajisje, para leximit.

## 6. Kufijtë

- Deri në 10 formularë për dokument; më shumë ndahet në përpunime të veçanta.
- Për një formular: 3 produkte, 12 punonjës, 6 tabela peshimi (25 rreshta secila).
- Vlera që nuk shihet mbetet `null`; nuk plotësohet me zero, me rreshtin sipër ose me
  vlerën e një formulari tjetër.
- Leximi me Gemini duhet kontrolluar nga njeriu përpara ruajtjes; shih `AUDITIM.md`.
