import { createSlice } from '@reduxjs/toolkit'


export const cartSlice = createSlice({
    name: 'cart',
    initialState: [],
    reducers: {
        addCartItem: (state, action) => {
            const key = action.payload.key
            const findItem = (key) => {
                return state.find( item => {
                    return item.key === key
                })
            }
            const itemInCart = findItem(key)
            if ( itemInCart ) {
                
            //     const filtered = state.filter( item => item.key !== key)
            //     return [
            //         ...filtered,
            //         {
            //             ...itemInCart,
            //             quantity: itemInCart.quantity + 1
            //         }
            //     ]  
                return state.map((item,el) => {
                    let newItem = {...item}
                    if (item.key === action.payload.key) {
                        newItem.quantity++
                    }
                    return newItem
                })

            } else {

                return [
                    ...state,
                    {
                        ...action.payload,
                        quantity: 1
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