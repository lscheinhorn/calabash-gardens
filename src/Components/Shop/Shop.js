import './Shop.css'
import { products } from '../../resources/products'
import Product from '../Product/Product'
import { useState, useEffect   } from 'react'

export default function Shop () {
    const [ option, setOption ] = useState("All")
    const [ options, setOptions ] = useState("All")
    const [ categories, setCategories ] = useState([])
    useEffect(() => {
        setOptions(categories.map((option) => {
            return <option value={ option } key={ option }>{ option }</option>
        }))
    }, [categories])
    return (
        <div className="">
            <div className="d-flex flex-column align-items-center">
                <h1 className="m-3" >Shop by category</h1>
                <select 
                    className="m-3"
                    onChange={ (e) => { setOption( e.target.value ) }}
                    value={ option }
                >
                    { options }
                </select>
            </div>
            <div id="shop">
                {   
                    products.map( product => {
                        if(Array.isArray(categories)) {
                            if( !categories.includes( product.category ) ) {
                                setCategories([
                                    ...categories,
                                    product.category
                                ])
                            }
                        }
                        if(product.isActive === true && (product.category === option || option === "All" ) ) {
                            return <Product product={ product } key={ product.key } />
                        }
                        return null
                    })
                }   
            </div>
        </div>
    )
}