import './App.css'
import Header from './Components/Header/Header'
import Main from './Components/Main/Main'
import Shop from './Components/Shop/Shop.js'
import Footer from './Components/Footer/Footer'
import ProductPage from './Components/ProductPage/ProductPage'
import Cart from './Components/Cart/Cart'

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

function App() {
  return (
  <div className="App">
    <Router>
      <Header />
      <Routes>
        <Route 
          path="products/:key" 
          element={<ProductPage />} 
        />
        <Route 
          path="shop" 
          element={<Shop />} 
        />
        <Route 
          path="cart"
          element={<Cart />}
        />
        <Route 
          path="" 
          element={<Main />} 
        />
      
      </Routes>
    </Router>
    <Footer />
  </div>

  )
}

export default App
