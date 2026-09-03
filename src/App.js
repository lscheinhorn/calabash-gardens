import './App.css';
import { lazy, Suspense } from 'react';
import Header from './Components/Header/Header';
import Main from './Components/Main/Main';
import Shop from './Components/Shop/Shop.js';
import Footer from './Components/Footer/Footer';
import ProductPage from './Components/ProductPage/ProductPage';
import Cart from './Components/Cart/Cart';
import Contact from './Components/Contact/Contact';
import Events from './Components/Events/Events'; 

import { BrowserRouter, HashRouter, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { isBrowserRoutingEnabled } from './config/deploymentMode';

const Admin = lazy(() => import('./Components/Admin/Admin'));
const AdminPreviewFrame = lazy(() => import('./Components/Admin/AdminPreviewFrame'));

function AppRoutes() {
  const location = useLocation();
  const isAdminPreviewFrame = location.pathname.startsWith('/admin/preview');

  return (
    <>
      {!isAdminPreviewFrame ? <Header /> : null}
      <Routes>
        <Route path="/products/:key" element={<ProductPage />} />
        <Route
          path="/admin"
          element={
            <Suspense fallback={<main className="route_loading">Loading...</main>}>
              <Admin />
            </Suspense>
          }
        />
        <Route
          path="/admin/preview/:previewTab"
          element={
            <Suspense fallback={<main className="route_loading">Loading preview...</main>}>
              <AdminPreviewFrame />
            </Suspense>
          }
        />
        <Route
          path="/admin/preview/products/:productKey"
          element={
            <Suspense fallback={<main className="route_loading">Loading preview...</main>}>
              <AdminPreviewFrame />
            </Suspense>
          }
        />
        <Route path="/shop" element={<Shop />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/events" element={<Events />} />
        <Route path="/" element={<Main />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
      {!isAdminPreviewFrame ? <Footer /> : null}
    </>
  );
}

function App() {
  const Router = isBrowserRoutingEnabled ? BrowserRouter : HashRouter;

  return (
    <div className="App app_wrap">
      <Router>
        <AppRoutes />
      </Router>
    </div>
  );
}

export default App;
