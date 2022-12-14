import './App.css'
import Header from './Components/Header/Header'
import Main from './Components/Main/Main'
import Shop from './Components/Shop/Shop.js'
import Footer from './Components/Footer/Footer'
import ProductPage from './Components/ProductPage/ProductPage'
import Cart from './Components/Cart/Cart'
import Contact from './Components/Contact/Contact'

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

function App() {
  return (
  <div className="App app_wrap">
    <Router>
      <Header />
      <Routes>
        <Route 
          path="calabash-gardens/products/:key" 
          element={<ProductPage />} 
        />
        <Route 
          path="calabash-gardens/shop" 
          element={<Shop />} 
        />
        <Route 
          path="calabash-gardens/cart"
          element={<Cart />}
        />
        <Route 
          path="calabash-gardens/contact"
          element={<Contact />}
        />
        <Route 
          path="calabash-gardens/" 
          element={<Main />} 
        />
      
      </Routes>
      <Footer />
    </Router>
  </div>

  )
}

export default App
