import './HighlightedProducts.css'
import { useHighlightedProducts } from '../../data/usePublicProducts'
import Product from '../Product/Product'
import {  Link } from 'react-router-dom'

const renderStaticProductItem = (product, children) => children;

export default function HighlightedProducts ({
    productsOverride = null,
    renderProductPreviewItem = renderStaticProductItem
}) {
    const publicProducts = useHighlightedProducts()
    const products = productsOverride || publicProducts.products
    
    return (
        <div className="text-center">
            <div id="highlighted-products">
                {
                    products.map( product => {
                        return renderProductPreviewItem(
                            product,
                            <Product product={ product } key={ product.key } />
                        )
                    })
                }

            </div>
            <Link id="product-button" className="btn btn-primary" to="../shop">Shop All</Link>
        </div>
        
    )
}
