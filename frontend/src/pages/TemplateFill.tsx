import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Form, Input, InputNumber, DatePicker, Select, Checkbox, Rate, Button, message, Result, Spin,
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

interface FillTemplate {
  title: string
  fields: FieldItem[]
}

function TemplateFill() {
  const { token } = useParams<{ token: string }>()
  const [template, setTemplate] = useState<FillTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [expired, setExpired] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const res = await api.get(`/fill/${token}`)
        setTemplate(res.data)
      } catch (error: any) {
        if (error.response?.status === 410) {
          setExpired(true)
        } else {
          message.error('加载失败')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchTemplate()
  }, [token])

  const onFinish = async (values: Record<string, unknown>) => {
    const payload: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(values)) {
      if (val && typeof val === 'object' && 'format' in val && typeof (val as any).format === 'function') {
        payload[key] = (val as any).format('YYYY-MM-DD')
      } else {
        payload[key] = val
      }
    }
    try {
      await api.post(`/fill/${token}`, { data: payload })
      setSubmitted(true)
    } catch {
      message.error('提交失败')
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (expired) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Result status="warning" title="该链接已填写" />
      </div>
    )
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Result status="success" title="填写成功，感谢您的参与" />
      </div>
    )
  }

  const renderField = (field: FieldItem) => {
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
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 24, background: '#fff', borderRadius: 8 }}>
      <h2 style={{ textAlign: 'center', marginBottom: 24 }}>{template?.title}</h2>
      <Form form={form} onFinish={onFinish} layout="vertical">
        {template?.fields.map(renderField)}
        <Form.Item>
          <Button type="primary" htmlType="submit" block>
            提交
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}

export default TemplateFill
