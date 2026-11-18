# Një klik: lexo → plotëso → ruaj

## Qëllimi
Një buton i vetëm që lexon formularët, plotëson fushat me AI, ngarkon origjinalet
dhe ruan regjistrimet — pa asnjë konfirmim manual në mes. Saktësia mbahet e
lartë sepse ruhen vetëm formularët që kalojnë verifikim deterministik; të tjerët
kalojnë te lista e qelizave të dyshimta.

## Detyrat
- [x] 1. `batchBuildItems()` — nxjerr ndërtimin e artikujve nga `batchBeginReview`
- [x] 2. `batchPersist()` — nxjerr ruajtjen nga `batchSave` (upload + commit)
- [x] 3. `autoVerifyItem()` — porta e besimit: qeliza të dyshimta, aritmetikë, datë, numër, bosh
- [x] 4. `autoRun()` + `batchAutoFinish()` — tubacioni i një kliku
- [x] 5. Ruajtja e pëlqimit dhe e përgjegjësit të parazgjedhur (`biobes.auto.v1`)
- [x] 6. Mbrojtja nga dyprekja (signatura e skedarëve + zbërthimi i fundit)
- [x] 7. `autoUndoLast()` — zhbëj ruajtjen e fundit automatike
- [x] 8. UI: butoni "Një klik", rreshti i cilësimeve, CSS
- [x] 9. Teste `tests/one_click.test.js`
- [x] 10. `npm test` i gjelbër + SHA256SUMS
- [x] 11. Dokumentim (AUDITIM.md, UDHEZUESI.md)
- [x] 12. PR + publikim live
