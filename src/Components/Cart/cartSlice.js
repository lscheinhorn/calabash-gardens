import { createSlice } from '@reduxjs/toolkit'
import { eventsInventory } from '../../resources/inventory';


export const cartSlice = createSlice({
    name: 'cart',
    initialState: [],
    reducers: {
        addCartItem: (state, action) => {
            console.log("addCartItem state", state)
            console.log("addCartItem action.payload", action.payload)

            function removeDietarySuffix(str) {
                // Regular expression to match "Vegetarian", "Gluten Free", or "Vegetarian Gluten Free" at the end of a string
                const regex = /( Vegetarian Gluten Free| Gluten Free| Vegetarian)\s*$/;
                
                // Replace the matched pattern with an empty string
                return str.replace(regex, '');
            }

            const title = removeDietarySuffix(action.payload.title)


            const key = action.payload.key
            const findItem = (key) => {
                return state.find( item => {
                    console.log("find key", item.key === key)
                    return item.key === key
                })
            }
            const itemInCart = findItem(key)
            if ( itemInCart && action.payload.priceOptions.length === 1 ) {
                
            //     const filtered = state.filter( item => item.key !== key)
            //     return [
            //         ...filtered,
            //         {
            //             ...itemInCart,
            //             quantity: itemInCart.category === "Experience" && itemInCart.quantity === 30 ? itemInCart.quantity : itemInCart.quantity + 1
            //         }
            //     ]  
                return state.map((item,el) => {
                    let newItem = {...item}
                    if (item.key === action.payload.key && !( action.payload.category === "Experience" && action.payload.quantity === eventsInventory[title].stock )) {
                        newItem.quantity++
                    }
                    return newItem
                })

            } else {

                return [
                    ...state,
                    {
                        ...action.payload,
                        quantity: action.payload.quantity ? action.payload.quantity : 1
                    }
                ]  
            }
        },
        decrementCartItem: (state, action) => {

            if( action.payload.quantity > 1 ) {
               
                // THIS WORKS
                // MODIFY ORIGINAL
                // state.forEach((item,el) => {
                //     if (item.key === action.payload.key) {
                //         console.log({item, el})
                //         item.quantity--
                //     }
                // })

                return state.map((item,el) => {
                    let newItem = {...item}
                    if (item.key === action.payload.key) {
                        // console.log({item, el})
                        newItem.quantity--
                    }
                    return newItem
                })

                
            } else {
                return state.filter( item => item.key !== action.payload.key)
            }
            
        },
        removeCartItem: (state, action) => {
            
            return state.filter( item => item.key !== action.payload.key)
            
            
        }
    }
})


export const selectCart = state => state.cart 

export const { addCartItem, decrementCartItem, removeCartItem } = cartSlice.actions
export default cartSlice.reducer