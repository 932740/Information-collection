import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button, Table, DatePicker, Select, message, Popconfirm, Modal,
} from 'antd'
import api from '../services/api'

interface RecordItem {
  id: number
  templateId: number
  templateTitle: string
  createdAt: string
}

interface TemplateOption {
  id: number
  title: string
}

interface ExportTemplateOption {
  id: number
  name: string
  isDefault: boolean
}

function RecordManager() {
  const navigate = useNavigate()
  const [data, setData] = useState<RecordItem[]>([])
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [templateId, setTemplateId] = useState<string | undefined>(undefined)
  const [startDate, setStartDate] = useState<string | undefined>(undefined)
  const [endDate, setEndDate] = useState<string | undefined>(undefined)

  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportOptions, setExportOptions] = useState<ExportTemplateOption[]>([])
  const [selectedExportTemplateId, setSelectedExportTemplateId] = useState<number | undefined>(undefined)
  const [pendingExportRecordId, setPendingExportRecordId] = useState<number | undefined>(undefined)
  const [pendingBatchExport, setPendingBatchExport] = useState(false)

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (templateId) params.templateId = templateId
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      const res = await api.get('/records', { params })
      setData(res.data.items || [])
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/templates')
      setTemplates(res.data.map((t: { id: number; title: string }) => ({ id: t.id, title: t.title })))
    } catch {
      message.error('获取模板列表失败')
    }
  }

  useEffect(() => {
    fetchRecords()
    fetchTemplates()
  }, [])

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/records/${id}`)
      message.success('删除成功')
      fetchRecords()
    } catch {
      message.error('删除失败')
    }
  }

  const resolveTemplateIdForExport = (recordId?: number): number | undefined => {
    if (recordId) {
      const record = data.find((r) => r.id === recordId)
      return record?.templateId
    }
    if (selectedRowKeys.length === 0) return undefined
    const records = data.filter((r) => selectedRowKeys.includes(r.id))
    if (records.length === 0) return undefined
    const firstTemplateId = records[0].templateId
    if (records.some((r) => r.templateId !== firstTemplateId)) {
      return undefined
    }
    return firstTemplateId
  }

  const openExportSelector = async (recordId?: number) => {
    const tid = resolveTemplateIdForExport(recordId)
    if (!tid) {
      message.warning('请选择同一模板的记录')
      return
    }
    try {
      const res = await api.get(`/templates/${tid}/export-templates`)
      const options: ExportTemplateOption[] = res.data
      setExportOptions(options)
      const defaultOne = options.find((o) => o.isDefault)
      setSelectedExportTemplateId(defaultOne?.id)
      setPendingExportRecordId(recordId)
      setPendingBatchExport(!recordId)
      setExportModalOpen(true)
    } catch {
      message.error('获取导出模板失败')
    }
  }

  const doExport = async () => {
    setExportModalOpen(false)
    if (pendingBatchExport) {
      try {
        const res = await api.post('/exports/batch', {
          recordIds: selectedRowKeys.map((k) => Number(k)),
          exportTemplateId: selectedExportTemplateId,
        }, { responseType: 'blob' })
        const blob = new Blob([res.data])
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `batch_export_${Date.now()}.zip`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } catch {
        message.error('导出失败')
      }
    } else if (pendingExportRecordId) {
      try {
        const url = `/exports/single/${pendingExportRecordId}${selectedExportTemplateId ? `?exportTemplateId=${selectedExportTemplateId}` : ''}`
        const res = await api.get(url, { responseType: 'blob' })
        const blob = new Blob([res.data])
        const dlUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = dlUrl
        link.download = `export_${pendingExportRecordId}.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(dlUrl)
      } catch {
        message.error('导出失败')
      }
    }
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: '模板', dataIndex: 'templateTitle', key: 'templateTitle' },
    { title: '提交时间', dataIndex: 'createdAt', key: 'createdAt' },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: RecordItem) => (
        <>
          <Button type="link" onClick={() => navigate(`/records/${record.id}`)}>
            详情
          </Button>
          <Button type="link" onClick={() => openExportSelector(record.id)}>
            导出
          </Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>记录管理</h2>
        <Button type="primary" onClick={() => openExportSelector()}>
          批量导出 ZIP
        </Button>
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <Select
          placeholder="选择模板"
          style={{ width: 200 }}
          allowClear
          options={templates.map((t) => ({ value: String(t.id), label: t.title }))}
          onChange={(value) => setTemplateId(value)}
        />
        <DatePicker placeholder="开始时间" onChange={(_, dateString) => setStartDate(dateString as string)} />
        <DatePicker placeholder="结束时间" onChange={(_, dateString) => setEndDate(dateString as string)} />
        <Button type="primary" onClick={fetchRecords}>
          筛选
        </Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
      />
      <Modal
        title="选择导出模板"
        open={exportModalOpen}
        onCancel={() => setExportModalOpen(false)}
        onOk={doExport}
      >
        <Select
          style={{ width: '100%' }}
          placeholder="选择导出模板"
          options={exportOptions.map((o) => ({ value: o.id, label: o.name + (o.isDefault ? ' (默认)' : '') }))}
          value={selectedExportTemplateId}
          onChange={(value) => setSelectedExportTemplateId(value)}
          allowClear
        />
        <p style={{ color: '#999', fontSize: 12, marginTop: 8 }}>
          留空则使用模板原有的 Excel 配置
        </p>
      </Modal>
    </div>
  )
}

export default RecordManager
