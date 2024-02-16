import { db  } from '../../firebase-config'
import { collection, addDoc, getDocs, setDoc, doc } from "firebase/firestore"; 
import { useState, useEffect } from 'react'
import { createKey } from '../../resources/products'
import ProductEditor from '../ProductEditor/ProductEditor'


export default function Editor () {
    const [ newProduct, setNewProduct ] = useState({
        title: '',
        category: "",
        info: "",
        priceOptions: [{
            option: "",
            price: ""
        }],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [],
        get key() {
            return createKey(this.title)
        }
    })
    const [ products, setProducts ] = useState()
    const [ productComponents, setProductComponents ] = useState()
    const getProduct = ( product ) => {
        return product._document.data.value.mapValue.fields
    }

    const handleSubmit = () => {
        try {
            setDoc(doc(db, "products", newProduct.title), {
              ...newProduct
            })
            .then(() => {
                getProducts()
            })
          
            // console.log("Document written with ID: ", docRef.id);
          } catch (e) {
            console.error("Error adding document: ", e);
          }
    }

    const getProducts = async () => {
        try {
            const docs = await getDocs(collection(db, "products"))
            setProducts(docs.docs)
          } catch (e) {
            console.error("Error getting docs", e);
          }
       
    }

    useEffect(() => {
        getProducts()
    }, [])

    
    

    useEffect(() => {
        console.log("products", products)

        // products.forEach((doc) => {
        //     console.log("querySnapshot", `${doc.id} => ${doc.data()}`);
        // })

        if(Array.isArray(products)){
            console.log("isArray")
            setProductComponents(
                products.map( product => {
                product = getProduct( product )
                console.log("product", product)
                return <ProductEditor 
                            product={ product } 
                            getProducts = { getProducts }
                            key={ product.key } 
                        />
            }))
        } else {
            console.log("not array")
        }
        
    }, [products])

    

    return (
        <div id='editor'>
            <h1>Editor</h1>
            <input 
                value={ newProduct.title }
                onChange={ (e) => { setNewProduct({
                    ...newProduct,
                    title: e.target.value
                })}}
                placeholder="title"
            />
            <br></br>
            <input 
                value={ newProduct.category }
                onChange={ (e) => { setNewProduct({
                    ...newProduct,
                    category: e.target.value
                })}}
                placeholder="category"
            />
            <br></br>

            <input 
                value={ newProduct.info }
                onChange={ (e) => { setNewProduct({
                    ...newProduct,
                    info: e.target.value
                })}}
                placeholder="info"
            />
            <br></br>

            <input 
                value={ newProduct.priceOptions[0].option }
                onChange={ (e) => { setNewProduct({
                    ...newProduct,
                    priceOptions: [
                        {
                            option: e.target.value,
                            price: newProduct.priceOptions[0].price
                        },
                        ...newProduct.priceOptions.slice(1)
                    ]
                })}}
                placeholder="Option 1 name"
            />
            <br></br>
            <input 
                value={ newProduct.priceOptions[0].price }
                onChange={ (e) => { setNewProduct({
                    ...newProduct,
                    priceOptions: [
                        {
                            option: newProduct.priceOptions[0].option,
                            price: e.target.value
                        },
                        ...newProduct.priceOptions.slice(1)
                    ]
                })}}
                placeholder="Option 1 price"
            />
            <br></br>
            <input 
                value={ newProduct.shipping }
                onChange={ (e) => { setNewProduct({
                    ...newProduct,
                    shipping: e.target.value
                })}}
                placeholder="shipping"
            />
            <br></br>
            <input 
                value={ newProduct.isHighlighted }
                onChange={ (e) => { setNewProduct({
                    ...newProduct,
                    isHighlighted: e.target.value
                })}}
                placeholder="isHighlighted"
            />
            <br></br>
            <input 
                value={ newProduct.isActive }
                onChange={ (e) => { setNewProduct({
                    ...newProduct,
                    isActive: e.target.value
                })}}
                placeholder="isActive"
            />
            <br></br>
            <input 
                value={ newProduct.inStock }
                onChange={ (e) => { setNewProduct({
                    ...newProduct,
                    inStock: e.target.value
                })}}
                placeholder="inStock"
            />
            <br></br>
           
            
            <button onClick={ handleSubmit }>Add Product</button>
            {   
                productComponents
            }          
             </div>

    )
}