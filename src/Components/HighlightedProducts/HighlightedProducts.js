import './HighlightedProducts.css'
import { useHighlightedProducts } from '../../data/usePublicProducts'
import Product from '../Product/Product'
import {  Link } from 'react-router-dom'

export default function HighlightedProducts ({ productsOverride = null }) {
    const publicProducts = useHighlightedProducts()
    const products = productsOverride || publicProducts.products
    
    return (
        <div className="text-center">
            <div id="highlighted-products">
                {
                    products.map( product => {
                        return <Product product={ product } key={ product.key } />
                    })
                }

            </div>
            <Link id="product-button" className="btn btn-primary" to="../shop">Shop All</Link>
        </div>
        
    )
}
