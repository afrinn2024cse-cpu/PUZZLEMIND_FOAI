import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import KakuroPage from './pages/KakuroPage.jsx'
import MapColoringPage from './pages/MapColoringPage.jsx'
import NQueensPage from './pages/NQueensPage.jsx'
import SudokuPage from './pages/SudokuPage.jsx'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/sudoku" element={<SudokuPage />} />
        <Route path="/nqueens" element={<NQueensPage />} />
        <Route path="/map-coloring" element={<MapColoringPage />} />
        <Route path="/kakuro" element={<KakuroPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
