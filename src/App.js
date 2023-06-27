import './App.css'
import Header from './Components/Header/Header'
import Main from './Components/Main/Main'
import Shop from './Components/Shop/Shop.js'
import Footer from './Components/Footer/Footer'
import ProductPage from './Components/ProductPage/ProductPage'
import Cart from './Components/Cart/Cart'
import Contact from './Components/Contact/Contact'

import { HashRouter, Routes, Route } from 'react-router-dom'

alert("This site is currently under construction. Please note that in order to purchase saffron you must contact Calabash Gardens directly through the contact form or email us at calabashgardens@gmail.com")

function App() {
  return (
  <div className="App app_wrap">

    <HashRouter>
      <Header />
      <Routes>
        <Route 
          path="/products/:key" 
          element={<ProductPage />} 
        />
        <Route 
          path="/shop" 
          element={<Shop />} 
        />
        <Route 
          path="/cart"
          element={<Cart />}
        />
        <Route 
          path="/contact"
          element={<Contact />}
        />
        <Route 
          path="/" 
          element={<Main />} 
        />
      
      </Routes>
      <Footer />
    </HashRouter>
  </div>

  )
}

export default App
