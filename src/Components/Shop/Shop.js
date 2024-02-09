import './Shop.css'
import { products } from '../../resources/products'
import Product from '../Product/Product'

export default function Shop () {
    return (
        <div id="shop" className="">
            {
                products.map( product => {
                    if(product.isActive === true ) {
                        return <Product product={ product } key={ product.key } />
                    }
                    return null
                })
            }
        </div>
    )
}