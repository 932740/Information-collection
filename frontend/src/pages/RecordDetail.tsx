import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Button, Form, Input, InputNumber, DatePicker, Select, Checkbox, Rate, message, Popconfirm, Modal,
} from 'antd'
import api from '../services/api'

interface FieldItem {
  id: number
  name: string
  label: string
  type: string
  options?: Record<string, unknown>
  required: boolean
}

interface RecordDetailData {
  id: number
  templateId: number
  templateTitle: string
  createdAt: string
  fields: FieldItem[]
  data: Record<string, unknown>
}

interface ExportTemplateOption {
  id: number
  name: string
  isDefault: boolean
}

function RecordDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const recordId = Number(id)
  const [detail, setDetail] = useState<RecordDetailData | null>(null)
  const [, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form] = Form.useForm()

  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportOptions, setExportOptions] = useState<ExportTemplateOption[]>([])
  const [selectedExportTemplateId, setSelectedExportTemplateId] = useState<number | undefined>(undefined)

  const fetchDetail = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/records/${recordId}`)
      setDetail(res.data)
      form.setFieldsValue(res.data.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (recordId) {
      fetchDetail()
    }
  }, [recordId])

  const handleSave = async (values: Record<string, unknown>) => {
    try {
      await api.put(`/records/${recordId}`, { data: values })
      message.success('保存成功')
      setEditing(false)
      fetchDetail()
    } catch {
      message.error('保存失败')
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/records/${recordId}`)
      message.success('删除成功')
      navigate('/records')
    } catch {
      message.error('删除失败')
    }
  }

  const openExportSelector = async () => {
    if (!detail) return
    try {
      const res = await api.get(`/templates/${detail.templateId}/export-templates`)
      const options: ExportTemplateOption[] = res.data
      setExportOptions(options)
      const defaultOne = options.find((o) => o.isDefault)
      setSelectedExportTemplateId(defaultOne?.id)
      setExportModalOpen(true)
    } catch {
      message.error('获取导出模板失败')
    }
  }

  const doExport = async () => {
    setExportModalOpen(false)
    try {
      const url = `/exports/single/${recordId}${selectedExportTemplateId ? `?exportTemplateId=${selectedExportTemplateId}` : ''}`
      const res = await api.get(url, { responseType: 'blob' })
      const blob = new Blob([res.data])
      const dlUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = dlUrl
      link.download = `export_${recordId}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(dlUrl)
    } catch {
      message.error('导出失败')
    }
  }

  const renderField = (field: FieldItem) => {
    const value = detail?.data[field.name]
    if (!editing) {
      switch (field.type) {
        case 'multi_select':
          return (
            <div key={field.id} style={{ marginBottom: 16 }}>
              <div style={{ color: '#00000073', marginBottom: 4 }}>{field.label}</div>
              <div>{Array.isArray(value) ? value.join(', ') : String(value ?? '')}</div>
            </div>
          )
        case 'rating': {
          const max = (field.options?.max as number) || 5
          return (
            <div key={field.id} style={{ marginBottom: 16 }}>
              <div style={{ color: '#00000073', marginBottom: 4 }}>{field.label}</div>
              <Rate count={max} value={Number(value) || 0} disabled />
            </div>
          )
        }
        default:
          return (
            <div key={field.id} style={{ marginBottom: 16 }}>
              <div style={{ color: '#00000073', marginBottom: 4 }}>{field.label}</div>
              <div>{String(value ?? '')}</div>
            </div>
          )
      }
    }

    const rules = field.required ? [{ required: true, message: `请输入${field.label}` }] : []
    switch (field.type) {
      case 'text':
        return (
          <Form.Item key={field.id} label={field.label} name={field.name} rules={rules}>
            <Input />
          </Form.Item>
        )
      case 'number':
        return (
          <Form.Item key={field.id} label={field.label} name={field.name} rules={rules}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        )
      case 'date':
        return (
          <Form.Item key={field.id} label={field.label} name={field.name} rules={rules}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        )
      case 'select': {
        const items = (field.options?.items as string[]) || []
        return (
          <Form.Item key={field.id} label={field.label} name={field.name} rules={rules}>
            <Select options={items.map((i) => ({ value: i, label: i }))} />
          </Form.Item>
        )
      }
      case 'multi_select': {
        const items = (field.options?.items as string[]) || []
        return (
          <Form.Item key={field.id} label={field.label} name={field.name} rules={rules}>
            <Checkbox.Group options={items} />
          </Form.Item>
        )
      }
      case 'rating': {
        const max = (field.options?.max as number) || 5
        return (
          <Form.Item key={field.id} label={field.label} name={field.name} rules={rules}>
            <Rate count={max} />
          </Form.Item>
        )
      }
      default:
        return (
          <Form.Item key={field.id} label={field.label} name={field.name} rules={rules}>
            <Input />
          </Form.Item>
        )
    }
  }

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>
        记录详情 #{detail?.id}
      </h2>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div>模板：{detail?.templateTitle}</div>
          <div>提交时间：{detail?.createdAt}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="primary" onClick={() => editing ? form.submit() : setEditing(true)}>
            {editing ? '保存' : '编辑'}
          </Button>
          <Button onClick={openExportSelector}>
            导出 Excel
          </Button>
          <Popconfirm title="确认删除？" onConfirm={handleDelete}>
            <Button danger>
              删除
            </Button>
          </Popconfirm>
        </div>
      </div>
      {editing ? (
        <Form form={form} onFinish={handleSave} layout="vertical">
          {detail?.fields.map(renderField)}
        </Form>
      ) : (
        <div>
          {detail?.fields.map(renderField)}
        </div>
      )}
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

export default RecordDetail
