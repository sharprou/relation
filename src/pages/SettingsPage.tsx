import { useEffect, useRef, useState } from 'react'
import { Download, FileUp, ShieldAlert, Smartphone, Trash2 } from 'lucide-react'
import ConfirmDialog from '../components/common/ConfirmDialog'
import PageShell from '../components/common/PageShell'
import { clearAllLocalData, downloadBackupFile, importBackup, validateBackupData } from '../features/backup/backupService'
import { getAppSettings, markOnboardingSeen } from '../features/settings/settingsService'
import { addTag, deleteTag, listTags, updateTag, type TagFormInput } from '../features/tags/tagService'
import type { AppSettings, BackupData, TagItem } from '../types'

const TAG_COLOR_PRESETS = ['#f1e9ff', '#dff6eb', '#e5efff', '#ffe6ee', '#fff0d8', '#edf0fb']

type BackupConfirmAction = 'import' | 'clear' | null

function getDefaultTagForm(): TagFormInput {
  return {
    name: '',
    color: TAG_COLOR_PRESETS[0],
  }
}

function getBackupAge(lastBackupAt?: string): { label: string; days: number } {
  if (!lastBackupAt) return { label: '上次备份：从未备份', days: Number.POSITIVE_INFINITY }

  const backupDate = new Date(lastBackupAt)
  if (Number.isNaN(backupDate.getTime())) return { label: `上次备份：${lastBackupAt.slice(0, 10)}`, days: 0 }

  const days = Math.max(0, Math.floor((Date.now() - backupDate.getTime()) / 86400000))
  if (days === 0) return { label: '上次备份：今天', days }

  return { label: `上次备份：${days} 天前`, days }
}

