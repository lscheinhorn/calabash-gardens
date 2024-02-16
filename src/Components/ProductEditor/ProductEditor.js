import { db  } from '../../firebase-config'
import { collection, addDoc, getDocs, setDoc, doc, deleteDoc } from "firebase/firestore"; 


export default function ProductEditor (props) {
    const { product, getProducts  } = props
    const title = product.title.stringValue
    const category = product.category.stringValue
    const info = product.info.stringValue
    const isHighlighted = product.isHighlighted.booleanValue
    // const isActive = product.isActive
    // const inStock = product.inStock.booleanValue
    const priceOptions = product.priceOptions.arrayValue.values
    const getObj = (obj) => {
        return obj.mapValue.fields
    }
    
    console.log("product editor", getObj(priceOptions[0]))

    const handleDelete =  () => {
        console.log("delete product")

        deleteDoc(doc(db, 'products', title))
        .then(() => {
            getProducts()
        })
    }

    return (
        <div id='product-editor'>
            <div>
                <h2>{title}</h2>
                <button onClick={ handleDelete }>Delete Product</button>
                <p>title: <span>{title}</span></p>
                <p>category: <span>{category}</span></p>
                <p>info: <span>{info}</span></p>
                <p>isHighlighted: <span>{isHighlighted.toString()}</span></p>
            </div>
            

        </div>
    )
}