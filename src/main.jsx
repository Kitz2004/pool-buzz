import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import RecordMatch from './pages/RecordMatch'
import Leaderboard from './pages/Leaderboard'
import BottomNav from './BottomNav'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <div style={{ paddingBottom: '70px' }}>
      <Routes>
        <Route path="/" element={<RecordMatch />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Routes>
    </div>
    <BottomNav />
  </BrowserRouter>
)