import './Shop.css'
import { products } from '../../data/siteData'
import Product from '../Product/Product'
import { useMemo, useState } from 'react'

export default function Shop () {
    const [ option, setOption ] = useState("All")
    const activeProducts = useMemo(() => products.filter(product => product.isActive === true), [])
    const categories = useMemo(() => {
        return Array.from(new Set(activeProducts
            .map(product => product.category)
            .filter(Boolean)))
    }, [activeProducts])

    return (
        <div className="">
            <div className="d-flex flex-column align-items-center">
                <h1 className="m-3" >Shop by category</h1>
                <select 
                    className="m-3"
                    onChange={ (e) => { setOption( e.target.value ) }}
                    value={ option }
                >
                    <option value="All">All</option>
                    { categories.map((category) => {
                        return <option value={ category } key={ category }>{ category }</option>
                    })}
                </select>
            </div>
            <div id="shop">
                {   
                    activeProducts.map( product => {
                        if(product.category === option || option === "All" ) {
                            return <Product product={ product } key={ product.key } />
                        }
                        return null
                    })
                }   
            </div>
        </div>
    )
}
