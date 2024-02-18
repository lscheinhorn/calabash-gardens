import { db  } from '../../firebase-config'
import { collection, addDoc, getDocs, setDoc, doc, deleteDoc, updateDoc } from "firebase/firestore"; 


export default function ProductEditor (props) {
    const { product, getProducts  } = props
    const title = product.title.stringValue
    const category = product.category.stringValue
    const info = product.info.stringValue
    const shipping = product.shipping.stringValue
    const isHighlighted = product.isHighlighted.booleanValue
    const isActive = product.isActive.booleanValue
    const inStock = product.inStock.booleanValue
    const priceOptions = product.priceOptions.arrayValue.values
    const getObj = (obj) => {
        return obj.mapValue.fields
    }
    console.log("priceOptions", getObj(priceOptions[0]))

    console.log("product editor", isHighlighted)

    const handleDelete =  () => {
        deleteDoc(doc(db, 'products', title))
        .then(() => {
            getProducts()
        })
    }

    const handleChange = async ({ target }) => {
        console.log("target value", target.value)
        const value = target.value
        const docRef = doc(db, 'products', value)
        await updateDoc(docRef, {

        })
    }

    return (
        <div id='product-editor'>
            <div className="product_container">
                <h4>{ title }</h4>
                <button value={title} onClick={handleChange}>Change title</button>
                <button onClick={ handleDelete }>Delete Product</button>
                {/*<p>{ info1 }
                    <span hidden={ hidden.span } >{ info2 }</span> 
                </p>*/}
                <p>{ info }</p>
            
                    <>
                        <select
                            className="mb-3"
                        >
                            
                            {
                                priceOptions.map( option  => {
                                    // console.log({option})
                                    option = getObj(option)
                                    return <option key={option.option.stringValue} >{ option.option.stringValue } is ${ option.price.stringValue }</option>
                                })
                            }
                        </select>
                    </>
                    <p>${priceOptions[0].price}</p>
            
                <p>In Stock {inStock.toString()}</p> 
                <p>Active {isActive.toString()}</p> 
                <p>Highlighted {isHighlighted.toString()}</p> 
                 <p>Shipping {shipping}</p> 

        </div>

        </div>
    )
}