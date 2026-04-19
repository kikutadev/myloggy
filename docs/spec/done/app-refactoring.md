# App.tsx リファクタリング提案

## 現状の課題

`src/App.tsx` は 1169 行の巨大ファイルであり、以下の問題が深刻である:

1. **責務の混在**: ユーティリティ、フォーマットロジック、UI コンポーネント、Hooks、ビジネスロジックが1ファイルに同居
2. **テスト困難**: `summarizeErrorMessage`, `translateStructuredIssue` などの純粋関数が UI コンポーネントと密結合
3. **保守性低下**: 単一責任の原則に反し、変更時の影響範囲が大きい

## 提案: ディレクトリ構成（機能単位での凝集）

```
src/
├── App.tsx                          # エントリーポイントのみ（~150行）
├── features/
│   ├── DayView/
│   │   ├── DayView.tsx              # コンポーネント本体
│   │   ├── ratioWidth.ts            # DayView専用のUtil
│   │   └── index.ts                 # 再エクスポート
│   ├── WeekView/
│   │   ├── WeekView.tsx
│   │   └── index.ts
│   ├── MonthView/
│   │   ├── MonthView.tsx
│   │   ├── MonthCell.tsx
│   │   └── index.ts
│   ├── WorkUnitEditor/
│   │   ├── WorkUnitEditor.tsx       # コンポーネント本体
│   │   ├── useWorkUnitEditor.ts     # State管理ロジック（ colocate）
│   │   ├── toStoredCategoryLabel.ts # 関連するUtil
│   │   └── index.ts
│   ├── Settings/
│   │   ├── SettingsModal.tsx
│   │   ├── CategoryEditor.tsx
│   │   ├── ExclusionListEditor.tsx
│   │   ├── useSettings.ts           # State管理ロジック
│   │   └── index.ts
│   ├── Debug/
│   │   ├── DebugModal.tsx
│   │   ├── useDebugModal.ts         # State管理ロジック
│   │   └── index.ts
│   ├── Onboarding/
│   │   ├── Onboarding.tsx
│   │   ├── OnboardingStep0.tsx
│   │   ├── OnboardingStep1.tsx
│   │   ├── OnboardingStep2.tsx
│   │   ├── OnboardingStep3.tsx
│   │   ├── checkOllama.ts           # ロジック
│   │   └── index.ts
│   ├── AppScreen/
│   │   ├── AppScreen.tsx
│   │   ├── useAppScreen.ts          # ビジネスロジック
│   │   ├── useAnalyze.ts
│   │   ├── useClearSnapshots.ts
│   │   ├── useClearErrors.ts
│   │   └── index.ts
│   └── shared/                      # 複数機能で共用
│       ├── CategoryBars.tsx
│       ├── ProjectTable.tsx
│       ├── CheckpointList.tsx
│       ├── AnalysisErrorBanner.tsx  # AnalysisErrorNotice をリネーム
│       ├── LoadingScreen.tsx
│       ├── navigateDate.ts          # 日付ナビゲーション
│       └── index.ts
├── i18n.ts                          # 既存維持
└── types.ts                         # ViewMode などマイナーな型定義
```

## 責務分割の詳細

### 設計原則: 凝集度重視（Colocation）

「特定のコンポーネントでしか使わないロジックは、そのコンポーネントと同じフォルダに配置する」

```
WorkUnitEditor/
├── WorkUnitEditor.tsx    # UI の責任
├── useWorkUnitEditor.ts  # State管理（同じフォルダ）
└── toStoredCategoryLabel.ts  # 関連Util（同じフォルダ）
```

**利点**:
- 関連コードが物理的に近接し、可読性向上
- 機能追加・修正時に変更箇所が集中
- テストも同一フォルダに配置可能

### shared/ の切り出し基準

複数の機能で共用されるコンポーネントのみを `shared/` 配下へ:
- `CategoryBars`, `ProjectTable`, `CheckpointList` など

共用ロジック（例: `navigateDate`）も `shared/` 配下に配置

## 移行計画（段階的）

### Phase 1: MonthView の分離（最小リスク）

MonthView と MonthCell は relatively independent なので最初に移行

```
MonthView/
├── MonthView.tsx
├── MonthCell.tsx
└── index.ts
```

### Phase 2: WeekView の分離

WeekView を同じパターンで抽出

### Phase 3: DayView + WorkUnitEditor の分離

WorkUnitEditor と共にするため、DayView と同時に実施

### Phase 4: SettingsModal + 関連Editor の分離

CategoryEditor, ExclusionListEditor は SettingsModal だけで使用

### Phase 5: DebugModal の分離

### Phase 6: Onboarding の分離

OnboardingStep0-3 を個別のコンポーネントに分割

### Phase 7: AppScreen + App.tsx の簡素化

ロジックを useAppScreen.ts, useAnalyze.ts, useClearSnapshots.ts, useClearErrors.ts に分離

## テスト戦略

テストファイルは**対象と同じフォルダに配置**（Colocation）

```
WorkUnitEditor/
├── WorkUnitEditor.tsx
├── useWorkUnitEditor.ts
├── useWorkUnitEditor.test.ts    # Hook の Unit Test
└── WorkUnitEditor.test.tsx      # Component の Test
```

| 対象 | テスト方法 | ツール |
|------|-----------|--------|
| Feature 内 Util (例: navigateDate) | Unit Test（純粋関数） | Vitest |
| useXXX hooks | Unit Test（renderHook） | Vitest + @testing-library/react |
| Components | Component Test | Vitest + @testing-library/react |
| Integration | E2E Test | Playwright（既存） |

### Unit Test の例

```typescript
// features/shared/navigateDate.test.ts
import { describe, it, expect } from 'vitest';
import { navigateDate } from './navigateDate';

describe('navigateDate', () => {
  it('navigates day view forward', () => {
    expect(navigateDate(1, 'day', '2024-01-15')).toBe('2024-01-16');
  });

  it('navigates week view backward', () => {
    expect(navigateDate(-1, 'week', '2024-01-15')).toBe('2024-01-08');
  });
});
```

## 期待される効果

| 指標 | 改善前 | 改善後 |
|------|--------|--------|
| App.tsx 行数 | 1169 | ~150 |
| ファイル別 行数 | 全て1ファイル | 50-200/ファイル |
| Feature Unit Test 覆盖率 | 0% | 80%+（各 feature ごと）|

## 注意事項

- `I18nProvider` / `useI18n` は既存の i18n.ts を維持
- 型定義は `shared/types.ts` をそのまま使用
- 移行は後方互換を保ちながら段階的に実施
- 各 feature の屋外書き出しは `index.ts` で提供
- 共用ロジックは `shared/` フォルダで管理