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
        isHighlighted: true,
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
                console.log("new product", newProduct)
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

    const submitButton = () => {
        if(newProduct.title && newProduct.info && newProduct.category && newProduct.shipping && newProduct.priceOptions[0].option && newProduct.priceOptions[0].price ) {
            console.log("button active")
            return <button onClick={ handleSubmit }>Add Product</button>
        } else {
            console.log("button disabled")

            return <button disabled onClick={ handleSubmit }>Add Product</button>
        }
    }

    return (
        <div id='editor'>
            <h1>Editor</h1>
            <label>
                Product title
                <input 
                    value={ newProduct.title }
                    onChange={ (e) => { setNewProduct({
                        ...newProduct,
                        title: e.target.value
                    })}}
                    placeholder="title"
                    required
                />
            </label>
            
            <br></br>
            <label>
                Category
                <input 
                    value={ newProduct.category }
                    onChange={ (e) => { setNewProduct({
                        ...newProduct,
                        category: e.target.value
                    })}}
                    placeholder="category"
                />
            </label>
            
            <br></br>
            <label>
                Description
                <input 
                    value={ newProduct.info }
                    onChange={ (e) => { setNewProduct({
                        ...newProduct,
                        info: e.target.value
                    })}}
                    placeholder="info"
                />
            </label>
            
            <br></br>
            <label>
                Option 1 size / name
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
            </label>
            
            <br></br>
            <label>
                Option 1 Price
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
            </label>
            
            <br></br>
            <label>
                Shipping
                <input 
                    value={ newProduct.shipping }
                    onChange={ (e) => { setNewProduct({
                        ...newProduct,
                        shipping: e.target.value
                    })}}
                    placeholder="shipping"
                />
            </label>
            
            <br></br>
            
            <label>
                Highlighted
                <select 
                    value={ newProduct.isHighlighted }
                    onChange={ (e) => { setNewProduct({
                        ...newProduct,
                        isHighlighted: e.target.value === "true"
                    })}}
                >
                    <option value="true">true</option>
                    <option value="false">false</option>

                </select>
            </label>
            
            <br></br>


            <label>
                Active
                <select 
                    value={ newProduct.isActive }
                    onChange={ (e) => { setNewProduct({
                        ...newProduct,
                        isActive: e.target.value === "true"
                    })}}
                >
                    <option value="true">true</option>
                    <option value="false">false</option>

                </select>
            </label>
            
            <br></br>
            <label>
                In Stock
                <select 
                    value={ newProduct.inStock }
                    onChange={ (e) => { setNewProduct({
                        ...newProduct,
                        inStock: e.target.value === "true"
                    })}}
                >
                    <option value="true">true</option>
                    <option value="false">false</option>

                </select>
            </label>
            <br></br>
            
            { submitButton() }
            {   
                productComponents
            }          
             </div>

    )
}