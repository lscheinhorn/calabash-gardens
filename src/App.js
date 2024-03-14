import './App.css';
import Header from './Components/Header/Header';
import Main from './Components/Main/Main';
import Shop from './Components/Shop/Shop.js';
import Footer from './Components/Footer/Footer';
import ProductPage from './Components/ProductPage/ProductPage';
import Cart from './Components/Cart/Cart';
import Contact from './Components/Contact/Contact';
import Admin from './Components/Admin/Admin';


import { HashRouter, Routes, Route } from 'react-router-dom';

// Alert message - This site is currently under construction. Please note that in order to purchase saffron you must contact Calabash Gardens directly through the contact form or email us at calabashgardens@gmail.com
// alert("This site is currently under construction. Please note that in order to purchase saffron you must contact Calabash Gardens directly through the contact form or email us at calabashgardens@gmail.com");

function App() {
  return (
    <div className="App app_wrap">

      <HashRouter>
        <Header />
        <Routes>
          {/* Route for displaying individual product page */}
          <Route path="/products/:key" element={<ProductPage />} />

          {/* Route for admin panel */}
          <Route path="/admin" element={<Admin />} />

          {/* Route for main shop page */}
          <Route path="/shop" element={<Shop />} />

          {/* Route for shopping cart */}
          <Route path="/cart" element={<Cart />} />

          {/* Route for contact page */}
          <Route path="/contact" element={<Contact />} />

          {/* Default route for home/main page */}
          <Route path="/" element={<Main />} />
        </Routes>
        <Footer />
      </HashRouter>
    </div>
  );
}

export default App;