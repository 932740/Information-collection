import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Button, App } from 'antd'
import api from '../services/api'

function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const { message } = App.useApp()

  const onFinish = async (values: { username: string; password: string }) => {
    console.log('onFinish called with:', values)
    setLoading(true)
    try {
      const res = await api.post('/auth/login', values)
      localStorage.setItem('token', res.data.accessToken)
      message.success('登录成功')
      navigate('/templates')
    } catch (err: any) {
      console.error('Login error:', err)
      message.error('登录失败，请检查用户名和密码')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
      }}
    >
      <Card title="信息收集系统 - 管理员登录 v2" style={{ width: 400 }}>
        <Form onFinish={onFinish} layout="vertical">
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default Login
