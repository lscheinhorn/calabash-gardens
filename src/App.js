import './App.css';
import Header from './Components/Header/Header';
import Main from './Components/Main/Main';
import Shop from './Components/Shop/Shop.js';
import Footer from './Components/Footer/Footer';
import ProductPage from './Components/ProductPage/ProductPage';
import Cart from './Components/Cart/Cart';
import Contact from './Components/Contact/Contact';
import Admin from './Components/Admin/Admin';
import Events from './Components/Events/Events'; 

import { HashRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <div className="App app_wrap">
      <HashRouter>
        <Header />
        <Routes>
          <Route path="/products/:key" element={<ProductPage />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/events" element={<Events />} /> 
          <Route path="/" element={<Main />} />
        </Routes>
        <Footer />
      </HashRouter>
    </div>
  );
}

export default App;