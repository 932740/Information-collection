import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Table, Modal, Form, Input, Popconfirm, message, Tag } from 'antd'
import api from '../services/api'

interface TemplateItem {
  id: number
  title: string
  description?: string
  status: 'active' | 'inactive'
  fieldCount: number
  tokenCount: number
  filledCount: number
}

function TemplateManager() {
  const navigate = useNavigate()
  const [data, setData] = useState<TemplateItem[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  const fetchList = async () => {
    setLoading(true)
    try {
      const res = await api.get('/templates')
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
  }, [])

  const handleCreate = async (values: { title: string; description?: string }) => {
    try {
      await api.post('/templates', values)
      message.success('创建成功')
      setModalOpen(false)
      form.resetFields()
      fetchList()
    } catch {
      message.error('创建失败')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/templates/${id}`)
      message.success('删除成功')
      fetchList()
    } catch {
      message.error('删除失败')
    }
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: '标题', dataIndex: 'title', key: 'title' },
    { title: '字段数', dataIndex: 'fieldCount', key: 'fieldCount' },
    { title: 'Token 数', dataIndex: 'tokenCount', key: 'tokenCount' },
    { title: '已填写数', dataIndex: 'filledCount', key: 'filledCount' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) =>
        status === 'active' ? <Tag color="green">启用</Tag> : <Tag>禁用</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: TemplateItem) => (
        <>
          <Button type="link" onClick={() => navigate(`/templates/${record.id}`)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除？"
            onConfirm={() => handleDelete(record.id)}
          >
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
        <h2 style={{ margin: 0 }}>模板管理</h2>
        <Button type="primary" onClick={() => setModalOpen(true)}>
          新建模板
        </Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
      />
      <Modal
        title="新建模板"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} onFinish={handleCreate} layout="vertical">
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
        </Form>
      </Modal>
    </div>
  )
}

export default TemplateManager
