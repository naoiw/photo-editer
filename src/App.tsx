import { Navigate, Route, Routes } from 'react-router-dom'
import { ComposePage } from './pages/ComposePage'
import { CropPage } from './pages/CropPage'
import { HomePage } from './pages/HomePage'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/crop" element={<CropPage />} />
      <Route path="/compose" element={<ComposePage />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}
