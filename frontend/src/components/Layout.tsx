import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Layout as AntLayout, Menu, Button } from 'antd'
import {
  FileTextOutlined,
  DatabaseOutlined,
} from '@ant-design/icons'

const { Header, Sider, Content } = AntLayout

function Layout() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
    }
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  const selectedKey = location.pathname.startsWith('/records')
    ? 'records'
    : 'templates'

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider theme="light">
        <div style={{ padding: '16px', fontSize: '18px', fontWeight: 'bold' }}>
          信息收集系统
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={[
            {
              key: 'templates',
              icon: <FileTextOutlined />,
              label: '模板管理',
              onClick: () => navigate('/templates'),
            },
            {
              key: 'records',
              icon: <DatabaseOutlined />,
              label: '记录管理',
              onClick: () => navigate('/records'),
            },
          ]}
        />
      </Sider>
      <AntLayout>
        <Header style={{ background: '#fff', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '0 24px' }}>
          <Button type="primary" onClick={handleLogout}>
            退出登录
          </Button>
        </Header>
        <Content style={{ margin: '24px', padding: '24px', background: '#fff' }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  )
}

export default Layout
