# 未処理記録の削除に関する問題

## 現象
未処理記録（pendingSnapshots）をクリックすると、確認もなく削除されてしまう

## 調査結果

### 原因の特定

**問題箇所 (`AppScreen.tsx` 行88-95)**

```tsx
<button
  className="top-bar-counter top-bar-counter-btn"
  disabled={!state.pendingSnapshots || clearingPending}
  onClick={() => { void clearPendingSnapshots(state.pendingSnapshots); }}
  title={locale === 'ja' ? 'タップでクリア' : 'Tap to clear'}
>
  {text.pendingSnapshotsLabel}: {state.pendingSnapshots}
</button>
```

クリックハンドラ `onClick={() => { void clearPendingSnapshots(state.pendingSnapshots); }}` が直接呼び出されており、確認処理が何もない。

### 確認 Modal の例

既存のModalパターン（`SettingsModal.tsx`, `DebugModal.tsx`）では:
```tsx
<div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
  <div className="modal-content">
    <div className="modal-header">...</div>
    <div className="modal-footer">
      <button onClick={onClose}>{text.cancel}</button>
      <button onClick={handleConfirm}>{text.confirm}</button>
    </div>
  </div>
</div>
```

## 解決方法

1. 確認Modalコンポーネントを作成する（例：`ClearPendingConfirmModal`）
2. i18nに以下のテキストを追加:
   - `confirmClearPending: string` - 「未処理記録を削除しますか？」
   - `confirmClearPendingDescription: string` - 「この操作は取り消せません」
3. `AppScreen.tsx` に state 管理（`clearConfirmOpen`等）を追加
4. クリック時にModalを表示し、確認后才执行削除処理