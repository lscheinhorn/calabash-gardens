import './Shop.css'
import { products } from '../../resources/products'
import Product from '../Product/Product'

export default function Shop () {
    return (
        <div id="shop" className="">
            {
                products.map( product => {
                    //comment this out if you want a test basket product
                    if(product.title === "Test basket" ) {
                        return null
                    }
                    return <Product product={ product } key={ product.key } />
                })
            }
        </div>
    )
}