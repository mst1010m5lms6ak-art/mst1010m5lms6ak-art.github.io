import { useState } from 'preact/hooks';
import { sound } from '../engine/sound';
import { exportSaveCode, importSaveCode } from '../engine/storage';
import type { AutoSellSettings, BattleSpeed, SaveData, UserSettings } from '../types/game';

interface SettingsScreenProps {
  save: SaveData;
  onUpdateSettings: (next: UserSettings) => void;
  onImportSave: (imported: SaveData) => void;
  onResetSave: () => void;
}

export function SettingsScreen({ save, onUpdateSettings, onImportSave, onResetSave }: SettingsScreenProps) {
  const [codeText, setCodeText] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const st = save.settings;

  const patch = (partial: Partial<UserSettings>) => {
    sound.tap();
    onUpdateSettings({ ...st, ...partial });
  };

  const setAutoSell = (maxRarity: AutoSellSettings['maxRarity']) => {
    sound.tap();
    onUpdateSettings({
      ...st,
      autoSell: { enabled: maxRarity !== 'none', maxRarity }
    });
  };

  return (
    <div class="screen-wrap">
      <div class="screen-head">
        <div>
          <div class="screen-title">設定・セーブ管理</div>
          <div class="screen-sub">
            総勝利 {save.totalWins} / 混沌発動 {save.totalChaosTriggered}回
          </div>
        </div>
      </div>

      <div class="screen-list scroll-area">
        <div class="card-box">
          <div style={{ fontSize: '12px', fontWeight: 900, color: '#29d2ff' }}>片手操作レイアウト</div>
          <div class="chip-bar">
            <button
              type="button"
              class={`chip-btn ${st.handedness === 'right' ? 'active' : ''}`}
              onClick={() => patch({ handedness: 'right' })}
            >
              右利き配置
            </button>
            <button
              type="button"
              class={`chip-btn ${st.handedness === 'left' ? 'active' : ''}`}
              onClick={() => patch({ handedness: 'left' })}
            >
              左利き配置
            </button>
          </div>
        </div>

        <div class="card-box">
          <div style={{ fontSize: '12px', fontWeight: 900, color: '#ffd94a' }}>戦闘・周回設定</div>
          <div style={{ fontSize: '11px', color: 'var(--txt-sub)' }}>初期バトル速度</div>
          <div class="chip-bar">
            {([1, 2, 3] as BattleSpeed[]).map((sp) => (
              <button
                key={sp}
                type="button"
                class={`chip-btn ${st.defaultSpeed === sp ? 'active' : ''}`}
                onClick={() => patch({ defaultSpeed: sp })}
              >
                {sp}倍速
              </button>
            ))}
          </div>

          <div class="chip-bar" style={{ marginTop: '4px' }}>
            <button
              type="button"
              class={`chip-btn ${st.defaultAuto ? 'active' : ''}`}
              onClick={() => patch({ defaultAuto: !st.defaultAuto })}
            >
              出撃時AUTO: {st.defaultAuto ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              class={`chip-btn ${st.autoChaosOrb ? 'active' : ''}`}
              onClick={() => patch({ autoChaosOrb: !st.autoChaosOrb })}
            >
              オート時オーブ自動: {st.autoChaosOrb ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <div class="card-box">
          <div style={{ fontSize: '12px', fontWeight: 900, color: '#38f29b' }}>ドロップ装備の自動売却</div>
          <div class="chip-bar">
            {(['none', 'N', 'R', 'SR'] as AutoSellSettings['maxRarity'][]).map((r) => {
              const active = (!st.autoSell.enabled && r === 'none') || (st.autoSell.enabled && st.autoSell.maxRarity === r);
              return (
                <button
                  key={r}
                  type="button"
                  class={`chip-btn ${active ? 'active' : ''}`}
                  onClick={() => setAutoSell(r)}
                >
                  {r === 'none' ? 'OFF' : `${r}以下`}
                </button>
              );
            })}
          </div>
        </div>

        <div class="card-box">
          <div style={{ fontSize: '12px', fontWeight: 900, color: '#d07bff' }}>サウンド設定</div>
          <div class="chip-bar">
            <button
              type="button"
              class={`chip-btn ${st.seEnabled ? 'active' : ''}`}
              onClick={() => patch({ seEnabled: !st.seEnabled })}
            >
              効果音: {st.seEnabled ? 'ON' : 'OFF'}
            </button>
            {[0.25, 0.45, 0.75].map((vol) => (
              <button
                key={vol}
                type="button"
                class={`chip-btn ${Math.abs(st.seVolume - vol) < 0.05 ? 'active' : ''}`}
                onClick={() => patch({ seVolume: vol })}
              >
                {vol === 0.25 ? '小' : vol === 0.45 ? '中' : '大'}
              </button>
            ))}
          </div>
        </div>

        <div class="card-box">
          <div style={{ fontSize: '12px', fontWeight: 900 }}>セーブデータ引継ぎ・バックアップ</div>
          <textarea
            rows={2}
            value={codeText}
            onInput={(e) => setCodeText((e.target as HTMLTextAreaElement).value)}
            placeholder="バックアップコードをここに貼り付け"
            style={{
              width: '100%',
              background: 'rgba(0,0,0,0.38)',
              border: '1px solid var(--line-soft)',
              borderRadius: '8px',
              padding: '6px 8px',
              resize: 'none'
            }}
          />
          <div class="thumb-row">
            <button
              type="button"
              class="btn-cyan"
              style={{ flex: 1 }}
              onClick={() => {
                sound.tap();
                const code = exportSaveCode(save);
                setCodeText(code);
                if (navigator.clipboard?.writeText) {
                  navigator.clipboard.writeText(code).catch(() => {});
                }
                setNotice('セーブコードを出力しました（コピー済）');
              }}
            >
              コード書き出し
            </button>
            <button
              type="button"
              class="btn-ghost"
              style={{ flex: 1 }}
              onClick={() => {
                sound.tap();
                const parsed = importSaveCode(codeText);
                if (!parsed) {
                  setNotice('コードの形式が正しくありません');
                  return;
                }
                onImportSave(parsed);
                setNotice('セーブデータを復元しました！');
              }}
            >
              コード復元
            </button>
          </div>
          {notice && <div style={{ fontSize: '11px', color: '#ffd94a', fontWeight: 800 }}>{notice}</div>}
        </div>

        <div class="card-box" style={{ borderColor: 'rgba(255,59,107,0.3)' }}>
          <button type="button" class="btn-danger" onClick={() => setConfirmReset(true)}>
            セーブデータを初期化
          </button>
        </div>
      </div>

      {confirmReset && (
        <div class="modal-backdrop">
          <div class="modal-sheet" style={{ maxHeight: '42%' }}>
            <div class="modal-header">
              <span style={{ fontSize: '14px', fontWeight: 900, color: '#ff5268' }}>データ初期化の確認</span>
            </div>
            <div class="modal-body" style={{ fontSize: '12px', color: 'var(--txt-sub)' }}>
              すべての進行・仲間・装備が初期状態に戻ります。よろしいですか？
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmReset(false)}>
                キャンセル
              </button>
              <button
                type="button"
                class="btn-danger"
                style={{ flex: 1 }}
                onClick={() => {
                  setConfirmReset(false);
                  onResetSave();
                  setNotice('データを初期化しました');
                }}
              >
                初期化する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
