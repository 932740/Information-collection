import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import TemplateFill from './pages/TemplateFill'
import TemplateManager from './pages/TemplateManager'
import TemplateEditor from './pages/TemplateEditor'
import RecordManager from './pages/RecordManager'
import RecordDetail from './pages/RecordDetail'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/fill/:token" element={<TemplateFill />} />
      <Route path="/" element={<Layout />}>
        <Route path="templates" element={<TemplateManager />} />
        <Route path="templates/:id" element={<TemplateEditor />} />
        <Route path="records" element={<RecordManager />} />
        <Route path="records/:id" element={<RecordDetail />} />
      </Route>
    </Routes>
  )
}

export default App