export default function SettingsPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [tags, setTags] = useState<TagItem[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [tagForm, setTagForm] = useState<TagFormInput>(getDefaultTagForm())
  const [editingTagId, setEditingTagId] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<TagItem | null>(null)
  const [backupConfirmAction, setBackupConfirmAction] = useState<BackupConfirmAction>(null)
  const [pendingImportData, setPendingImportData] = useState<BackupData | null>(null)
  const [isBackupBusy, setIsBackupBusy] = useState(false)
  const [error, setError] = useState('')
  const [backupMessage, setBackupMessage] = useState('')

  const refreshTags = async () => {
    setTags(await listTags())
  }

  const refreshSettings = async () => {
    setSettings(await getAppSettings())
  }

  useEffect(() => {
    Promise.all([refreshTags(), refreshSettings()]).catch((err) => {
      setError(err instanceof Error ? err.message : '标签读取失败')
    })
  }, [])

  const resetForm = () => {
    setEditingTagId('')
    setTagForm(getDefaultTagForm())
    setError('')
  }

  const submitTag = async () => {
    try {
      if (editingTagId) {
        await updateTag(editingTagId, tagForm)
      } else {
        await addTag(tagForm)
      }

      await refreshTags()
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : '标签保存失败')
    }
  }

  const startEditTag = (tag: TagItem) => {
    setEditingTagId(tag.id)
    setTagForm({ name: tag.name, color: tag.color })
    setError('')
  }

  const confirmDeleteTag = async () => {
    if (!deleteTarget) return

    try {
      await deleteTag(deleteTarget.id)
      await refreshTags()
      setDeleteTarget(null)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : '标签删除失败')
    }
  }

  const handleExportBackup = async () => {
    try {
      setIsBackupBusy(true)
      setBackupMessage('')
      await downloadBackupFile()
      await refreshSettings()
      setBackupMessage('JSON 备份已生成，请在浏览器下载记录中查看。')
    } catch (err) {
      setBackupMessage(err instanceof Error ? err.message : '导出备份失败')
    } finally {
      setIsBackupBusy(false)
    }
  }

  const openImportPicker = () => {
    setBackupMessage('')
    fileInputRef.current?.click()
  }

  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    try {
      setIsBackupBusy(true)
      setBackupMessage('')
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown

      if (!validateBackupData(parsed)) {
        setBackupMessage('备份文件格式不正确，无法导入。')
        return
      }

      setPendingImportData(parsed)
      setBackupConfirmAction('import')
    } catch {
      setBackupMessage('备份文件格式不正确，无法导入。')
    } finally {
      setIsBackupBusy(false)
    }
  }

  const cancelBackupConfirm = () => {
    setBackupConfirmAction(null)
    setPendingImportData(null)
  }

  const confirmBackupAction = async () => {
    try {
      setIsBackupBusy(true)
      setBackupMessage('')

      if (backupConfirmAction === 'import' && pendingImportData) {
        await importBackup(pendingImportData)
        await refreshTags()
        await refreshSettings()
        setBackupMessage('JSON 备份已导入，本地数据已恢复。')
      }

      if (backupConfirmAction === 'clear') {
        await clearAllLocalData()
        await refreshTags()
        await refreshSettings()
        resetForm()
        setBackupMessage('本地数据已清空，并已重新创建“我”节点。')
      }

      cancelBackupConfirm()
    } catch (err) {
      setBackupMessage(err instanceof Error ? err.message : '操作失败，请稍后重试')
    } finally {
      setIsBackupBusy(false)
    }
  }

  const backupConfirmTitle = backupConfirmAction === 'clear' ? '清空本地数据' : '导入 JSON 备份'
  const importPreview = pendingImportData
    ? `将导入：${pendingImportData.persons.length} 个人物、${pendingImportData.relationships.length} 条关系、${pendingImportData.events.length} 个事件、${pendingImportData.tags.length} 个标签。`
    : ''
  const backupConfirmMessage =
    backupConfirmAction === 'clear'
      ? '此操作会删除所有本地数据，建议先导出备份。是否继续？'
      : `${importPreview} 导入会覆盖当前本地数据，建议先导出备份。是否继续？`
  const backupConfirmLabel = backupConfirmAction === 'clear' ? '清空数据' : '覆盖导入'
  const backupAge = getBackupAge(settings?.lastBackupAt)
  const backupReminder = !settings?.lastBackupAt || backupAge.days > 7
  const reopenOnboarding = async () => {
    await markOnboardingSeen(false)
    await refreshSettings()
    setBackupMessage('新手引导已准备好，回到图谱页就能重新查看。')
  }

  return (
    <PageShell
      eyebrow="Settings"
      title="设置"
      description="管理本地配置、标签和数据安全。所有数据仅保存在当前设备的 IndexedDB 中。"
    >
      <div className="space-y-4">
        <section className="rounded-[1.5rem] bg-white/88 p-4 shadow-soft ring-1 ring-violet/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-violet">Backup</p>
              <h2 className="mt-1 text-lg font-semibold text-ink">数据备份与恢复</h2>
              <p className="mt-1 text-sm leading-6 text-ink/60">
                数据仅保存在当前设备本地。更换设备、清理浏览器缓存或删除网站数据可能导致数据丢失，建议定期导出 JSON 备份。
              </p>
            </div>
            <ShieldAlert className="mt-1 h-5 w-5 shrink-0 text-lake" aria-hidden="true" />
          </div>

          <div className="mt-4 grid gap-3">
            <div className={`rounded-2xl px-4 py-3 text-sm leading-6 ring-1 ${backupReminder ? 'bg-[#fff0f4] text-rose ring-rose/12' : 'bg-paper text-ink/66 ring-violet/10'}`}>
              <p className="font-black text-ink">数据保存在本机浏览器中</p>
              <p className="mt-1">建议定期导出 JSON 备份，避免更换设备或清理浏览器后数据丢失。</p>
              <p className="mt-2 font-bold">{backupAge.label}</p>
              {backupReminder ? <p className="mt-1 text-xs font-bold">已经一周没有备份啦，建议导出一次 JSON。</p> : null}
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-3 rounded-2xl bg-lake/10 px-4 py-3 text-left text-sm font-medium text-ink ring-1 ring-lake/20 disabled:opacity-60"
              onClick={handleExportBackup}
              disabled={isBackupBusy}
            >
              <Download className="h-5 w-5 text-lake" aria-hidden="true" />
              <span><span className="block">导出 JSON 备份</span><span className="block text-xs font-normal text-ink/55">下载当前所有数据</span></span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-3 rounded-2xl bg-sage/10 px-4 py-3 text-left text-sm font-medium text-ink ring-1 ring-sage/20 disabled:opacity-60"
              onClick={openImportPicker}
              disabled={isBackupBusy}
            >
              <FileUp className="h-5 w-5 text-sage" aria-hidden="true" />
              <span><span className="block">导入 JSON 备份</span><span className="block text-xs font-normal text-ink/55">从备份文件恢复数据</span></span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-3 rounded-2xl bg-rose/10 px-4 py-3 text-left text-sm font-medium text-rose ring-1 ring-rose/25 disabled:opacity-60"
              onClick={() => setBackupConfirmAction('clear')}
              disabled={isBackupBusy}
            >
              <Trash2 className="h-5 w-5" aria-hidden="true" />
              <span><span className="block">清空本地数据</span><span className="block text-xs font-normal text-rose/70">删除所有本地数据，不可恢复</span></span>
            </button>
          </div>

          <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFileChange} />

          {backupMessage ? <p className="mt-3 rounded-2xl bg-paper px-4 py-3 text-sm leading-6 text-ink/70">{backupMessage}</p> : null}
        </section>

        <section className="rounded-[1.5rem] bg-white/88 p-4 shadow-soft ring-1 ring-violet/10">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-violet">Guide</p>
          <h2 className="mt-1 text-lg font-semibold text-ink">新手引导</h2>
          <p className="mt-1 text-sm leading-6 text-ink/60">想重新看一遍关系图谱的基本玩法，可以从这里打开。</p>
          <button type="button" className="mt-4 rounded-2xl bg-violetMist px-4 py-3 text-sm font-bold text-violet ring-1 ring-violet/10" onClick={reopenOnboarding}>
            重新查看新手引导
          </button>
        </section>

        <section className="rounded-[1.5rem] bg-white/88 p-4 shadow-soft ring-1 ring-violet/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-violet">Tags</p>
              <h2 className="mt-1 text-lg font-semibold text-ink">标签管理</h2>
              <p className="mt-1 text-sm leading-6 text-ink/60">标签会写入人物资料，可用于人物页和图谱页筛选。</p>
            </div>
            <button type="button" className="shrink-0 rounded-2xl bg-violet px-4 py-2 text-sm font-medium text-white" onClick={resetForm}>
              新增标签
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-ink">标签名称</span>
              <input
                className="rounded-2xl border border-violet/10 bg-paper px-4 py-3 text-sm outline-none focus:border-violet/35"
                value={tagForm.name}
                onChange={(event) => setTagForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="例如：可靠"
              />
            </label>

            <div className="grid gap-2">
              <span className="text-sm font-medium text-ink">颜色</span>
              <div className="flex flex-wrap gap-2">
                {TAG_COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`h-9 w-9 rounded-full ring-2 ${tagForm.color === color ? 'ring-violet/55' : 'ring-white'}`}
                    style={{ backgroundColor: color }}
                    title={color}
                    onClick={() => setTagForm((current) => ({ ...current, color }))}
                  />
                ))}
              </div>
            </div>

            {error ? <p className="text-sm text-rose-700">{error}</p> : null}

            <div className="flex gap-3">
              {editingTagId ? (
                <button type="button" className="flex-1 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-ink ring-1 ring-violet/10" onClick={resetForm}>
                  取消编辑
                </button>
              ) : null}
              <button type="button" className="flex-1 rounded-2xl bg-violet px-4 py-3 text-sm font-medium text-white" onClick={submitTag}>
                {editingTagId ? '保存标签' : '新增标签'}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[1.5rem] bg-white/88 p-4 shadow-soft ring-1 ring-violet/10">
          <h2 className="text-base font-semibold text-ink">已有标签</h2>
          {tags.length > 0 ? (
            <div className="mt-3 space-y-3">
              {tags.map((tag) => (
                <div key={tag.id} className="flex items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{tag.name}</p>
                      <p className="text-xs text-ink/50">{tag.color}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-ink ring-1 ring-violet/10" onClick={() => startEditTag(tag)}>
                      编辑
                    </button>
                    <button type="button" className="rounded-full bg-rose/10 px-3 py-1.5 text-xs font-medium text-rose" onClick={() => setDeleteTarget(tag)}>
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-2xl bg-paper px-4 py-6 text-center text-sm text-ink/60">还没有标签，可以先从“可靠”“同事”这类小线索开始。</div>
          )}
        </section>

        <section className="rounded-[1.5rem] bg-white/88 p-4 shadow-soft ring-1 ring-violet/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-violet">Install</p>
              <h2 className="mt-1 text-lg font-semibold text-ink">添加到主屏幕</h2>
              <p className="mt-1 text-sm leading-6 text-ink/60">
                本应用数据保存在当前设备本地。添加到主屏幕后，数据仍然只保存在本机，不会上传到服务器。
              </p>
            </div>
            <Smartphone className="mt-1 h-5 w-5 shrink-0 text-violet" aria-hidden="true" />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-paper px-4 py-3">
              <h3 className="text-sm font-semibold text-ink">iPhone / Safari</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-ink/70">
                <li>使用 Safari 打开本应用链接。</li>
                <li>点击底部分享按钮。</li>
                <li>选择“添加到主屏幕”。</li>
                <li>回到桌面后，可以像 App 一样打开“关系图谱”。</li>
              </ol>
            </div>
            <div className="rounded-2xl bg-paper px-4 py-3">
              <h3 className="text-sm font-semibold text-ink">Android / Chrome</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-ink/70">
                <li>使用 Chrome 打开本应用链接。</li>
                <li>点击右上角菜单。</li>
                <li>选择“添加到主屏幕”或“安装应用”。</li>
                <li>回到桌面后，可以像 App 一样打开“关系图谱”。</li>
              </ol>
            </div>
          </div>
        </section>

        <section className="rounded-[1.5rem] bg-white/88 p-4 shadow-soft ring-1 ring-violet/10">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-violet">Privacy</p>
          <h2 className="mt-1 text-lg font-semibold text-ink">隐私与本地存储说明</h2>
          <div className="mt-3 space-y-2 text-sm leading-6 text-ink/68">
            <p>数据仅保存在当前设备本地，不会上传到服务器。</p>
            <p>清理浏览器数据、删除站点数据或更换设备，可能导致数据丢失。</p>
            <p>建议定期导出 JSON 备份，头像 dataURL 会随人物数据一起备份。</p>
          </div>
        </section>

        <ConfirmDialog
          open={Boolean(deleteTarget)}
          title="删除标签"
          message={`删除“${deleteTarget?.name ?? ''}”后，会从所有人物的标签中同步移除，但不会删除人物。是否继续？`}
          confirmLabel="删除"
          cancelLabel="取消"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDeleteTag}
        />

        <ConfirmDialog
          open={Boolean(backupConfirmAction)}
          title={backupConfirmTitle}
          message={backupConfirmMessage}
          confirmLabel={backupConfirmLabel}
          cancelLabel="取消"
          onCancel={cancelBackupConfirm}
          onConfirm={confirmBackupAction}
        />
      </div>
    </PageShell>
  )
}
