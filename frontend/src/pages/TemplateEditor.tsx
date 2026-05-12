import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  Tabs, Form, Input, Switch, Button, Table, Modal, Select, message,
  Upload, Tag, Space, List, Popconfirm,
} from 'antd'
import { UploadOutlined, CopyOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import * as XLSX from 'xlsx'
import api from '../services/api'

interface FieldItem {
  id: number
  name: string
  label: string
  type: string
  options?: Record<string, unknown>
  required: boolean
  sortOrder: number
}

interface TemplateDetail {
  id: number
  title: string
  description?: string
  status: 'active' | 'inactive'
  fields: FieldItem[]
  excelConfig?: {
    sheet: string
    mappings: { fieldId: number; cell: string }[]
  }
}

interface ExportTemplateItem {
  id: number
  name: string
  excelPath?: string
  excelConfig?: {
    sheet: string
    mappings: { fieldId: number; cell: string }[]
  }
  isDefault: boolean
}

interface TokenItem {
  id: number
  token: string
  status: 'pending' | 'filled'
  filledAt?: string
}

const FIELD_TYPES = [
  { value: 'text', label: '文本' },
  { value: 'number', label: '数字' },
  { value: 'date', label: '日期' },
  { value: 'select', label: '单选' },
  { value: 'multi_select', label: '多选' },
  { value: 'rating', label: '评分' },
]

function TemplateEditor() {
  const { id } = useParams<{ id: string }>()
  const templateId = Number(id)
  const [detail, setDetail] = useState<TemplateDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const [fieldModalOpen, setFieldModalOpen] = useState(false)
  const [fieldForm] = Form.useForm()
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null)

  const [exportTemplates, setExportTemplates] = useState<ExportTemplateItem[]>([])
  const [activeExportId, setActiveExportId] = useState<number | null>(null)
  const [newExportModalOpen, setNewExportModalOpen] = useState(false)
  const [newExportForm] = Form.useForm()

  const [excelData, setExcelData] = useState<unknown[][]>([])
  const [excelSheetName, setExcelSheetName] = useState('Sheet1')
  const [cellMappings, setCellMappings] = useState<Record<string, number>>({})
  const [selectedCell, setSelectedCell] = useState<string | null>(null)
  const [mappingModalOpen, setMappingModalOpen] = useState(false)

  const [tokens, setTokens] = useState<TokenItem[]>([])
  const [tokenModalOpen, setTokenModalOpen] = useState(false)
  const [newTokenUrl, setNewTokenUrl] = useState('')
  const tokenUrlRef = useRef<any>(null)

  const fetchDetail = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/templates/${templateId}`)
      setDetail(res.data)
      form.setFieldsValue({
        title: res.data.title,
        description: res.data.description,
        status: res.data.status === 'active',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchExportTemplates = async () => {
    try {
      const res = await api.get(`/templates/${templateId}/export-templates`)
      setExportTemplates(res.data)
    } catch {
      message.error('获取导出模板列表失败')
    }
  }

  const fetchTokens = async () => {
    try {
      const res = await api.get(`/templates/${templateId}/tokens`)
      setTokens(res.data)
    } catch {
      message.error('获取 Token 列表失败')
    }
  }

  useEffect(() => {
    if (templateId) {
      fetchDetail()
      fetchExportTemplates()
      fetchTokens()
    }
  }, [templateId])

  const handleSaveBasic = async (values: {
    title: string
    description?: string
    status: boolean
  }) => {
    try {
      await api.put(`/templates/${templateId}`, {
        ...values,
        status: values.status ? 'active' : 'inactive',
      })
      message.success('保存成功')
      fetchDetail()
    } catch {
      message.error('保存失败')
    }
  }

  const openAddField = () => {
    setEditingFieldId(null)
    fieldForm.resetFields()
    fieldForm.setFieldsValue({ type: 'text', required: false })
    setFieldModalOpen(true)
  }

  const openEditField = (field: FieldItem) => {
    setEditingFieldId(field.id)
    fieldForm.setFieldsValue({
      name: field.name,
      label: field.label,
      type: field.type,
      required: field.required,
      options: field.options
        ? JSON.stringify(field.options)
        : '',
    })
    setFieldModalOpen(true)
  }

  const handleSaveField = async (values: {
    name: string
    label: string
    type: string
    required: boolean
    options?: string
  }) => {
    const payload: Record<string, unknown> = {
      name: values.name,
      label: values.label,
      type: values.type,
      required: values.required,
    }
    if (values.options) {
      try {
        payload.options = JSON.parse(values.options)
      } catch {
        payload.options = { items: values.options.split(',').map((s) => s.trim()) }
      }
    }
    try {
      if (editingFieldId) {
        await api.put(`/templates/${templateId}/fields/${editingFieldId}`, payload)
        message.success('更新成功')
      } else {
        await api.post(`/templates/${templateId}/fields`, payload)
        message.success('添加成功')
      }
      setFieldModalOpen(false)
      fetchDetail()
    } catch {
      message.error('保存失败')
    }
  }

  const handleDeleteField = async (fieldId: number) => {
    try {
      await api.delete(`/templates/${templateId}/fields/${fieldId}`)
      message.success('删除成功')
      fetchDetail()
    } catch {
      message.error('删除失败')
    }
  }

  const moveField = async (index: number, direction: number) => {
    if (!detail) return
    const newFields = [...detail.fields]
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= newFields.length) return
    const temp = newFields[index].sortOrder
    newFields[index].sortOrder = newFields[targetIndex].sortOrder
    newFields[targetIndex].sortOrder = temp
    try {
      await api.put(`/templates/${templateId}/fields/${newFields[index].id}`, {
        sortOrder: newFields[index].sortOrder,
      })
      await api.put(`/templates/${templateId}/fields/${newFields[targetIndex].id}`, {
        sortOrder: newFields[targetIndex].sortOrder,
      })
      fetchDetail()
    } catch {
      message.error('排序失败')
    }
  }

  const fieldColumns = [
    { title: '排序', dataIndex: 'sortOrder', key: 'sortOrder' },
    { title: '标识', dataIndex: 'name', key: 'name' },
    { title: '显示名称', dataIndex: 'label', key: 'label' },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => FIELD_TYPES.find((t) => t.value === type)?.label || type,
    },
    {
      title: '必填',
      dataIndex: 'required',
      key: 'required',
      render: (required: boolean) => (required ? '是' : '否'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: FieldItem, index: number) => (
        <>
          <Button type="link" onClick={() => moveField(index, -1)} disabled={index === 0}>
            上移
          </Button>
          <Button type="link" onClick={() => moveField(index, 1)} disabled={index === (detail?.fields.length || 0) - 1}>
            下移
          </Button>
          <Button type="link" onClick={() => openEditField(record)}>
            编辑
          </Button>
          <Button type="link" danger onClick={() => handleDeleteField(record.id)}>
            删除
          </Button>
        </>
      ),
    },
  ]

  const showOptionsInput = (type: string) =>
    type === 'select' || type === 'multi_select' || type === 'rating'

  const handleCreateExportTemplate = async (values: { name: string }) => {
    setNewExportModalOpen(false)
    newExportForm.resetFields()
    try {
      const res = await api.post(`/templates/${templateId}/export-templates`, { name: values.name })
      message.success('创建成功，请上传 Excel 文件')
      fetchExportTemplates()
      setActiveExportId(res.data.id)
      setExcelData([])
      setCellMappings({})
      } catch {
      message.error('创建失败')
    }
  }

  const handleUploadExportExcel = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', file.name)
    try {
      const res = await api.post(`/templates/${templateId}/export-templates`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      message.success('上传成功')
      fetchExportTemplates()
      const updated = res.data
      setActiveExportId(updated.id)
      // Load preview from the uploaded file directly
      const reader = new FileReader()
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0] || 'Sheet1'
        setExcelSheetName(sheetName)
        const worksheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 })
        setExcelData(json)
      }
      reader.readAsArrayBuffer(file)
      setCellMappings({})
      } catch {
      message.error('上传失败')
    }
    return false
  }

  const handleSelectExportTemplate = (et: ExportTemplateItem) => {
    setActiveExportId(et.id)
    if (et.excelPath) {
      loadExcelPreview(et.id, et.excelConfig)
    } else {
      setExcelData([])
      setCellMappings({})
      }
  }

  const loadExcelPreview = async (exportId: number, config?: ExportTemplateItem['excelConfig']) => {
    try {
      const res = await api.get(`/templates/${templateId}/export-templates/${exportId}/download`, {
        responseType: 'arraybuffer',
      })
      const data = new Uint8Array(res.data)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = config?.sheet || workbook.SheetNames[0] || 'Sheet1'
      setExcelSheetName(sheetName)
      const worksheet = workbook.Sheets[sheetName]
      const json = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 })
      setExcelData(json)
      if (config?.mappings) {
        const map: Record<string, number> = {}
        config.mappings.forEach((m: { fieldId: number; cell: string }) => {
          map[m.cell] = m.fieldId
        })
        setCellMappings(map)
      } else {
        setCellMappings({})
      }
    } catch {
      message.error('加载 Excel 预览失败')
    }
  }

  const handleBackToExportList = () => {
    setActiveExportId(null)
    setExcelData([])
    setCellMappings({})
  }

  const handleSaveExportConfig = async () => {
    if (!activeExportId) return
    const mappings = Object.entries(cellMappings).map(([cell, fieldId]) => ({
      fieldId,
      cell,
    }))
    try {
      await api.put(`/templates/${templateId}/export-templates/${activeExportId}/config`, {
        sheet: excelSheetName,
        mappings,
      })
      message.success('保存配置成功')
      fetchExportTemplates()
    } catch {
      message.error('保存失败')
    }
  }

  const handleAutoMap = async () => {
    if (!activeExportId) return
    try {
      const res = await api.post(`/templates/${templateId}/export-templates/${activeExportId}/auto-map`)
      message.success(`自动解析成功，匹配 ${res.data.matchedCount}/${res.data.totalFields} 个字段`)

      // reload preview with new config
      const updatedEt = exportTemplates.find((et) => et.id === activeExportId)
      if (updatedEt) {
        loadExcelPreview(activeExportId, {
          sheet: res.data.sheet,
          mappings: res.data.mappings,
        })
      }
      fetchExportTemplates()
    } catch {
      message.error('自动解析失败')
    }
  }


  const handleSetDefaultExport = async (exportId: number) => {
    try {
      await api.put(`/templates/${templateId}/export-templates/${exportId}/default`)
      message.success('已设为默认')
      fetchExportTemplates()
    } catch {
      message.error('设置失败')
    }
  }

  const handleDeleteExportTemplate = async (exportId: number) => {
    try {
      await api.delete(`/templates/${templateId}/export-templates/${exportId}`)
      message.success('删除成功')
      if (activeExportId === exportId) {
        setActiveExportId(null)
        setExcelData([])
      }
      fetchExportTemplates()
    } catch {
      message.error('删除失败')
    }
  }

  const renderExcelPreview = () => {
    if (excelData.length === 0) return null
    // 计算最大列数，确保空白列也被渲染
    const maxCols = excelData.reduce((max, row) => {
      return Array.isArray(row) ? Math.max(max, row.length) : max
    }, 0)
    return (
      <div style={{ overflow: 'auto', marginTop: 16 }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
          <tbody>
            {excelData.map((row, ri) => (
              <tr key={ri}>
                {Array.from({ length: maxCols }).map((_, ci) => {
                  const cellRef = XLSX.utils.encode_cell({ r: ri, c: ci })
                  const mappedFieldId = cellMappings[cellRef]
                  const mappedField = detail?.fields.find((f) => f.id === mappedFieldId)
                  const cellValue = Array.isArray(row) ? row[ci] : undefined
                  return (
                    <td
                      key={ci}
                      onClick={() => {
                        setSelectedCell(cellRef)
                        setMappingModalOpen(true)
                      }}
                      style={{
                        border: '1px solid #d9d9d9',
                        padding: '4px 8px',
                        minWidth: 60,
                        cursor: 'pointer',
                        background: mappedField ? '#e6f7ff' : '#fff',
                      }}
                    >
                      <div>{String(cellValue ?? '')}</div>
                      {mappedField && (
                        <div style={{ fontSize: 10, color: '#1890ff' }}>
                          {mappedField.label}
                        </div>
                      )}

                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const handleGenerateToken = async () => {
    try {
      const res = await api.post(`/templates/${templateId}/tokens`, {})
      const url = `${window.location.origin}/fill/${res.data.token}`
      setNewTokenUrl(url)
      setTokenModalOpen(true)
      fetchTokens()
    } catch {
      message.error('生成链接失败')
    }
  }

  const handleCopyToken = () => {
    if (tokenUrlRef.current) {
      tokenUrlRef.current.select()
      document.execCommand('copy')
      message.success('已复制到剪贴板')
    }
  }

  const handleDeleteToken = async (tokenId: number) => {
    try {
      await api.delete(`/templates/${templateId}/tokens/${tokenId}`)
      message.success('删除成功')
      fetchTokens()
    } catch {
      message.error('删除失败')
    }
  }

  const filledCount = tokens.filter((t) => t.status === 'filled').length

  const tokenColumns = [
    { title: 'Token', dataIndex: 'token', key: 'token' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) =>
        status === 'filled' ? <Tag color="green">已填写</Tag> : <Tag>待填写</Tag>,
    },
    { title: '填写时间', dataIndex: 'filledAt', key: 'filledAt' },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: TokenItem) => (
        <Button type="link" danger onClick={() => handleDeleteToken(record.id)}>
          删除
        </Button>
      ),
    },
  ]

  const activeExport = exportTemplates.find((et) => et.id === activeExportId)

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>编辑模板</h2>
      <Tabs
        items={[
          {
            key: 'basic',
            label: '基础信息与字段',
            children: (
              <>
                <Form
                  form={form}
                  onFinish={handleSaveBasic}
                  layout="vertical"
                  style={{ maxWidth: 600 }}
                >
                  <Form.Item
                    label="标题"
                    name="title"
                    rules={[{ required: true, message: '请输入标题' }]}
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item label="描述" name="description">
                    <Input.TextArea rows={3} />
                  </Form.Item>
                  <Form.Item
                    label="状态"
                    name="status"
                    valuePropName="checked"
                  >
                    <Switch checkedChildren="启用" unCheckedChildren="禁用" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit">
                      保存基础信息
                    </Button>
                  </Form.Item>
                </Form>
                <div style={{ marginTop: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ margin: 0 }}>字段配置</h3>
                    <Button type="primary" onClick={openAddField}>
                      添加字段
                    </Button>
                  </div>
                  <Table
                    rowKey="id"
                    columns={fieldColumns}
                    dataSource={detail?.fields || []}
                    loading={loading}
                  />
                </div>
              </>
            ),
          },
          {
            key: 'excel',
            label: '导出模板',
            children: (
              <div>
                {activeExportId && activeExport ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <Button icon={<ArrowLeftOutlined />} onClick={handleBackToExportList}>
                        返回列表
                      </Button>
                      <h3 style={{ margin: 0 }}>{activeExport.name}</h3>
                      <div>
                        {activeExport.isDefault ? <Tag color="blue">默认</Tag> : (
                          <Button type="link" onClick={() => handleSetDefaultExport(activeExport.id)}>
                            设为默认
                          </Button>
                        )}
                      </div>
                    </div>
                    {!activeExport.excelPath ? (
                      <Upload
                        beforeUpload={(file) => handleUploadExportExcel(file)}
                        accept=".xlsx"
                        showUploadList={false}
                      >
                        <Button icon={<UploadOutlined />}>上传 Excel 模板</Button>
                      </Upload>
                    ) : (
                      <>
                        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                          <Upload
                            beforeUpload={(file) => handleUploadExportExcel(file)}
                            accept=".xlsx"
                            showUploadList={false}
                          >
                            <Button icon={<UploadOutlined />}>重新上传</Button>
                          </Upload>
                          <Button onClick={handleAutoMap}>
                            自动解析映射
                          </Button>
                          <span style={{ color: '#999', fontSize: 12 }}>点击单元格可映射字段</span>
                        </div>
                        {renderExcelPreview()}
                        <Button type="primary" onClick={handleSaveExportConfig} style={{ marginTop: 16 }}>
                          保存映射配置
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                      <h3 style={{ margin: 0 }}>导出模板列表</h3>
                      <Button type="primary" onClick={() => setNewExportModalOpen(true)}>
                        新建导出模板
                      </Button>
                    </div>
                    <List
                      dataSource={exportTemplates}
                      renderItem={(et) => (
                        <List.Item
                          actions={[
                            <Button type="link" onClick={() => handleSelectExportTemplate(et)}>
                              编辑
                            </Button>,
                            et.isDefault ? <Tag color="blue">默认</Tag> : (
                              <Button type="link" onClick={() => handleSetDefaultExport(et.id)}>
                                设为默认
                              </Button>
                            ),
                            <Popconfirm title="确认删除？" onConfirm={() => handleDeleteExportTemplate(et.id)}>
                              <Button type="link" danger>删除</Button>
                            </Popconfirm>,
                          ]}
                        >
                          <List.Item.Meta
                            title={et.name}
                            description={et.excelPath ? '已上传 Excel' : '未上传文件'}
                          />
                        </List.Item>
                      )}
                    />
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'token',
            label: '填写链接',
            children: (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    填写进度：<Tag color="blue">{filledCount} / {tokens.length}</Tag>
                  </div>
                  <Button type="primary" onClick={handleGenerateToken}>
                    生成填写链接
                  </Button>
                </div>
                <Table rowKey="id" columns={tokenColumns} dataSource={tokens} />
              </div>
            ),
          },
        ]}
      />
      <Modal
        title={editingFieldId ? '编辑字段' : '添加字段'}
        open={fieldModalOpen}
        onCancel={() => setFieldModalOpen(false)}
        onOk={() => fieldForm.submit()}
      >
        <Form
          form={fieldForm}
          onFinish={handleSaveField}
          layout="vertical"
        >
          <Form.Item
            label="标识"
            name="name"
            rules={[{ required: true, message: '请输入标识' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="显示名称"
            name="label"
            rules={[{ required: true, message: '请输入显示名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="类型"
            name="type"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select
              options={FIELD_TYPES}
              onChange={(value) => {
                if (!showOptionsInput(value)) {
                  fieldForm.setFieldsValue({ options: undefined })
                }
              }}
            />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, next) => prev.type !== next.type}
          >
            {({ getFieldValue }) =>
              showOptionsInput(getFieldValue('type')) ? (
                <Form.Item label="选项" name="options">
                  <Input placeholder="逗号分隔选项，或 JSON" />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item
            label="必填"
            name="required"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="选择字段"
        open={mappingModalOpen}
        onCancel={() => setMappingModalOpen(false)}
        footer={null}
      >
        <Select
          style={{ width: '100%' }}
          placeholder="选择字段"
          options={detail?.fields.map((f) => ({ value: f.id, label: f.label }))}
          onChange={(value) => {
            if (selectedCell) {
              setCellMappings((prev) => ({ ...prev, [selectedCell]: value }))
            }
            setMappingModalOpen(false)
          }}
        />
        <div style={{ marginTop: 8 }}>
          <Button danger onClick={() => {
            if (selectedCell) {
              setCellMappings((prev) => {
                const next = { ...prev }
                delete next[selectedCell]
                return next
              })
            }
            setMappingModalOpen(false)
          }}>
            清除映射
          </Button>
        </div>
      </Modal>
      <Modal
        title="新建导出模板"
        open={newExportModalOpen}
        onCancel={() => setNewExportModalOpen(false)}
        onOk={() => newExportForm.submit()}
      >
        <Form form={newExportForm} onFinish={handleCreateExportTemplate} layout="vertical">
          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="如：评分表A" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="填写链接"
        open={tokenModalOpen}
        onCancel={() => setTokenModalOpen(false)}
        footer={null}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input ref={tokenUrlRef} value={newTokenUrl} readOnly />
          <Button icon={<CopyOutlined />} onClick={handleCopyToken}>
            复制链接
          </Button>
        </Space>
      </Modal>
    </div>
  )
}

export default TemplateEditor
