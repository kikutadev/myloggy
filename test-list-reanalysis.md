# Reanalysis Feature - Test List

## SnapshotRepository.resetProcessedBetween
- [ ] 対象日の processed snapshot を captured / checkpoint_id=null / analysis_attempts=0 に戻す
- [ ] 対象日外の snapshot は変更しない
- [ ] analysis_failed 状態の snapshot は変更しない
- [ ] captured 状態の snapshot は変更しない（既に未処理なので）

## CheckpointRepository.deleteBetween
- [ ] 対象日の completed checkpoint を削除する
- [ ] 対象日外の checkpoint は削除しない
- [ ] failed 状態の checkpoint は削除しない

## WorkUnitRepository.deleteBetween
- [ ] 対象日の work_unit を削除する
- [ ] 日付境界（前日23:50〜当日00:10）を持つ work_unit も正しく削除される
- [ ] 対象日外の work_unit は削除しない

## AppDatabase.resetAnalysisForDate
- [ ] トランザクション内で snapshots 巻き戻し / checkpoints 削除 / work_units 削除が実行される
- [ ] 戻り値に各テーブルの影響件数が含まれる
- [ ] 一部失敗した場合は全てロールバックされる

## TrackerService.reanalyzeDate
- [ ] 対象日の解析結果を削除し、analyzeReadyWindows(force=true) を呼び出す
- [ ] 対象日に processed snapshot がない場合もエラーにならず完了する
